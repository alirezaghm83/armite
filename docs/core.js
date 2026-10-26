/** Pure selection/export functions. No download URLs ever come from the URL hash. */
export function artifact(app, index = 0) {
  const item = app?.downloads?.[index];
  if (!item || item.architecture !== 'arm64' || typeof item.url !== 'string' || /[\r\n]/.test(item.url)) return null;
  try { return new URL(item.url).protocol === 'https:' ? item : null; } catch { return null; }
}
export function selectedApps(apps, selection) {
  return apps.filter(app => selection.has(app.id) && artifact(app, selection.get(app.id)));
}
export function encodeSelection(selection) {
  return 'apps=' + [...selection].sort(([a], [b]) => a.localeCompare(b)).map(([id, i]) => encodeURIComponent(id) + (i ? '~' + i : '')).join(',');
}
export function decodeSelection(hash, apps) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const selection = new Map();
  const byId = new Map(apps.map(a => [a.id, a]));
  for (const token of (params.get('apps') || '').split(',')) {
    const [id, rawIndex] = token.split('~');
    const index = rawIndex === undefined ? 0 : Number(rawIndex);
    if (Number.isInteger(index) && index >= 0 && artifact(byId.get(id), index)) selection.set(id, index);
  }
  return selection;
}
export function downloadLinks(apps, selection) {
  return [...new Set(selectedApps(apps, selection).map(a => artifact(a, selection.get(a.id)).url))].join('\n');
}
export function aria2Input(apps, selection) {
  return selectedApps(apps, selection).map(app => {
    const file = artifact(app, selection.get(app.id));
    const sha = /^[a-f\d]{64}$/i.test(file.sha256 || '') ? '\n  checksum=sha-256=' + file.sha256 : '';
    // No out= override: a publisher's Content-Disposition may carry the filename.
    return '# ' + app.name.replace(/[\r\n]/g, ' ') + ' — Windows ARM64\n' + file.url + sha;
  }).join('\n\n');
}
export function matches(app, {search = '', category = 'All apps', onlySelected = false, showUnavailable = false, selection = new Map()} = {}) {
  const native = !!artifact(app);
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [app.name, app.description, app.category, app.packageId].join(' ').toLowerCase();
  return (showUnavailable || native) && (category === 'All apps' || app.category === category) && (!onlySelected || selection.has(app.id)) && words.every(w => haystack.includes(w));
}
