import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {artifact, selectedApps, encodeSelection, decodeSelection, downloadLinks, aria2Input, matches} from '../docs/core.js';
const hash='a'.repeat(64);
const apps=[{id:'editor',name:'Code Editor',category:'Developer tools',description:'Edit code',packageId:'Vendor.Editor',downloads:[{url:'https://example.com/editor.exe',format:'exe',architecture:'arm64',sha256:hash},{url:'https://example.com/editor.zip',format:'zip',architecture:'arm64'}]}, {id:'browser',name:'Browser',category:'Web browsers',downloads:[{url:'https://example.com/browser.msi',format:'msi',architecture:'arm64'}]}, {id:'missing',name:'Missing',category:'Utilities',downloads:[]}];

test('selection URLs round-trip apps and non-default formats',()=>{
 const selected=new Map([['editor',1],['browser',0]]);
 assert.deepEqual([...decodeSelection('#'+encodeSelection(selected),apps)],[['browser',0],['editor',1]]);
});
test('malformed, unknown, and unavailable apps cannot inject download URLs',()=>{
 const selected=decodeSelection('#apps=editor~999,browser~-1,missing,unknown,javascript%3Aalert(1)',apps);
 assert.equal(selected.size,0);
 assert.equal(decodeSelection('#apps=editor~NaN,editor~0.5',apps).size,0);
});
test('only HTTPS ARM64 artifacts may be downloaded',()=>{
 assert.equal(artifact({downloads:[{url:'javascript:alert(1)',architecture:'arm64'}]}),null);
 assert.equal(artifact({downloads:[{url:'https://example.com/x64.exe',architecture:'x64'}]}),null);
 assert.equal(artifact(null),null);
});
test('export respects selected variants, has one URL per app, and ignores missing apps',()=>{
 const selected=new Map([['editor',1],['browser',0],['missing',0]]);
 assert.equal(downloadLinks(apps,selected),'https://example.com/editor.zip\nhttps://example.com/browser.msi');
 assert.equal(selectedApps(apps,selected).length,2);
});
test('identical publisher URLs are deduplicated in the link list',()=>{
 const clone={...apps[0],id:'clone'};
 assert.equal(downloadLinks([apps[0],clone],new Map([['editor',0],['clone',0]])).split('\n').length,1);
});
test('aria2 includes valid published checksums without inventing missing ones',()=>{
 assert.match(aria2Input(apps,new Map([['editor',0]])),new RegExp('checksum=sha-256='+hash));
 assert.doesNotMatch(aria2Input(apps,new Map([['editor',1]])),/checksum=/);
 assert.doesNotMatch(aria2Input([{...apps[0],downloads:[{...apps[0].downloads[0],sha256:'bad\nheader'}]}],new Map([['editor',0]])),/checksum=/);
});
test('search matches multiple words without losing category and selected filters',()=>{
 assert.equal(matches(apps[0],{search:'CODE editor',category:'Developer tools'}),true);
 assert.equal(matches(apps[0],{search:'editor',category:'Media'}),false);
 assert.equal(matches(apps[0],{onlySelected:true,selection:new Map()}),false);
 assert.equal(matches(apps[0],{onlySelected:true,selection:new Map([['editor',0]])}),true);
 assert.equal(matches(apps[2]),false);
 assert.equal(matches(apps[2],{showUnavailable:true}),true);
});
test('published catalog has unique IDs, source evidence, HTTPS Windows artifacts, and valid checksums',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../docs/data/catalog.json',import.meta.url)));
 assert.equal(catalog.schemaVersion,1);assert.ok(catalog.apps.length>=50);
 assert.equal(new Set(catalog.apps.map(a=>a.id)).size,catalog.apps.length);
 for(const app of catalog.apps){
  assert.match(app.id,/^[a-z0-9-]+$/);assert.match(app.page,/^https:\/\//);
  for(const download of app.downloads){
   assert.ok(artifact({downloads:[download]}),app.id);assert.match(app.source,/^https:\/\//);
   assert.ok(['exe','msi','zip','msix','msixbundle','appx','appxbundle','7z'].includes(download.format),app.id);
   assert.doesNotMatch(download.url,/\.(deb|rpm|dmg|apk|AppImage)(?:[?#]|$)/i,app.id);
   assert.doesNotMatch(new URL(download.url).pathname,/(?:^|[-_\/])(?:x64|x86_64|amd64|x86)(?:[-_.\/]|$)/i,app.id+' conflicting architecture filename');
   if(download.sha256)assert.match(download.sha256,/^[a-f\d]{64}$/i,app.id);
  }
 }
});
