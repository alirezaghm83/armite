/** Small, consistent UI glyphs. Application artwork lives in assets/apps/. */
const paths = {
  globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z','M3 12h18','M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z'],
  messages: ['M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z','M8 10h8','M8 14h5'],
  play: ['M9 6v12l10-6-10-6Z'],
  palette: ['M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3-5-6-9-6Z','M7 9h.01M11 6h.01M16 7h.01M6 14h.01'],
  file: ['M14 3H6v18h12V7l-4-4Z','M14 3v5h4','M9 12h6M9 16h6'],
  archive: ['M4 7h16v14H4V7Z','M3 3h18v4H3V3Z','M10 11h4'],
  lock: ['M5 10h14v11H5V10Z','M8 10V7a4 4 0 0 1 8 0v3','M12 14v3'],
  network: ['M8 3h8v5H8V3Z','M3 16h6v5H3v-5ZM15 16h6v5h-6v-5Z','M12 8v4M6 16v-4h12v4'],
  wrench: ['m14 7 3 3 4-4a7 7 0 0 1-9 9l-7 7-3-3 7-7a7 7 0 0 1 9-9l-4 4Z'],
  code: ['m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18'],
  braces: ['M8 3H6v7l-3 2 3 2v7h2M16 3h2v7l3 2-3 2v7h-2'],
  sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5'],
  terminal: ['M3 4h18v16H3V4Z','m7 8 4 4-4 4M13 16h4'],
  server: ['M4 3h16v7H4V3ZM4 14h16v7H4v-7Z','M8 6.5h.01M8 17.5h.01M12 6.5h5M12 17.5h5'],
  copy: ['M8 8h13v13H8V8Z','M16 8V3H3v13h5'],
  share: ['M14 3h7v7','M21 3 10 14','M10 4H3v17h17v-7'],
  download: ['M12 3v12m-5-5 5 5 5-5','M4 16v5h16v-5'],
  arrow: ['M4 12h16m-6-6 6 6-6 6'],
  plus: ['M12 5v14M5 12h14'],
  close: ['m6 6 12 12M6 18 18 6'],
  check: ['m5 12 4 4L19 6'],
  info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z','M12 11v6M12 7h.01'],
  box: ['m3 7 9-4 9 4v10l-9 4-9-4V7Z','m3 7 9 4 9-4M12 11v10'],
};
export function uiIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'})) svg.setAttribute(key,value);
  for (const d of paths[name] || paths.box) {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',d);svg.append(path);
  }
  return svg;
}
