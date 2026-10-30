#!/usr/bin/env python3
"""Import pinned app-identification artwork; no runtime third-party requests."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/assets/apps'
DASH_SHA='83f32e08257b66fbd971ac8d7645f5b38d52e85d'
PAPIRUS_SHA='bf539287ef5dc18529424a02cccee76175920a6f'
DASH={'chrome':'chrome','firefox':'firefox','edge':'microsoft-edge','brave':'brave','vivaldi':'vivaldi','opera':'opera','zoom':'zoom','discord':'discord','teams':'microsoft-teams','slack':'slack','telegram':'telegram','thunderbird':'thunderbird','spotify':'spotify','handbrake':'handbrake','audacity':'audacity','blender':'blender','gimp':'gimp','libreoffice':'libreoffice','7zip':'7zip','bitwarden':'bitwarden','1password':'1password','dropbox':'dropbox','googledrive':'google-drive','onedrive':'microsoft-onedrive','tailscale':'tailscale','wireguard':'wireguard','rustdesk':'rustdesk','putty':'putty','windirstat':'windirstat','python':'python','git':'git','docker':'docker','nodejs':'nodejs-alt','vscode':'visual-studio-code','dotnet8':'dotnet','dotnet9':'dotnet','dotnet10':'dotnet','java':'java','powershell':'powershell','terminal':'terminal','go':'golang','keepassxc':'keepassxc','rclone':'rclone','syncthing':'syncthing','mullvad':'mullvad-vpn','netbird':'netbird'}
PAPIRUS={'vlc':'vlc','obs':'obs','krita':'krita','inkscape':'inkscape','peazip':'peazip','teamviewer':'teamviewer','sublime':'sublime-text','cursor':'cursor','localsend':'localsend'}
VENDOR={
 'wireshark':['https://www.wireshark.org/favicon.ico'],
 'foobar2000':['https://www.foobar2000.org/favicon.ico'],
 'sumatrapdf':['https://www.sumatrapdfreader.org/favicon.ico'],
 'winrar':['https://www.rarlab.com/favicon.ico'],
 'winscp':['https://winscp.net/favicon.ico'],
 'powertoys':['https://raw.githubusercontent.com/microsoft/PowerToys/main/doc/images/icons/PowerToys%20icon/PNG/PowerToysAppList.targetsize-64.png'],
 'everything':['https://www.voidtools.com/favicon.ico'],
 'notepadpp':['https://notepad-plus-plus.org/favicon.ico'],
 'winmerge':['https://winmerge.org/favicon.ico'],
 'uv':['https://docs.astral.sh/uv/assets/favicon.ico'],
 '7zipnanazip':['https://raw.githubusercontent.com/M2Team/NanaZip/main/Assets/NanaZip.png'],
 'hiddify':['https://raw.githubusercontent.com/hiddify/hiddify-app/main/assets/images/logo.svg'],
 'vcredist':['https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg']
}

def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Armite-artwork-import/1.0'})
 with urllib.request.urlopen(req,timeout=25) as r:return r.read()

def import_one(app):
 id=app['id']
 if id in DASH:
  urls=[f'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/{DASH_SHA}/svg/{DASH[id]}.svg'];group='Dashboard Icons'
 elif id in PAPIRUS:
  urls=[f'https://raw.githubusercontent.com/PapirusDevelopmentTeam/papirus-icon-theme/{PAPIRUS_SHA}/Papirus/64x64/apps/{PAPIRUS[id]}.svg'];group='Papirus'
 else:urls=VENDOR[id];group='Publisher / project artwork'
 errors=[]
 for url in urls:
  try:
   data=get(url)
   # Papirus aliases are symlinks represented as small relative path blobs on raw GitHub.
   if group=='Papirus' and not data.lstrip().startswith((b'<',b'<?')):
    target=data.decode().strip()
    if not re.fullmatch(r'[a-zA-Z0-9_.-]+\.svg',target):raise ValueError('Unsupported icon alias')
    url=url.rsplit('/',1)[0]+'/'+target;data=get(url)
   if b'<svg' in data[:1000]:
    ext='svg'
    if re.search(rb'<script\b|\bon[a-z]+\s*=',data,re.I):raise ValueError('Active SVG content is not allowed')
   elif data.startswith(b'\x89PNG'):ext='png'
   elif data.startswith(b'\x00\x00\x01\x00'):ext='ico'
   else:raise ValueError('Response is not an SVG, PNG or ICO')
   filename=f'{id}.{ext}'
   (OUT/filename).write_bytes(data)
   return id,{'file':filename,'source':url,'collection':group,'sha256':hashlib.sha256(data).hexdigest()}
  except Exception as exc:errors.append(str(exc))
 raise ValueError(id+': '+'; '.join(errors))

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 apps=json.loads((ROOT/'docs/data/catalog.json').read_text())['apps']
 existing=json.loads((OUT/'sources.json').read_text()) if (OUT/'sources.json').exists() else {}
 missing=[a for a in apps if a['id'] not in existing]
 errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  jobs={pool.submit(import_one,a):a for a in missing}
  for job in concurrent.futures.as_completed(jobs):
   try:
    id,record=job.result();existing[id]=record;print(id,record['file'],flush=True)
   except Exception as exc:errors.append(str(exc));print('ERROR',exc,flush=True)
 (OUT/'sources.json').write_text(json.dumps(existing,indent=2)+'\n')
 (ROOT/'docs/icons.js').write_text('// Self-hosted artwork; provenance: assets/apps/sources.json\nexport const appIcons = '+json.dumps({a['id']:existing[a['id']]['file'] for a in apps if a['id'] in existing},indent=2)+';\n')
 print(f'{len(existing)}/{len(apps)} icons imported; {len(errors)} errors',flush=True)
 if errors:raise SystemExit(1)

if __name__=='__main__':main()
