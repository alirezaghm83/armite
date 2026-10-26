#!/usr/bin/env python3
"""Check selected publisher artifacts without downloading complete binaries.

HTTP reachability is not signature verification or a compatibility test. A failed
request may be local blocking, rather than a broken link. The report is explicit.
"""
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]

def check(pair):
    app, download=pair
    result={'appId':app['id'],'url':download['url'],'checkedAt':datetime.now(timezone.utc).isoformat(timespec='seconds')}
    try:
        req=urllib.request.Request(download['url'],headers={'User-Agent':'Armite-link-check/1.0','Range':'bytes=0-511'})
        with urllib.request.urlopen(req,timeout=30) as response:
            chunk=response.read(512)
            result.update(status=response.status,contentType=response.headers.get('Content-Type',''))
            fmt=download['format']
            magic={'exe':b'MZ','msi':bytes.fromhex('d0cf11e0a1b11ae1'),'zip':b'PK','msix':b'PK','msixbundle':b'PK','appx':b'PK','appxbundle':b'PK','7z':bytes.fromhex('377abcaf271c')}[fmt]
            result['ok']=chunk.startswith(magic)
            result['fileHeaderMatches']=result['ok']
            if not result['ok']:result['error']='Response does not have the expected file signature; it may be an HTML error or blocked locally.'
    except Exception as exc:
        result.update(ok=False,error=str(exc))
    return result

def main():
    catalog=json.loads((ROOT/'docs/data/catalog.json').read_text())
    pairs=[(a,d) for a in catalog['apps'] for d in a['downloads']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(check,pairs))
    report={'checkedAt':datetime.now(timezone.utc).isoformat(timespec='seconds'),'method':'GET with Range bytes=0-511; read at most 512 response bytes, check container magic; not CPU architecture or signature verification','results':results}
    (ROOT/'data/link-check-report.json').write_text(json.dumps(report,indent=2)+'\n')
    for r in results:
        print(r['appId'], 'OK' if r['ok'] else r.get('error','failed'))
    failed=sum(not r['ok'] for r in results)
    print(f'{len(results)-failed}/{len(results)} artifact headers matched; {failed} need review')
    raise SystemExit(bool(failed))

if __name__=='__main__':main()
