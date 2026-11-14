(function () {
  'use strict';
  var COL = { v: '#1a9850', a: '#f6c600', r: '#d73027' };
  var RAMP = ['#d73027', '#fc8d59', '#fee08b', '#a6d96a', '#1a9850'];
  var nf = new Intl.NumberFormat('es-ES');
  var fmt = function (x) { return nf.format(Math.round(x || 0)); };
  var pc = function (x) { return (x == null ? 0 : x).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; };
  var $ = function (s) { return document.querySelector(s); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ESC[c]; }); };
  var getJSON = function (f) { return fetch('data/' + f).then(function (r) { if (!r.ok) throw new Error(f); return r.json(); }); };

  // ---------- modal ----------
  var modal = $('#modal');
  function openModal() { modal.hidden = false; }
  function closeModal() { modal.hidden = true; try { localStorage.setItem('bicimad_visto', '1'); } catch (e) {} }
  $('#go').onclick = closeModal;
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  $('#about-link').onclick = function (e) { e.preventDefault(); openModal(); };
  var seen = false; try { seen = localStorage.getItem('bicimad_visto') === '1'; } catch (e) {}
  if (!seen) openModal();

  // ---------- tabs ----------
  var map;
  document.querySelectorAll('.tab').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('active', x === b); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab); });
      if (b.dataset.tab === 'mapa' && map) map.resize();
    };
  });

  // ---------- metadata ----------
  getJSON('metadata.json').then(function (m) {
    $('#gen').textContent = m.generado ? new Date(m.generado).toLocaleDateString('es-ES') : '—';
    $('#fuentes').innerHTML = (m.fuentes || []).map(function (f) {
      return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nombre) + '</a>' +
        (f.referencia ? ' · ref. ' + esc(f.referencia) : '') + (f.fecha_descarga ? ' · descargado ' + esc(f.fecha_descarga) : '') + '</li>';
    }).join('');
  }).catch(function () {});

  // ---------- legend ----------
  $('#scale').innerHTML = RAMP.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('');

  // ---------- map ----------
  var LAYERS = ['secciones', 'barrios', 'distritos'];
  var current = 'secciones', edifLoaded = false, edifLoading = false;
  var fillColor = ['step', ['coalesce', ['get', 'pct_v'], 0], RAMP[0], 20, RAMP[1], 40, RAMP[2], 60, RAMP[3], 80, RAMP[4]];
  var fillOpacity = ['interpolate', ['linear'], ['zoom'], 10, 0.75, 13.5, 0.6, 15.5, 0.2];

  map = new maplibregl.Map({
    container: 'map', style: 'https://tiles.openfreemap.org/styles/positron',
    center: [-3.70, 40.42], zoom: 11, minZoom: 9, hash: true, attributionControl: { compact: true }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  function popupBars(p) {
    var rows = [['v', 'Muy buena (< 250 m)'], ['a', 'Regular (250–500 m)'], ['r', 'Sin cobertura (> 500 m)']];
    return '<div class="pp"><h3>' + esc(p.nombre || ('Sección ' + p.cod)) + '</h3>' +
      '<div>Población total: <b>' + fmt(p.pob) + '</b></div><div class="bar">' +
      rows.map(function (r) { return '<div style="width:' + (p['pct_' + r[0]] || 0) + '%;background:' + COL[r[0]] + '"></div>'; }).join('') +
      '</div><table>' + rows.map(function (r) {
        return '<tr><td><span style="color:' + COL[r[0]] + '">●</span> ' + r[1] + '</td><td>' + fmt(p['pob_' + r[0]]) + '</td><td>' + pc(p['pct_' + r[0]]) + '</td></tr>';
      }).join('') + '</table></div>';
  }

  function loadEdificios() {
    if (edifLoaded || edifLoading) return;
    edifLoading = true; $('#loading').hidden = false;
    fetch('data/edificios.geojson').then(function (r) { return r.json(); }).then(function (g) {
      map.addSource('edificios', { type: 'geojson', data: g });
      map.addLayer({
        id: 'edificios', type: 'circle', source: 'edificios', minzoom: 14,
        paint: {
          'circle-color': ['match', ['get', 'n'], 0, COL.v, 1, COL.a, COL.r],
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            14, ['interpolate', ['linear'], ['get', 'p'], 0, 1, 50, 2, 300, 4],
            18, ['interpolate', ['linear'], ['get', 'p'], 0, 3, 50, 6, 300, 14]],
          'circle-opacity': 0.85, 'circle-stroke-width': 0.5, 'circle-stroke-color': '#fff'
        }
      }, 'bases');
      edifLoaded = true;
    }).catch(function () { edifLoading = false; }).then(function () { $('#loading').hidden = true; });
  }
  function checkZoom() {
    var z = map.getZoom();
    $('#hint').style.opacity = z >= 14 ? 0.4 : 1;
    if (z >= 14) loadEdificios();
  }

  function setLayer(name) {
    current = name;
    LAYERS.forEach(function (n) {
      var vis = n === name ? 'visible' : 'none';
      ['fill-', 'line-'].forEach(function (p) { if (map.getLayer(p + n)) map.setLayoutProperty(p + n, 'visibility', vis); });
    });
  }
  $('#layer-sel').onchange = function (e) { setLayer(e.target.value); };

  map.on('load', function () {
    LAYERS.forEach(function (n) {
      map.addSource(n, { type: 'geojson', data: 'data/' + n + '.geojson' });
      var vis = n === current ? 'visible' : 'none';
      map.addLayer({ id: 'fill-' + n, type: 'fill', source: n, layout: { visibility: vis }, paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity } });
      map.addLayer({ id: 'line-' + n, type: 'line', source: n, layout: { visibility: vis }, paint: { 'line-color': '#555', 'line-opacity': 0.5, 'line-width': n === 'secciones' ? 0.3 : 0.8 } });
      map.on('click', 'fill-' + n, function (e) {
        var hit = ['bases'].concat(map.getLayer('edificios') ? ['edificios'] : []);
        if (map.queryRenderedFeatures(e.point, { layers: hit }).length) return;
        new maplibregl.Popup({ maxWidth: '300px' }).setLngLat(e.lngLat).setHTML(popupBars(e.features[0].properties)).addTo(map);
      });
    });
    map.addSource('bases', { type: 'geojson', data: 'data/bases.geojson' });
    map.addLayer({
      id: 'bases', type: 'circle', source: 'bases',
      paint: { 'circle-color': '#1d3f72', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 16, 6] }
    });
    map.on('click', 'bases', function (e) {
      new maplibregl.Popup().setLngLat(e.lngLat).setHTML('<div class="pp"><h3>' + esc(e.features[0].properties.nombre) + '</h3>Base de BiciMAD</div>').addTo(map);
    });
    map.on('click', function (e) {
      if (!map.getLayer('edificios')) return;
      if (map.queryRenderedFeatures(e.point, { layers: ['bases'] }).length) return;
      var f = map.queryRenderedFeatures(e.point, { layers: ['edificios'] })[0];
      if (!f) return;
      var p = f.properties, d = (p.d == null || p.d === 'null' || p.d === '') ? null : Number(p.d);
      new maplibregl.Popup().setLngLat(f.geometry.coordinates).setHTML('<div class="pp"><h3>Edificio</h3>' +
        'Población estimada: <b>' + fmt(p.p) + '</b><br>Distancia andando: <b>' + (d == null ? '&gt; 1.500 m' : fmt(d) + ' m') + '</b><br>' +
        'Base más cercana: <b>' + esc(p.b && p.b !== 'null' ? p.b : '—') + '</b></div>').addTo(map);
    });
    map.on('mousemove', function (e) {
      var l = ['bases'].concat(map.getLayer('edificios') ? ['edificios'] : [], ['fill-' + current]);
      map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers: l }).length ? 'pointer' : '';
    });
    map.on('zoom', checkZoom);
    checkZoom();
  });

  // ---------- datos ----------
  var agg;
  function bar(c) {
    return '<div class="bar">' + ['v', 'a', 'r'].map(function (k) {
      var w = c['pct_' + k] || 0;
      return '<div class="' + k + '" style="width:' + w + '%;background:' + COL[k] + '">' + (w >= 8 ? pc(w) : '') + '</div>';
    }).join('') + '</div>';
  }
  function renderCity(c) {
    var names = { v: 'Muy buena (< 250 m)', a: 'Regular (250–500 m)', r: 'Sin cobertura (> 500 m)' };
    $('#city').innerHTML = '<p>Población total estimada: <b>' + fmt(c.pob) + '</b></p>' + bar(c) + '<div class="kpis">' +
      ['v', 'a', 'r'].map(function (k) {
        return '<div class="kpi" style="border-color:' + COL[k] + '"><span>' + names[k] + '</span><b>' + fmt(c['pob_' + k]) + '</b>' + pc(c['pct_' + k]) + '</div>';
      }).join('') + '</div>';
  }
  var COLS = [['nombre', 'Nombre'], ['pob', 'Población'], ['pob_v', 'Muy buena'], ['pct_v', '% muy buena'], ['pob_a', 'Regular'], ['pct_a', '% regular'], ['pob_r', 'Sin cob.'], ['pct_r', '% sin cob.']];
  function makeTable(el, rows, cols, state) {
    function draw() {
      var data = rows.slice(), s = state;
      if (s.filter) { var q = s.filter.toLowerCase(); data = data.filter(function (r) { return ((r.nombre || '') + ' ' + (r.distrito || '')).toLowerCase().indexOf(q) >= 0; }); }
      data.sort(function (a, b) {
        var x = a[s.key], y = b[s.key];
        var c = typeof x === 'string' ? x.localeCompare(y, 'es') : (x || 0) - (y || 0);
        return s.dir * c;
      });
      el.innerHTML = '<thead><tr>' + cols.map(function (c) {
        return '<th data-k="' + c[0] + '">' + c[1] + (s.key === c[0] ? (s.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
      }).join('') + '</tr></thead><tbody>' + data.map(function (r) {
        return '<tr>' + cols.map(function (c) {
          var v = r[c[0]];
          return '<td>' + (c[0] === 'nombre' ? esc(v) + (r.distrito ? ' <small style="color:#66727f">· ' + esc(r.distrito) + '</small>' : '') : c[0].indexOf('pct') === 0 ? pc(v) : fmt(v)) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
      el.querySelectorAll('th').forEach(function (th) {
        th.onclick = function () { var k = th.dataset.k; state.dir = state.key === k ? -state.dir : (k === 'nombre' ? 1 : -1); state.key = k; draw(); };
      });
    }
    draw(); return draw;
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCSV() {
    var head = ['tipo', 'cod', 'nombre', 'distrito', 'poblacion', 'pob_menos_250m', 'pob_250_500m', 'pob_mas_500m', 'pct_menos_250m', 'pct_250_500m', 'pct_mas_500m'];
    var lines = [head.join(';')];
    function add(t, r) {
      lines.push([t, r.cod, r.nombre, r.distrito || '', r.pob, r.pob_v, r.pob_a, r.pob_r,
        String(r.pct_v).replace('.', ','), String(r.pct_a).replace('.', ','), String(r.pct_r).replace('.', ',')].map(csvCell).join(';'));
    }
    agg.distritos.forEach(function (r) { add('distrito', r); });
    agg.barrios.forEach(function (r) { add('barrio', r); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cobertura_bicimad.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  getJSON('agregados.json').then(function (a) {
    agg = a; renderCity(a.ciudad);
    makeTable($('#t-dist'), a.distritos, COLS, { key: 'pct_v', dir: -1 });
    var bs = { key: 'nombre', dir: 1, filter: '' };
    var redraw = makeTable($('#t-bar'), a.barrios, COLS, bs);
    $('#q').oninput = function (e) { bs.filter = e.target.value; redraw(); };
    $('#csv').onclick = downloadCSV;
  }).catch(function () { $('#city').textContent = 'No se pudieron cargar los datos.'; });
})();
