#!/usr/bin/env python3
"""Resolve explicit Windows ARM64 installers from Microsoft's WinGet manifests.

Does not guess download filenames or accept x64 fallback installers. Inspect the
resulting diff before committing. Network failures preserve prior records.
"""
import argparse
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import time
import urllib.request
from urllib.parse import urlparse
import yaml

ROOT = Path(__file__).resolve().parents[1]
RAW = 'https://raw.githubusercontent.com/microsoft/winget-pkgs/'
TREE = 'https://github.com/microsoft/winget-pkgs/tree/master/'


def get(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Armite-catalog/1.0'})
            with urllib.request.urlopen(req, timeout=45) as response:
                return response.read().decode('utf-8-sig')
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def tree_payload(html):
    for text in re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html, re.S):
        try:
            payload = json.loads(text)['payload']['codeViewTreeRoute']
            return payload['tree']['items'], payload['refInfo']['currentOid']
        except (KeyError, ValueError):
            continue
    raise ValueError('No GitHub directory data found; upstream markup may have changed')


def version_key(value):
    return tuple((0, int(x)) if x.isdigit() else (1, x.lower()) for x in re.findall(r'\d+|[^\d.]+', value))


def conflicting_architecture(url):
    return bool(re.search(r'(?:^|[-_/])(?:x64|x86_64|amd64|x86)(?:[-_./]|$)', urlparse(url).path, re.I))


def publisher_record(source, version, evidence, downloads, note=''):
    app_id, name, category, package, homepage, description, color, ninite = source
    return {'id':app_id,'name':name,'category':category,'packageId':package,
            'page':homepage,'description':description,'color':color,'ninite':ninite,
            'version':version,'status':'native' if downloads else 'not-indexed',
            'checkedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'source':evidence,'sourceType':'publisher','note':note,'downloads':downloads}


def github_release(source, repository):
    release=json.loads(get(f'https://api.github.com/repos/{repository}/releases/latest'))
    downloads=[]
    for asset in release['assets']:
        name=asset['name']
        if not re.search(r'(arm64|aarch64).*\.(exe|msi|zip)$',name,re.I):
            continue
        # Never accept non-Windows ARM releases, debug symbols, or source archives.
        if re.search(r'linux|macos|darwin|android|debug|symbols|source',name,re.I):
            continue
        fmt=name.rsplit('.',1)[-1].lower()
        digest=asset.get('digest') or ''
        downloads.append({'url':asset['browser_download_url'],'format':fmt,
                          'label':fmt.upper(),'scope':'','architecture':'arm64',
                          'sha256':digest.removeprefix('sha256:') if digest.startswith('sha256:') else ''})
    downloads.sort(key=lambda d:(d['format']!='exe',d['format']!='msi'))
    return publisher_record(source,release['tag_name'].lstrip('v'),release['html_url'],downloads)


def publisher(source):
    app_id=source[0]
    if app_id in ('rustdesk','hiddify'):
        return github_release(source,{'rustdesk':'rustdesk/rustdesk','hiddify':'hiddify/hiddify-app'}[app_id])
    if app_id=='wireshark':
        page=get(source[4])
        # The first concrete stable ARM64 Windows link on the publisher page.
        match=re.search(r'https://[^\s"<>]+/Wireshark-(\d+\.\d+\.\d+)-arm64\.exe',page)
        if not match:
            raise ValueError('Stable Windows ARM64 link missing from Wireshark page')
        return publisher_record(source,match[1],source[4],[{'url':match[0],'format':'exe','label':'EXE','scope':'machine','architecture':'arm64','sha256':''}],
                                'Live packet capture also requires a compatible Npcap installation.')
    if app_id=='gimp':
        page=get(source[4])
        # Publisher explicitly describes the Windows installer as x86_64 + ARM64.
        if not re.search(r'for x86_64 and ARM64',page):
            raise ValueError('Publisher ARM64 Windows support statement not found')
        metadata=json.loads(get('https://www.gimp.org/gimp_versions.json'))['STABLE'][0]
        windows=metadata['windows'][0]
        match=re.search(r'(?:https:)?//download\.gimp\.org/[^\s"<>]+/'+re.escape(windows['filename']),page)
        if not match:
            raise ValueError('Windows installer URL missing from GIMP download page')
        url=match[0] if match[0].startswith('https:') else 'https:'+match[0]
        return publisher_record(source,metadata['version'],source[4],[{'url':url,'format':'exe','label':'EXE · universal','scope':'','architecture':'arm64','sha256':windows.get('sha256',''),'buildType':'universal'}],
                                'One publisher installer includes both x86_64 and ARM64 builds.')
    return None


def resolve(source):
    official=publisher(source)
    if official:
        return official
    app_id, name, category, package, homepage, description, color, ninite = source
    path = 'manifests/' + package[0].lower() + '/' + package.replace('.', '/')
    entries, commit = tree_payload(get(TREE + path))
    versions = sorted([x['name'] for x in entries if x['contentType'] == 'directory' and re.match(r'^\d', x['name'])], key=version_key, reverse=True)
    if not versions:
        raise ValueError('No stable version directory found')
    version = versions[0]
    manifest_path = f'{path}/{version}/{package}.installer.yaml'
    manifest = yaml.safe_load(get(RAW + commit + '/' + manifest_path))
    downloads = []
    seen = set()
    notes = []
    for installer in manifest.get('Installers', []):
        arch = installer.get('Architecture', manifest.get('Architecture'))
        # Neutral bundles can contain x86 or x64 code. Deliberately require arm64.
        if arch != 'arm64':
            continue
        url = installer.get('InstallerUrl')
        if not url or not url.startswith('https://') or url in seen:
            continue
        if conflicting_architecture(url):
            notes.append('An ARM64-tagged manifest entry has a conflicting x64/x86 filename. Its download is withheld pending publisher confirmation.')
            continue
        locale = installer.get('InstallerLocale', manifest.get('InstallerLocale', ''))
        # Avoid hundreds of localized Firefox/Thunderbird installers.
        if locale and locale.lower() not in ('en-us', 'en', 'en-gb'):
            continue
        seen.add(url)
        ext = re.search(r'\.(exe|msi|zip|msixbundle|msix|appxbundle|appx|7z)(?:[?#]|$)', url, re.I)
        installer_type = installer.get('InstallerType', manifest.get('InstallerType', ''))
        file_type = ext.group(1).lower() if ext else {'wix':'msi','nullsoft':'exe','inno':'exe','burn':'exe','portable':'exe'}.get(installer_type, installer_type or 'installer')
        scope = installer.get('Scope', manifest.get('Scope', ''))
        portable = installer_type == 'portable' or 'portable' in url.lower()
        label = file_type.upper() + (' · portable' if portable else '') + (f' · {scope}' if scope else '') + (f' · {locale}' if locale else '')
        shared = any(i.get('Architecture') not in ('arm64',None) and i.get('InstallerUrl')==url for i in manifest.get('Installers',[]))
        build_type = 'arm64ec' if 'arm64ec' in url.lower() else 'universal' if shared else 'arm64'
        downloads.append({'url': url, 'format': file_type, 'label': label, 'scope': scope, 'sha256': installer.get('InstallerSha256', ''), 'architecture':'arm64','buildType':build_type})
    # Prefer a normal installer over a ZIP, then per-user over system scope.
    downloads.sort(key=lambda d: (d['format'] not in ('exe','msi'), d['scope'] == 'machine', d['format'] != 'exe', 'en-GB' in d['label']))
    if app_id=='vscode' and downloads:
        filename_version=re.search(r'VSCode(?:User)?Setup-arm64-(\d+\.\d+\.\d+)\.exe',downloads[0]['url'])
        if filename_version and filename_version[1]!=version:
            notes.append(f'WinGet lists package version {version}, but its ARM64 installer filenames identify {filename_version[1]}. The displayed version follows the linked artifacts.')
            version=filename_version[1]
    return {'id':app_id, 'name':name, 'category':category, 'packageId':package,
            'page':homepage, 'description':description, 'color':color, 'ninite':ninite,
            'version':version, 'status':'native' if downloads else 'not-indexed',
            'checkedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'source':f'https://github.com/microsoft/winget-pkgs/blob/{commit}/{manifest_path}',
            'sourceType':'winget','note':' '.join(dict.fromkeys(notes)), 'downloads':downloads}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--only', help='Comma-separated app IDs to refresh')
    args=parser.parse_args()
    sources=json.loads((ROOT/'data/sources.json').read_text())
    target=ROOT/'docs/data/catalog.json'
    old=json.loads(target.read_text()) if target.exists() else {'apps':[]}
    records={x['id']:x for x in old['apps']}
    if args.only:
        ids=set(args.only.split(',')); sources=[s for s in sources if s[0] in ids]
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        jobs={pool.submit(resolve,s):s for s in sources}
        for job in concurrent.futures.as_completed(jobs):
            s=jobs[job]
            try:
                app=job.result(); records[s[0]]=app
                print(f"{app['name']}: {app['version']} · {len(app['downloads'])} ARM64 artifacts",flush=True)
            except Exception as exc:
                errors.append({'id':s[0], 'error':str(exc)})
                if s[0] not in records:
                    records[s[0]]={'id':s[0],'name':s[1],'category':s[2],'packageId':s[3],'page':s[4],'description':s[5],'color':s[6],'ninite':s[7],'status':'unverified','downloads':[]}
                print(f'{s[1]}: could not refresh ({exc})',flush=True)
    all_sources=json.loads((ROOT/'data/sources.json').read_text())
    data={'schemaVersion':1,'updatedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),
          'reference':'https://ninite.com/', 'apps':[records[s[0]] for s in all_sources if s[0] in records]}
    target.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    (ROOT/'data/refresh-report.json').write_text(json.dumps({'errors':errors},indent=2)+'\n')
    print(f"Saved {len(data['apps'])} apps; {sum(bool(a['downloads']) for a in data['apps'])} with ARM64 downloads; {len(errors)} refresh errors")

if __name__ == '__main__':
    main()
