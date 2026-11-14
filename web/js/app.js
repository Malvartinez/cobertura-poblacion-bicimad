(function () {
  'use strict';
  var COL = { v: '#2fa35a', a: '#f0b90b', r: '#e0443a' };
  var RAMP = ['#c0392b', '#e07b39', '#e8c547', '#8cc152', '#2fa35a'];
  var SHADE = {
    0: ['#c7e9c0', '#a1d99b', '#74c476', '#31a354', '#006d2c'],
    1: ['#fff3b0', '#ffe066', '#f5c400', '#d19a00', '#9c6b00'],
    2: ['#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15']
  };
  var STYLES = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  };
  var LEVELS = ['secciones', 'barrios', 'distritos'];
  var NAMES = { v: 'Menos de 250 m', a: '250–500 m', r: 'Más de 500 m' };
  var nf = new Intl.NumberFormat('es-ES');
  var fmt = function (x) { return x == null || isNaN(x) ? '—' : nf.format(Math.round(x)); };
  var pc = function (x) { return x == null || isNaN(x) ? '—' : x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ESC[c]; }); };
  var getJSON = function (f) { return fetch('data/' + f).then(function (r) { if (!r.ok) throw new Error(f); return r.json(); }); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var S = {
    ind: '', level: 'secciones', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    rl: 'distritos', order: 'best', sort: 'v', q: '', tab: 'rank', tsort: { k: 'nombre', d: 1 }
  };
  var meta = {}, agg = null, geo = {}, hasPM = false, map, popup;
  var val = function (p, k) { var x = p[S.ind + k]; return x == null ? null : Number(x); };

  // ---------- tema ----------
  function applyTheme() {
    document.documentElement.dataset.theme = S.theme;
    $('#theme').textContent = S.theme === 'dark' ? '☀' : '☾';
  }
  $('#theme').onclick = function () {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    store.set('bicimad_tema', S.theme); applyTheme();
    if (map) map.setStyle(STYLES[S.theme], { diff: false });
    renderLegend();
  };
  applyTheme();

  // ---------- onboarding ----------
  var step = 0;
  function steps() {
    var gen = meta.generado ? new Date(meta.generado).toLocaleDateString('es-ES') : '—';
    return [
      '<h2>Qué muestra este mapa</h2><p>Cuánta población de Madrid vive cerca de una base de BiciMAD, midiendo <b>andando por la red peatonal real</b> hasta la base más cercana.</p><ul class="lv"><li><i style="background:' + COL.v + '"></i><b>Verde</b>: a menos de 250 m</li><li><i style="background:' + COL.a + '"></i><b>Amarillo</b>: de 250 a 500 m</li><li><i style="background:' + COL.r + '"></i><b>Rojo</b>: a más de 500 m</li></ul>',
      '<h2>Método</h2><p>La población del padrón/censo por sección se reparte entre los edificios residenciales del Catastro según su número de viviendas.</p><p>La distancia se calcula por la red peatonal de OpenStreetMap con un Dijkstra multiorigen desde todas las bases.</p><p class="muted">Datos generados el ' + esc(gen) + '.</p>',
      '<h2>Cómo usarlo</h2><ul><li>Elige el <b>indicador</b> (total, 15–64 o 65+ años) y la <b>agregación</b> en la barra superior.</li><li>El <b>ranking</b> ordena distritos y barrios; pasa el ratón para resaltarlos y púlsalos para acercarte.</li><li>Acerca el mapa y <b>pulsa un edificio</b> para ver su población y su distancia a la base.</li></ul>',
      '<h2>Fuentes</h2><ul class="src">' + (meta.fuentes || []).map(function (f) {
        return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nombre) + '</a>' + (f.referencia ? ' · ref. ' + esc(f.referencia) : '') + (f.fecha_descarga ? ' · descargado ' + esc(f.fecha_descarga) : '') + '</li>';
      }).join('') + '</ul>'
    ];
  }
  function renderOb() {
    var s = steps();
    $('#ob-body').innerHTML = s[step];
    $('#ob-dots').innerHTML = s.map(function (_, i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('');
    $('#ob-next').textContent = step === s.length - 1 ? 'Empezar' : 'Siguiente';
  }
  function openOb() { step = 0; renderOb(); $('#modal').hidden = false; }
  function closeOb() { $('#modal').hidden = true; store.set('bicimad_visto', '1'); }
  $('#ob-next').onclick = function () { if (step >= steps().length - 1) closeOb(); else { step++; renderOb(); } };
  $('#ob-skip').onclick = function (e) { e.preventDefault(); closeOb(); };
  $('#modal').addEventListener('click', function (e) { if (e.target === this) closeOb(); });
  $('#about').onclick = function (e) { e.preventDefault(); openOb(); };
  $('#help').onclick = openOb;

  // ---------- leyenda ----------
  function renderLegend() {
    var c = meta.cortes_poblacion_edificio, bk = '';
    if (c && c.length >= 4) bk = '<div class="bk"><span>≤' + fmt(c[0]) + '</span><span>' + fmt(c[1]) + '</span><span>' + fmt(c[2]) + '</span><span>&gt;' + fmt(c[3]) + ' hab.</span></div>';
    var rows = [0, 1, 2].map(function (n) {
      return '<div class="brow"><b>' + ['&lt; 250 m', '250–500', '&gt; 500 m'][n] + '</b><div class="sw">' + SHADE[n].map(function (x) { return '<i style="background:' + x + '"></i>'; }).join('') + '</div></div>';
    }).join('');
    $('#legend').innerHTML = '<h4>% población a &lt; 250 m (' + (S.level) + ')</h4><div class="ramp">' +
      RAMP.map(function (x) { return '<span style="background:' + x + '"></span>'; }).join('') + '</div><div class="rl"><span>0 %</span><span>100 %</span></div>' +
      '<h4>Edificios (zoom 14+)</h4>' + rows + '<div class="rl" style="margin-left:52px;font-size:9px"><span>menos → más población por edificio</span></div>' + bk +
      '<div class="st"><i></i>Base de BiciMAD</div>';
  }

  // ---------- mapa ----------
  function colorExpr(prefix) {
    var f = prefix + 'pct_v';
    return ['case', ['has', f], ['step', ['to-number', ['get', f], 0], RAMP[0], 20, RAMP[1], 40, RAMP[2], 60, RAMP[3], 80, RAMP[4]], S.theme === 'dark' ? '#3a3d44' : '#d5d8de'];
  }
  function bColor() {
    var k = ['coalesce', ['get', 'k'], 0];
    var m = function (n) { return ['match', k, 0, SHADE[n][0], 1, SHADE[n][1], 2, SHADE[n][2], 3, SHADE[n][3], SHADE[n][4]]; };
    return ['match', ['get', 'n'], 0, m(0), 1, m(1), m(2)];
  }
  var cssv = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  var hlFilter = function (cod) { return ['==', ['to-string', ['get', 'cod']], String(cod)]; };

  function addAll() {
    var dark = S.theme === 'dark';
    LEVELS.forEach(function (n) {
      if (!geo[n]) return;
      map.addSource(n, { type: 'geojson', data: geo[n] });
      var vis = n === S.level ? 'visible' : 'none';
      map.addLayer({ id: 'fill-' + n, type: 'fill', source: n, layout: { visibility: vis },
        paint: { 'fill-color': colorExpr(S.ind), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 13, 0.72, 15, 0.12] } });
      map.addLayer({ id: 'line-' + n, type: 'line', source: n, layout: { visibility: vis },
        paint: { 'line-color': dark ? '#ffffff' : '#222222', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.25, 15, 0.12], 'line-width': n === 'secciones' ? 0.3 : 0.8 } });
    });
    if (hasPM) {
      map.addSource('edificios', { type: 'vector', url: 'pmtiles://' + new URL('data/edificios.pmtiles', location.href).href, minzoom: 12, maxzoom: 16 });
      map.addLayer({ id: 'edif-fill', type: 'fill', source: 'edificios', 'source-layer': 'edificios', minzoom: 13.5,
        paint: { 'fill-color': bColor(), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 0.85, 16, 0.95] } });
      map.addLayer({ id: 'edif-line', type: 'line', source: 'edificios', 'source-layer': 'edificios', minzoom: 16,
        paint: { 'line-color': dark ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.35)', 'line-width': 0.5 } });
    }
    ['distritos', 'barrios'].forEach(function (n) {
      if (!geo[n]) return;
      if (!map.getSource(n)) return;
      map.addLayer({ id: 'hl-' + n, type: 'line', source: n, filter: hlFilter('__none__'),
        paint: { 'line-color': cssv('--accent-hover') || '#5AA8FF', 'line-width': 3 } });
    });
    map.addSource('bases', { type: 'geojson', data: 'data/bases.geojson' });
    map.addLayer({ id: 'bases', type: 'circle', source: 'bases',
      paint: { 'circle-color': cssv('--accent') || '#2D8EFF', 'circle-stroke-color': cssv('--bg-panel') || '#1A1C20', 'circle-stroke-width': 1.5,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 16, 6] } });
  }
  function setLevel(n) {
    S.level = n;
    LEVELS.forEach(function (l) {
      ['fill-', 'line-'].forEach(function (p) { if (map && map.getLayer(p + l)) map.setLayoutProperty(p + l, 'visibility', l === n ? 'visible' : 'none'); });
    });
    $$('#seg-lvl button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === n); });
    renderLegend();
  }
  function setInd(v) {
    S.ind = v;
    $$('#seg-ind button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
    LEVELS.forEach(function (l) { if (map && map.getLayer('fill-' + l)) map.setPaintProperty('fill-' + l, 'fill-color', colorExpr(v)); });
    renderAll();
  }
  $('#seg-ind').onclick = function (e) { if (e.target.dataset.v != null) setInd(e.target.dataset.v); };
  $('#seg-lvl').onclick = function (e) { if (e.target.dataset.v) setLevel(e.target.dataset.v); };

  function popupHtml(p, title, sub) {
    var rows = ['v', 'a', 'r'].map(function (k) {
      return '<tr><td><span style="color:' + COL[k] + '">●</span> ' + NAMES[k] + '</td><td>' + fmt(val(p, 'pob_' + k)) + '</td><td>' + pc(val(p, 'pct_' + k)) + '</td></tr>';
    }).join('');
    return '<div class="pop"><h3>' + esc(title) + '</h3>' + (sub ? '<div class="muted">' + esc(sub) + '</div>' : '') +
      '<div>Población: <b>' + fmt(val(p, 'pob')) + '</b></div>' + stack(p, 0) + '<table>' + rows + '</table></div>';
  }
  function stack(p, lab) {
    return '<div class="sbar">' + ['v', 'a', 'r'].map(function (k) {
      var w = val(p, 'pct_' + k) || 0;
      return '<div class="' + k + '" style="width:' + w + '%">' + (lab && w >= 9 ? Math.round(w) + ' %' : '') + '</div>';
    }).join('') + '</div>';
  }
  function showPopup(ll, html) {
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ maxWidth: '300px' }).setLngLat(ll).setHTML(html).addTo(map);
  }
  function onClick(e) {
    var has = function (id) { return map.getLayer(id); };
    var f = has('bases') && map.queryRenderedFeatures(e.point, { layers: ['bases'] })[0];
    if (f) return showPopup(f.geometry.coordinates, '<div class="pop"><h3>' + esc(f.properties.nombre) + '</h3>Base de BiciMAD</div>');
    f = has('edif-fill') && map.queryRenderedFeatures(e.point, { layers: ['edif-fill'] })[0];
    if (f) {
      var p = f.properties, d = (p.d == null || p.d === 'null' || p.d === '') ? null : Number(p.d), n = Number(p.n);
      var lv = ['Menos de 250 m', '250–500 m', 'Más de 500 m'][n] || '—';
      return showPopup(e.lngLat, '<div class="pop"><h3>Edificio</h3>Población estimada: <b>' + fmt(p.p) + ' hab.</b><br>Distancia andando: <b>' +
        (d == null ? '&gt; 1.500 m' : fmt(d) + ' m') + '</b><br>Base más cercana: <b>' + esc(p.b && p.b !== 'null' ? p.b : '—') + '</b><br>Nivel: <b style="color:' + [COL.v, COL.a, COL.r][n] + '">' + lv + '</b></div>');
    }
    f = has('fill-' + S.level) && map.queryRenderedFeatures(e.point, { layers: ['fill-' + S.level] })[0];
    if (f) {
      var q = f.properties;
      showPopup(e.lngLat, popupHtml(q, q.nombre || ('Sección ' + q.cod), S.level === 'barrios' ? q.distrito : ''));
    }
  }
  function onMove(e) {
    var l = ['bases', 'edif-fill', 'fill-' + S.level].filter(function (i) { return map.getLayer(i); });
    map.getCanvas().style.cursor = l.length && map.queryRenderedFeatures(e.point, { layers: l }).length ? 'pointer' : '';
  }

  function highlight(level, cod) {
    ['distritos', 'barrios'].forEach(function (n) {
      if (map && map.getLayer('hl-' + n)) map.setFilter('hl-' + n, hlFilter(n === level && cod != null ? cod : '__none__'));
    });
  }
  function bbox(f) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    (function walk(c) {
      if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); } else c.forEach(walk);
    })(f.geometry.coordinates);
    return b;
  }
  function zoomTo(level, cod) {
    if (S.level !== level) setLevel(level);
    var f = (geo[level] ? geo[level].features : []).filter(function (x) { return String(x.properties.cod) === String(cod); })[0];
    if (f && map) map.fitBounds(bbox(f), { padding: 40, maxZoom: 15, duration: 600 });
  }

  // ---------- panel ----------
  function cityProps() {
    if (agg && agg.ciudad) return agg.ciudad;
    var t = { pob: 0, pob_v: 0, pob_a: 0, pob_r: 0 };
    ['', 'a_', 'm_'].forEach(function (pr) {
      var s = { pob: 0, pob_v: 0, pob_a: 0, pob_r: 0 };
      ((geo.distritos || {}).features || []).forEach(function (f) { for (var k in s) s[k] += Number(f.properties[pr + k] || 0); });
      for (var k in s) t[pr + k] = s[k];
      t[pr + 'pct_v'] = s.pob ? 100 * s.pob_v / s.pob : 0; t[pr + 'pct_a'] = s.pob ? 100 * s.pob_a / s.pob : 0; t[pr + 'pct_r'] = s.pob ? 100 * s.pob_r / s.pob : 0;
    });
    return t;
  }
  function renderSum() {
    var c = cityProps(), lab = { '': 'Población total', a_: 'Población de 15–64 años', m_: 'Población de 65+ años' }[S.ind];
    if (val(c, 'pob') == null) { $('#sum').innerHTML = '<div class="lb">' + lab + '</div><div class="muted">Datos no disponibles para este indicador.</div>'; return; }
    $('#sum').innerHTML = '<div class="lb">' + lab + ' · Madrid</div><div class="big">' + fmt(val(c, 'pob')) + '</div>' +
      stack(c, 1) + '<div class="kp">' + ['v', 'a', 'r'].map(function (k) {
        return '<div style="border-color:' + COL[k] + '">' + NAMES[k] + '<b>' + pc(val(c, 'pct_' + k)) + '</b>' + fmt(val(c, 'pob_' + k)) + ' hab.</div>';
      }).join('') + '</div>';
  }
  function rows() {
    var feats = (geo[S.rl] ? geo[S.rl].features : []);
    var q = S.q.trim().toLowerCase();
    return feats.map(function (f) { return f.properties; }).filter(function (p) {
      return !q || String(p.nombre).toLowerCase().indexOf(q) >= 0 || String(p.distrito || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  function score(p) {
    var k = S.sort === 'v' ? val(p, 'pct_v') : S.sort === 'r' ? -val(p, 'pct_r') : -val(p, 'pob_r');
    return k == null || isNaN(k) ? -Infinity : k;
  }
  function renderRank() {
    var c = cityProps(), avg = val(c, 'pct_v');
    var rs = rows().filter(function (p) { return val(p, 'pob') != null; });
    rs.sort(function (a, b) { return S.order === 'best' ? score(b) - score(a) : score(a) - score(b); });
    if (!rs.length) { $('#rank').innerHTML = '<div class="empty">Sin datos para este indicador.</div>'; return; }
    $('#rank').innerHTML = rs.map(function (p, i) {
      var bar = ['v', 'a', 'r'].map(function (k) {
        var w = val(p, 'pct_' + k) || 0;
        return '<div class="' + k + '" style="width:' + w + '%">' + (w >= 9 ? Math.round(w) + ' %' : '') + '</div>';
      }).join('');
      return '<div class="rk" data-cod="' + esc(p.cod) + '"><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(p.nombre) +
        (S.rl === 'barrios' && p.distrito ? '<small>' + esc(p.distrito) + '</small>' : '') + '</span><span class="pp">' + fmt(val(p, 'pob')) + '<br><span class="muted" style="font-size:10px">hab.</span></span>' +
        '<div class="rbar">' + bar + (avg != null ? '<i style="left:' + avg + '%"></i>' : '') + '</div></div>';
    }).join('');
  }
  $('#rank').addEventListener('mouseover', function (e) { var r = e.target.closest('.rk'); highlight(S.rl, r ? r.dataset.cod : null); });
  $('#rank').addEventListener('mouseleave', function () { highlight(null, null); });
  $('#rank').addEventListener('click', function (e) { var r = e.target.closest('.rk'); if (r) zoomTo(S.rl, r.dataset.cod); });

  var COLS = [['nombre', 'Nombre'], ['pob', 'Población'], ['pct_v', '% &lt;250'], ['pct_a', '% 250–500'], ['pct_r', '% &gt;500'], ['pob_r', 'Sin cob.']];
  function renderTable() {
    var rs = rows().filter(function (p) { return val(p, 'pob') != null; }), t = S.tsort;
    rs.sort(function (a, b) {
      if (t.k === 'nombre') return t.d * String(a.nombre).localeCompare(String(b.nombre), 'es');
      return t.d * ((val(a, t.k) || 0) - (val(b, t.k) || 0));
    });
    $('#tcount').textContent = rs.length + ' ' + S.rl;
    $('#tabla').innerHTML = '<table><thead><tr>' + COLS.map(function (c) {
      return '<th data-k="' + c[0] + '">' + c[1] + (t.k === c[0] ? (t.d > 0 ? ' ▲' : ' ▼') : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + rs.map(function (p) {
      return '<tr data-cod="' + esc(p.cod) + '"><td>' + esc(p.nombre) + (S.rl === 'barrios' && p.distrito ? '<small>' + esc(p.distrito) + '</small>' : '') + '</td><td>' + fmt(val(p, 'pob')) +
        '</td><td>' + pc(val(p, 'pct_v')).replace(' %','%') + '</td><td>' + pc(val(p, 'pct_a')).replace(' %','%') + '</td><td>' + pc(val(p, 'pct_r')).replace(' %','%') + '</td><td>' + fmt(val(p, 'pob_r')) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  $('#tabla').addEventListener('click', function (e) {
    var th = e.target.closest('th');
    if (th) { var k = th.dataset.k; S.tsort = { k: k, d: S.tsort.k === k ? -S.tsort.d : (k === 'nombre' ? 1 : -1) }; return renderTable(); }
    var tr = e.target.closest('tbody tr'); if (tr) zoomTo(S.rl, tr.dataset.cod);
  });
  function renderAll() { renderSum(); renderRank(); renderTable(); }

  $$('.tabs button').forEach(function (b) {
    b.onclick = function () {
      S.tab = b.dataset.tab;
      $$('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $('#rank').hidden = S.tab !== 'rank'; $('#tabla').hidden = S.tab !== 'tabla';
      $('#rank-tools').hidden = S.tab !== 'rank'; $('#tab-tools').hidden = S.tab !== 'tabla';
    };
  });
  $('#seg-rank').onclick = function (e) {
    if (!e.target.dataset.v) return;
    S.rl = e.target.dataset.v;
    $$('#seg-rank button').forEach(function (b) { b.classList.toggle('on', b === e.target); });
    renderRank(); renderTable();
  };
  $('#q').oninput = function () { S.q = this.value; renderRank(); renderTable(); };
  $('#sort').onchange = function () { S.sort = this.value; renderRank(); };
  $('#order').onclick = function () {
    S.order = S.order === 'best' ? 'worst' : 'best';
    this.textContent = S.order === 'best' ? 'Mejor → peor' : 'Peor → mejor'; renderRank();
  };
  $('#collapse').onclick = function () {
    var p = $('#panel'); p.classList.toggle('closed');
    this.textContent = p.classList.contains('closed') ? '⇤' : '⇥';
    var n = 0, t = setInterval(function () { if (map) map.resize(); if (++n > 12) clearInterval(t); }, 30);
  };

  // ---------- CSV ----------
  $('#csv').onclick = function () {
    if (!agg) return;
    var ind = [['total', ''], ['15-64', 'a_'], ['65+', 'm_']], f = ['pob', 'pob_v', 'pob_a', 'pob_r', 'pct_v', 'pct_a', 'pct_r'];
    var head = ['nivel', 'cod', 'nombre', 'distrito'];
    ind.forEach(function (i) { f.forEach(function (k) { head.push(i[0] + '_' + k); }); });
    var cell = function (v) {
      if (v == null) return '';
      if (typeof v === 'number') return String(v).replace('.', ',');
      v = String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [head.join(';')];
    [['distrito', agg.distritos], ['barrio', agg.barrios]].forEach(function (g) {
      (g[1] || []).forEach(function (r) {
        var row = [g[0], r.cod, r.nombre, r.distrito || ''];
        ind.forEach(function (i) { f.forEach(function (k) { row.push(r[i[1] + k]); }); });
        lines.push(row.map(cell).join(';'));
      });
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cobertura_bicimad.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };

  // ---------- arranque ----------
  function init() {
    map = new maplibregl.Map({ container: 'map', style: STYLES[S.theme], center: [-3.70, 40.42], zoom: 11, minZoom: 9, hash: true, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('style.load', addAll);
    map.on('click', onClick);
    map.on('mousemove', onMove);
  }
  if (window.pmtiles && window.maplibregl) {
    try { maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile); } catch (e) {}
  }
  var pr = [
    getJSON('metadata.json').then(function (m) { meta = m; }).catch(function () {}),
    getJSON('agregados.json').then(function (a) { agg = a; }).catch(function () {}),
    fetch('data/edificios.pmtiles', { method: 'HEAD' }).then(function (r) { hasPM = r.ok && !!window.pmtiles; }).catch(function () {})
  ].concat(LEVELS.map(function (n) { return getJSON(n + '.geojson').then(function (g) { geo[n] = g; }).catch(function () {}); }));
  Promise.all(pr).then(function () {
    renderLegend(); renderAll(); init();
    if (!store.get('bicimad_visto')) openOb();
  });
})();
