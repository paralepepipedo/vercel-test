// ============================================
// admin/admin.js — Frontend del panel de administración EduCoins
// Versión: 2.0.0 — 2026-03-08
// Changelog:
//   2.0.0 - Botón editar evaluación en lista
//   1.9.0 - Selector colegio en modal eval admin
//   1.8.0 - Fix fecha NaN en render evaluaciones
//   1.7.0 - Fix grado y colegio_id en guardarEvalAdmin
//   1.6.0 - Cache KPIs y alumnos: re-pinta instantáneo al volver al tab
//   1.5.0 - Fix: renderKPIs eliminada, activarTab usa cargarKPIs directo
//   1.4.0 - renderKPIs separado de cargarKPIs, re-render en activarTab
//   1.3.0 - Tab evaluaciones admin, canjes pendientes, modal entrega, Telegram
//   1.2.0 - Items tienda CRUD, badge canjes, cargarCanjesPendientes
//   1.1.0 - Tabs, KPIs, top alumnos, transacciones, alumnos
// Requiere (en orden): clerk-config.js, clerk-guard.js, shared.js
// ============================================

(function () {
  'use strict';

  // ------------------------------------------------
  // Estado global
  // ------------------------------------------------
  var alumnos = [];
  var misionesB = [];
  var tiendaItems = [];
  var profesores = [];
  var economia = [];

  // Avatares disponibles para seleccionar (aptos para niños)
  var AVATARES = [
    '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸',
    '🐙', '🦋', '🐢', '🦄', '🐬', '🐧', '🦅', '🦉',
    '🦔', '🦝', '🐺', '🦕', '🐊', '🦓', '🦒', '🐘',
  ];

  // ------------------------------------------------
  // Init al cargar el DOM
  // ------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    initShared('admin');
    initTabs();
    initModales();
    initFiltrosAlumnos();
  });

  // Cuando Clerk confirma la sesión → cargar datos iniciales
  document.addEventListener('clerkReady', function () {
    var nombreEl = document.getElementById('adminNombre');
    if (nombreEl && window.CLERK_USER) {
      var nombre = window.CLERK_USER.firstName || window.CLERK_USER.username || 'Administrador';
      nombreEl.textContent = nombre;
      window._adminNombre = nombre; // para el modal de entrega
    }
    if (!window.CLERK_TOKEN) return;
    cargarKPIs();
    cargarAlumnos();
    cargarTransacciones();
    // Retry: re-renderizar KPIs 2s después por si el DOM tardó
    setTimeout(function () {
      cargarKPIs();
    }, 2000);
  });

  // ------------------------------------------------
  // TABS
  // ------------------------------------------------
  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activarTab(btn.dataset.tab);
      });
    });
  }

  function activarTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + tab);
    });

    if (!window.CLERK_TOKEN) return;

    // Tabs que re-renderizan con datos ya en memoria
    if (tab === 'resumen') {
      cargarKPIs();
      if (alumnos.length) { renderTopAlumnos(); }
      else { cargarAlumnos(); }
      cargarTransacciones();
    }
    if (tab === 'alumnos') {
      if (alumnos.length) { renderTablaAlumnos(); }
      else { cargarAlumnos(); }
    }
    // Tabs que siempre van al servidor
    if (tab === 'misiones') cargarMisionesAdmin();
    if (tab === 'banco-misiones') cargarBancoMisiones();
    if (tab === 'monedas') cargarMonedas();
    if (tab === 'tienda') cargarTiendaAdmin();
    if (tab === 'economia') cargarEconomia();
    if (tab === 'profesores') cargarProfesores();
    if (tab === 'evaluaciones') cargarEvalsAdmin();
  }

  // ------------------------------------------------
  // API helpers
  // ------------------------------------------------
  function apiGet(action) {
    return fetch(BASE_URL + '/api/admin?action=' + action, {
      headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function apiPost(body) {
    return fetch(BASE_URL + '/api/admin', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + window.CLERK_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function apiPut(body) {
    return fetch(BASE_URL + '/api/admin', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + window.CLERK_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function apiDelete(body) {
    return fetch(BASE_URL + '/api/admin', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + window.CLERK_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // ------------------------------------------------
  // TAB RESUMEN — KPIs + top alumnos + transacciones
  // ------------------------------------------------
  var _kpisCache = null;

  function _pintarKPIs(d) {
    if (!d) return;
    _kpisCache = d;
    var sinActividad = alumnos.filter(function (a) {
      if (!a.ultimo_login) return true;
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      var login = new Date(a.ultimo_login); login.setHours(0, 0, 0, 0);
      return login < hoy;
    }).length;
    var el;
    el = document.getElementById('kpiAlumnos'); if (el) el.textContent = d.alumnos_activos || 0;
    el = document.getElementById('kpiMisiones'); if (el) el.textContent = (d.pct_misiones || 0) + '%';
    el = document.getElementById('kpiTareas'); if (el) el.textContent = (d.pct_tareas || 0) + '%';
    el = document.getElementById('kpiRacha'); if (el) el.textContent = sinActividad + ' alumnos';
  }

  function cargarKPIs() {
    // Si hay cache, pintar inmediatamente y refrescar en segundo plano
    if (_kpisCache) _pintarKPIs(_kpisCache);
    fetch(BASE_URL + '/api/admin?action=kpis', {
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { _pintarKPIs(d); })
      .catch(function () {
        if (!_kpisCache) {
          ['kpiAlumnos', 'kpiMisiones', 'kpiTareas', 'kpiRacha'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.textContent = '—';
          });
        }
      });
  }

  function cargarAlumnos() {
    // Si ya hay datos, re-pintar inmediatamente mientras se refresca
    if (alumnos.length) { renderTopAlumnos(); renderTablaAlumnos(); }
    apiGet('alumnos').then(function (data) {
      alumnos = data.alumnos || [];
      renderTopAlumnos();
      renderTablaAlumnos();
      llenarSelectAlumnos();
      renderCirculacion();
      // Actualizar KPI "sin actividad" con datos frescos
      if (_kpisCache) _pintarKPIs(_kpisCache);
    }).catch(function () {
      if (!alumnos.length) {
        ['topAlumnos', 'alumnosTabla'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.innerHTML = '<p style="color:#ef4444;padding:.5rem;">Error al cargar alumnos.</p>';
        });
      }
    });
  }

  function cargarTransacciones() {
    apiGet('transacciones').then(function (data) {
      var lista = data.transacciones || [];
      renderTransacciones(lista, 'transaccionesResumen', 5);
      renderTransacciones(lista, 'transaccionesLista', 20);
    }).catch(function () {
      var el = document.getElementById('transaccionesResumen');
      if (el) el.innerHTML = '<p style="color:var(--text-dim);padding:.5rem;">Sin datos.</p>';
    });
  }

  function renderTopAlumnos() {
    try {
      var el = document.getElementById('topAlumnos');
      if (!el) return;
      var top = alumnos.slice(0, 5);
      if (!top.length) {
        el.innerHTML = '<p style="color:var(--text-dim);padding:.5rem;">Sin alumnos.</p>';
        return;
      }
      var medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      el.innerHTML = top.map(function (a, i) {
        return '<div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.06);">' +
          '<span style="font-size:1.1rem;min-width:1.5rem;text-align:center;">' + medallas[i] + '</span>' +
          '<span style="font-size:1.2rem;">' + esc(a.avatar_base || '🐰') + '</span>' +
          '<div style="flex:1;">' +
          '<div style="font-weight:700;font-size:.9rem;">' + esc(a.nombre) + '</div>' +
          '<div style="font-size:.75rem;color:var(--text-dim);">Nv.' + (a.nivel || 1) + ' · Grado ' + (a.grado_actual || '?') + '</div>' +
          '</div>' +
          '<div style="font-weight:800;color:#facc15;">' + (a.monedas || 0).toLocaleString('es-CL') + ' 🪙</div>' +
          '</div>';
      }).join('');
    } catch (e) { console.error('[renderTopAlumnos]', e); }
  }

  function renderTransacciones(lista, elId, max) {
    var el = document.getElementById(elId);
    if (!el) return;
    var slice = lista.slice(0, max);
    if (!slice.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:.5rem;">Sin transacciones.</p>';
      return;
    }
    el.innerHTML = slice.map(function (t) {
      var monto = Number(t.monto || 0);
      var signo = monto > 0 ? '+' : '';
      var color = monto > 0 ? '#22c55e' : '#ef4444';
      return '<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:.82rem;">' +
        '<span>' + esc(t.avatar_base || '🐰') + '</span>' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;">' + esc(t.nombre) + '</div>' +
        '<div style="color:var(--text-dim);font-size:.75rem;">' + esc(t.concepto || '—') + '</div>' +
        '</div>' +
        '<div style="font-weight:800;color:' + color + ';">' + signo + monto.toLocaleString('es-CL') + ' 🪙</div>' +
        '</div>';
    }).join('');
  }

  // ------------------------------------------------
  // TAB ALUMNOS
  // ------------------------------------------------
  function initFiltrosAlumnos() {
    var s = document.getElementById('searchAlumno');
    var g = document.getElementById('filtroGrado');
    if (s) s.addEventListener('input', renderTablaAlumnos);
    if (g) g.addEventListener('change', renderTablaAlumnos);
  }

  function renderTablaAlumnos() {
    var busqueda = (document.getElementById('searchAlumno') || {}).value || '';
    var grado = (document.getElementById('filtroGrado') || {}).value || '';

    var filtrados = alumnos.filter(function (a) {
      var okNombre = !busqueda || a.nombre.toLowerCase().includes(busqueda.toLowerCase());
      var okGrado = !grado || String(a.grado_actual) === grado;
      return okNombre && okGrado;
    });

    var el = document.getElementById('alumnosTabla');
    if (!el) return;
    if (!filtrados.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin alumnos para mostrar.</p>';
      return;
    }
    el.innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:.85rem;">' +
      '<thead><tr style="color:var(--text-dim);text-align:left;">' +
      '<th style="padding:.5rem;">Alumno</th>' +
      '<th style="padding:.5rem;">Grado</th>' +
      '<th style="padding:.5rem;">Nivel</th>' +
      '<th style="padding:.5rem;">Monedas</th>' +
      '<th style="padding:.5rem;">Racha</th>' +
      '<th style="padding:.5rem;">Misiones hoy</th>' +
      '<th style="padding:.5rem;"></th>' +
      '</tr></thead>' +
      '<tbody>' +
      filtrados.map(function (a) {
        return '<tr style="border-top:1px solid rgba(255,255,255,.06);">' +
          '<td style="padding:.5rem;">' + esc(a.avatar_base || '🐰') + ' ' + esc(a.nombre) + '</td>' +
          '<td style="padding:.5rem;">' + (a.grado_actual || '?') + '°</td>' +
          '<td style="padding:.5rem;">Nv.' + (a.nivel || 1) + '</td>' +
          '<td style="padding:.5rem;color:#facc15;font-weight:700;">' + (a.monedas || 0).toLocaleString('es-CL') + '</td>' +
          '<td style="padding:.5rem;">' + (a.racha_dias || 0) + ' 🔥</td>' +
          '<td style="padding:.5rem;">' + (a.misiones_hoy || 0) + '</td>' +
          '<td style="padding:.5rem;">' +
          '<button class="btn-admin btn-primary" style="padding:.25rem .5rem;font-size:.75rem;" data-edit-alumno="' + esc(a.clerk_id) + '">✏️</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>';

    el.querySelectorAll('[data-edit-alumno]').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirEditarAlumno(btn.dataset.editAlumno); });
    });
  }

  // ------------------------------------------------
  // TAB MISIONES (visualización banco activo)
  // ------------------------------------------------
  function cargarMisionesAdmin() {
    apiGet('misiones_banco').then(function (data) {
      misionesB = data.misiones || [];
      renderMisionesAdmin();
    }).catch(function () {
      toast('Error cargando misiones', 'error');
    });
  }

  function renderMisionesAdmin() {
    var el = document.getElementById('misionesAdminGrid');
    if (!el) return;
    var activas = misionesB.filter(function (m) { return m.activo !== false; });
    if (!activas.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin misiones activas.</p>';
      return;
    }
    el.innerHTML = activas.map(function (m) {
      return '<div style="background:rgba(255,255,255,.05);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:.75rem;">' +
        '<span style="font-size:2rem;">' + esc(m.icono || '🎯') + '</span>' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;">' + esc(m.descripcion) + '</div>' +
        '<div style="font-size:.75rem;color:var(--text-dim);">Tipo: ' + esc(m.tipo) + ' · ' + (m.recompensa_base || 0) + ' 🪙</div>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  // ------------------------------------------------
  // TAB MONEDAS
  // ------------------------------------------------
  function cargarMonedas() {
    // Si ya hay alumnos cargados, renderizar directamente
    if (alumnos.length > 0) {
      renderCirculacion();
      llenarSelectAlumnos();
      // Transacciones: recargar siempre para tener las más recientes
      apiGet('transacciones').then(function (data) {
        renderTransacciones(data.transacciones || [], 'transaccionesLista', 20);
      }).catch(function () { });
      return;
    }
    // Si no hay alumnos aún, cargarlos primero
    apiGet('alumnos').then(function (data) {
      alumnos = data.alumnos || [];
      renderCirculacion();
      llenarSelectAlumnos();
    }).catch(function () { toast('Error cargando alumnos', 'error'); });
    apiGet('transacciones').then(function (data) {
      renderTransacciones(data.transacciones || [], 'transaccionesLista', 20);
    }).catch(function () { });
  }

  function renderCirculacion() {
    var el = document.getElementById('circulacionLista');
    if (!el) return;
    var top = alumnos.slice(0, 10);
    if (!top.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:.5rem;">Sin datos.</p>';
      return;
    }
    el.innerHTML = top.map(function (a, i) {
      return '<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.06);">' +
        '<span style="min-width:1.4rem;text-align:center;font-weight:800;color:var(--text-dim);">' + (i + 1) + '</span>' +
        '<span>' + esc(a.avatar_base || '🐰') + '</span>' +
        '<div style="flex:1;font-weight:700;font-size:.85rem;">' + esc(a.nombre) + '</div>' +
        '<div style="color:#facc15;font-weight:800;">' + (a.monedas || 0).toLocaleString('es-CL') + ' 🪙</div>' +
        '</div>';
    }).join('');
  }

  function llenarSelectAlumnos() {
    var sel = document.getElementById('fMonedasAlumno');
    if (!sel) return;
    sel.innerHTML = alumnos.map(function (a) {
      return '<option value="' + esc(a.clerk_id) + '">' + esc(a.nombre) + ' (' + (a.monedas || 0) + ' coins)</option>';
    }).join('');
  }

  // ------------------------------------------------
  // TAB BANCO DE MISIONES
  // ------------------------------------------------
  function cargarBancoMisiones() {
    apiGet('misiones_banco').then(function (data) {
      misionesB = data.misiones || [];
      renderBancoMisiones();
    }).catch(function () {
      toast('Error cargando banco de misiones', 'error');
    });
  }

  function renderBancoMisiones() {
    var el = document.getElementById('bancoMisionesLista');
    if (!el) return;
    if (!misionesB.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin misiones en el banco.</p>';
      return;
    }
    el.innerHTML = misionesB.map(function (m) {
      var estadoHTML = m.activo !== false
        ? '<span style="color:#22c55e">Activa</span>'
        : '<span style="color:#ef4444">Inactiva</span>';
      return '<div style="background:rgba(255,255,255,.05);border-radius:12px;padding:1rem;margin-bottom:.75rem;display:flex;align-items:center;gap:.75rem;">' +
        '<span style="font-size:1.8rem;">' + esc(m.icono || '🎯') + '</span>' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;">' + esc(m.descripcion) + '</div>' +
        '<div style="font-size:.75rem;color:var(--text-dim);">Tipo: ' + esc(m.tipo) + ' · ' + (m.recompensa_base || 0) + ' 🪙 · ⭐ ' + (m.recompensa_xp || 0) + ' XP · ' + estadoHTML + '</div>' +
        '</div>' +
        '<button class="btn-admin btn-primary" data-edit-mision="' + m.id + '">✏️</button>' +
        '<button class="btn-admin" style="background:rgba(239,68,68,.2);color:#ef4444;" data-del-mision="' + m.id + '">🗑️</button>' +
        '</div>';
    }).join('');

    el.querySelectorAll('[data-edit-mision]').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirEditarMision(btn.dataset.editMision); });
    });
    el.querySelectorAll('[data-del-mision]').forEach(function (btn) {
      btn.addEventListener('click', function () { confirmarEliminarMision(btn.dataset.delMision); });
    });
  }

  function abrirEditarMision(id) {
    var m = misionesB.find(function (x) { return String(x.id) === String(id); });
    if (!m) return;
    document.getElementById('modalMisionTitulo').textContent = 'Editar Misión';
    document.getElementById('fMisionId').value = m.id;
    // tipo y descripción son fijos (ligados a la lógica del juego) → solo lectura al editar
    var fTipo = document.getElementById('fMisionTipo');
    var fDesc = document.getElementById('fMisionDesc');
    fTipo.value = m.tipo || '';
    fTipo.readOnly = true;
    fDesc.value = m.descripcion || '';
    fDesc.readOnly = true;
    document.getElementById('fMisionIcono').value = m.icono || '';
    document.getElementById('fMisionRecompensa').value = m.recompensa_base || 0;
    document.getElementById('fMisionXP').value = m.recompensa_xp || 0;
    abrirModal('modalMision');
  }

  function confirmarEliminarMision(id) {
    if (!confirm('¿Desactivar esta misión?')) return;
    apiDelete({ action: 'eliminar_mision', id: id }).then(function () {
      toast('Misión desactivada', 'success');
      cargarBancoMisiones();
    }).catch(function () {
      toast('Error al eliminar misión', 'error');
    });
  }

  // ------------------------------------------------
  // TAB TIENDA
  // ------------------------------------------------
  function cargarTiendaAdmin() {
    apiGet('tienda_items').then(function (data) {
      tiendaItems = data.items || [];
      renderTiendaAdmin();
    }).catch(function () {
      toast('Error cargando tienda', 'error');
    });
    cargarCanjesPendientes();
  }

  // ─── CANJES PENDIENTES ───────────────────────────────────────────
  function cargarCanjesPendientes() {
    apiGet('canjes_pendientes').then(function (data) {
      var canjes = data.canjes || [];
      var seccion = document.getElementById('seccionCanjes');
      var badge = document.getElementById('badgeCanjes');
      var lista = document.getElementById('canjesLista');
      var count = document.getElementById('canjesCount');
      if (!seccion || !lista) return;

      if (canjes.length === 0) {
        seccion.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
      }

      // Mostrar sección y badge
      seccion.style.display = 'block';
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = canjes.length; }
      if (count) { count.textContent = canjes.length; }

      lista.innerHTML = canjes.map(function (c) {
        var hace = tiempoRelativo(c.created_at);
        return '<div class="canje-row-admin">' +
          '<div class="canje-avatar-admin">👤</div>' +
          '<div class="canje-info-admin">' +
          '<div class="canje-nombre-admin">' + (c.alumno_nombre || 'Alumno') + '</div>' +
          '<div class="canje-sub-admin">' + (c.emoji || '🎁') + ' ' + (c.item_nombre || '') + ' · ' + Number(c.precio_pagado).toLocaleString('es-CL') + ' EC</div>' +
          '<div class="canje-fecha-admin">⏰ ' + hace + '</div>' +
          '</div>' +
          '<button class="btn-entregar-admin" onclick="abrirModalEntrega(\'' + c.id + '\',\'' + escHtml(c.item_nombre) + '\',\'' + escHtml(c.alumno_nombre) + '\',\'' + (c.emoji || '🎁') + '\')">✅ Entregar</button>' +
          '</div>';
      }).join('');

      // Toast si hay canjes pendientes (solo primera vez)
      if (!window._canjesNotificado && canjes.length > 0) {
        window._canjesNotificado = true;
        setTimeout(function () {
          toast('🔔 Tienes ' + canjes.length + ' canje' + (canjes.length > 1 ? 's' : '') + ' pendiente' + (canjes.length > 1 ? 's' : '') + ' de entrega', 'warning');
        }, 800);
      }
    }).catch(function () { /* sin canjes o sin endpoint aún */ });
  }

  function escHtml(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function tiempoRelativo(fechaStr) {
    var diff = (Date.now() - new Date(fechaStr).getTime()) / 1000;
    if (diff < 60) return 'Hace ' + Math.round(diff) + 's';
    if (diff < 3600) return 'Hace ' + Math.round(diff / 60) + ' min';
    if (diff < 86400) return 'Hace ' + Math.round(diff / 3600) + ' hora' + (Math.round(diff / 3600) > 1 ? 's' : '');
    return 'Hace ' + Math.round(diff / 86400) + ' día' + (Math.round(diff / 86400) > 1 ? 's' : '');
  }

  function renderTiendaAdmin() {
    var el = document.getElementById('tiendaAdminLista');
    if (!el) return;
    if (!tiendaItems.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin ítems. Crea el primero con "+ Nuevo Ítem".</p>';
      return;
    }

    var tipoLabel = {
      'canjeable': '💵', 'activable': '⚡', 'consumible': '🎯', 'cosmético': '✨'
    };

    el.innerHTML = tiendaItems.map(function (item) {
      var activo = item.disponible !== false;
      var dotColor = activo ? '#22c55e' : '#ef4444';
      var stockTxt = item.stock !== null && item.stock !== undefined
        ? 'Stock: ' + (item.stock - (item.stock_usado || 0)) + '/' + item.stock
        : 'Stock: ∞';
      var tipoIco = tipoLabel[item.tipo] || '🎁';
      var nivelTxt = item.nivel_minimo > 1 ? ' · Nv.' + item.nivel_minimo : '';

      return '<div class="item-admin-card' + (activo ? '' : ' inactivo') + '" data-id="' + item.id + '">' +
        '<div class="item-admin-estado-dot" style="background:' + dotColor + '" title="' + (activo ? 'Activo' : 'Inactivo') + '"></div>' +
        '<span style="font-size:1.6rem;flex-shrink:0">' + esc(item.emoji || '🎁') + '</span>' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:800;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(item.nombre) + '</div>' +
        '<div style="font-size:.72rem;color:var(--text-dim);margin-top:.15rem">' +
        tipoIco + ' ' + esc(item.tipo || '') +
        ' · ' + esc(item.categoria || '') +
        nivelTxt +
        ' · ' + (item.precio || 0).toLocaleString('es-CL') + ' ' + '🪙' +
        ' · <span style="color:' + (activo ? '#22c55e' : '#ef4444') + '">' + stockTxt + '</span>' +
        '</div>' +
        '</div>' +
        '<button class="btn-admin btn-primary" data-edit-item="' + item.id + '" title="Editar">✏️</button>' +
        '</div>';
    }).join('');

    el.querySelectorAll('[data-edit-item]').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirEditarItem(btn.dataset.editItem); });
    });
  }

  function abrirEditarItem(id) {
    var item = tiendaItems.find(function (x) { return String(x.id) === String(id); });
    if (!item) return;

    document.getElementById('modalItemTitulo').textContent = 'Editar Ítem';
    document.getElementById('fItemId').value = item.id;
    document.getElementById('fItemNombre').value = item.nombre || '';
    document.getElementById('fItemCategoria').value = item.categoria || 'cosmético';
    document.getElementById('fItemTipo').value = item.tipo || 'cosmético';
    document.getElementById('fItemPrecio').value = item.precio || 500;
    document.getElementById('fItemNivelMin').value = item.nivel_minimo || 1;
    document.getElementById('fItemIcono').value = item.emoji || item.icono || '';
    document.getElementById('fItemImagenUrl').value = item.imagen_url || '';
    document.getElementById('fItemDesc').value = item.descripcion || '';
    document.getElementById('fItemStock').value = item.stock !== null && item.stock !== undefined ? item.stock : '';
    document.getElementById('fItemStockUsado').value = item.stock_usado || 0;
    document.getElementById('fItemCompraRepetida').checked = Boolean(item.compra_repetida);
    document.getElementById('fItemDisponible').checked = item.disponible !== false;
    document.getElementById('fItemDuracion').value = item.duracion_horas || 24;
    document.getElementById('fItemMultiplicador').value = item.multiplicador || 2;
    document.getElementById('fItemAlcance').value = item.alcance || 'todo';

    // Mostrar/ocultar sección boost y botón eliminar
    toggleSeccionBoost(item.tipo || 'cosmético');
    document.getElementById('btnEliminarItem').style.display = 'inline-flex';

    abrirModal('modalItem');
  }

  function toggleSeccionBoost(tipo) {
    var sec = document.getElementById('seccionBoost');
    if (sec) sec.style.display = tipo === 'activable' ? 'block' : 'none';
  }

  // ------------------------------------------------
  // TAB ECONOMÍA
  // ------------------------------------------------
  function cargarEconomia() {
    apiGet('economia').then(function (data) {
      economia = data.config || [];
      renderEconomia();
    }).catch(function () {
      toast('Error cargando economía', 'error');
    });
  }

  function renderEconomia() {
    var el = document.getElementById('economiaLista');
    if (!el) return;
    if (!economia.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin configuración.</p>';
      return;
    }
    el.innerHTML = economia.map(function (cfg) {
      return '<div style="display:flex;align-items:center;gap:1rem;padding:.75rem 0;border-bottom:1px solid rgba(255,255,255,.06);">' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;font-size:.9rem;">' + esc(cfg.clave) + '</div>' +
        '<div style="font-size:.75rem;color:var(--text-dim);">' + esc(cfg.descripcion || '') + '</div>' +
        '</div>' +
        '<input type="number" value="' + (cfg.valor || 0) + '" min="0" ' +
        'data-clave="' + esc(cfg.clave) + '" ' +
        'style="width:90px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:white;padding:.4rem .6rem;font-size:.9rem;"/>' +
        '</div>';
    }).join('');

    el.querySelectorAll('input[data-clave]').forEach(function (input) {
      input.addEventListener('change', function () {
        apiPut({ action: 'actualizar_economia', clave: input.dataset.clave, valor: Number(input.value) })
          .then(function () { toast('Parámetro actualizado', 'success'); })
          .catch(function () { toast('Error al actualizar', 'error'); });
      });
    });
  }

  // ------------------------------------------------
  // TAB PROFESORES
  // ------------------------------------------------
  function cargarProfesores() {
    apiGet('profesores').then(function (data) {
      profesores = data.profesores || [];
      renderProfesores();
    }).catch(function () {
      toast('Error cargando profesores', 'error');
    });
  }

  function renderProfesores() {
    var el = document.getElementById('profesoresLista');
    if (!el) return;
    if (!profesores.length) {
      el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Sin profesores registrados.</p>';
      return;
    }
    el.innerHTML = profesores.map(function (p) {
      var grados = (p.accesorios || []).join(', ') || '—';
      return '<div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 0;border-bottom:1px solid rgba(255,255,255,.06);">' +
        '<span style="font-size:1.5rem;">👨‍🏫</span>' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;">' + esc(p.nombre) + '</div>' +
        '<div style="font-size:.75rem;color:var(--text-dim);">' + esc(p.email) + ' · Grados: ' + esc(grados) + '</div>' +
        '</div>' +
        '<div style="font-size:.8rem;color:var(--text-dim);">' + (p.total_alumnos || 0) + ' alumnos</div>' +
        '</div>';
    }).join('');
  }

  // ------------------------------------------------
  // TAB EVALUACIONES — placeholder
  // ------------------------------------------------
  // ─────────────────────────────────────────────────────────────
  // TAB EVALUACIONES — Admin
  // ─────────────────────────────────────────────────────────────
  var evalsAdmin = [];

  var ASIG_CONFIG = {
    Matematicas: { emoji: '➗', color: '#3b82f6' },
    Lenguaje: { emoji: '📖', color: '#8b5cf6' },
    Historia: { emoji: '🏛️', color: '#f59e0b' },
    Ciencias: { emoji: '🔬', color: '#10b981' },
    Ingles: { emoji: '🇬🇧', color: '#06b6d4' },
    'Ed. Fisica': { emoji: '⚽', color: '#f97316' },
    Musica: { emoji: '🎵', color: '#ec4899' },
    Artes: { emoji: '🎨', color: '#a78bfa' },
    Tecnologia: { emoji: '💻', color: '#64748b' },
  };

  var TIPO_LABEL = {
    prueba: '📝 Prueba', trabajo: '📋 Trabajo', tarea: '✏️ Tarea',
    disertacion: '🎤 Disertación', laboratorio: '🔬 Lab',
  };

  function cargarEvalsAdmin() {
    var el = document.getElementById('evalAdminLista');
    if (el) el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Cargando evaluaciones...</p>';
    apiGet('evaluaciones_admin').then(function (data) {
      evalsAdmin = data.evaluaciones || [];
      renderEvalsAdmin();
    }).catch(function () {
      if (el) el.innerHTML = '<p style="color:#ef4444;padding:1rem;">Error cargando evaluaciones.</p>';
    });
  }

  function renderEvalsAdmin() {
    var el = document.getElementById('evalAdminLista');
    if (!el) return;

    var gradoFiltro = (document.getElementById('filtroEvalGrado') || {}).value || '';
    var asigFiltro = (document.getElementById('filtroEvalAsig') || {}).value || '';

    var lista = evalsAdmin.filter(function (e) {
      if (gradoFiltro && String(e.grado_destinatario) !== gradoFiltro && e.grado_destinatario !== null) return false;
      if (asigFiltro && e.asignatura !== asigFiltro) return false;
      return true;
    });

    // Ordenar por fecha más próxima primero
    lista.sort(function (a, b) { return new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion); });

    if (!lista.length) {
      el.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">' +
        '<div style="font-size:2rem;margin-bottom:.5rem">📭</div>' +
        '<div style="font-family:\'Press Start 2P\',monospace;font-size:.38rem">Sin evaluaciones</div>' +
        '<div style="font-size:.8rem;margin-top:.4rem">Crea la primera con "+ Nueva Evaluación"</div></div>';
      return;
    }

    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    el.innerHTML = lista.map(function (e) {
      var cfg = ASIG_CONFIG[e.asignatura] || { emoji: '📋', color: '#64748b' };
      var fechaStr = (e.fecha_evaluacion || '').split('T')[0];
      var fecha = new Date(fechaStr + 'T12:00:00');
      var diff = Math.round((fecha - hoy) / 86400000);
      var badgeClass = diff < 0 ? 'pasada' : diff === 0 ? 'hoy' : 'proxima';
      var badgeTxt = diff < 0 ? 'Pasada' : diff === 0 ? '¡Hoy!' : 'En ' + diff + 'd';
      var fechaTxt = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
      var gradoTxt = e.grado_destinatario ? e.grado_destinatario + '° Básico' : '🏫 Todo el colegio';

      return '<div class="eval-admin-card">' +
        '<div class="eval-admin-asig" style="background:' + cfg.color + '22;border:1px solid ' + cfg.color + '44">' + cfg.emoji + '</div>' +
        '<div class="eval-admin-info">' +
        '<div class="eval-admin-nombre">' + esc(e.asignatura) + ' — ' + (TIPO_LABEL[e.tipo_evaluacion] || e.tipo_evaluacion || '') + '</div>' +
        '<div class="eval-admin-meta">📅 ' + fechaTxt + ' · ' + gradoTxt + (e.descripcion ? ' · ' + esc(e.descripcion).substring(0, 60) + (e.descripcion.length > 60 ? '…' : '') : '') + '</div>' +
        '</div>' +
        '<span class="eval-admin-badge ' + badgeClass + '">' + badgeTxt + '</span>' +
        '<button class="btn-eval-edit" data-eval="' + esc(JSON.stringify(e)) + '" title="Editar" style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:6px;color:#60a5fa;font-size:.8rem;padding:.3rem .5rem;cursor:pointer;margin-right:.25rem">✏️</button>' +
        '<button class="btn-eval-delete" onclick="eliminarEvalAdmin(\'' + e.id + '\')" title="Eliminar">🗑️</button>' +
        '</div>';
    }).join('');

    // Event delegation para botones editar
    el.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.btn-eval-edit');
      if (btn) {
        try {
          var evalData = JSON.parse(btn.getAttribute('data-eval'));
          abrirModalEvalAdmin(evalData);
        } catch (e) { console.error('Error parseando eval data', e); }
      }
    });

    // Binding filtros
    ['filtroEvalGrado', 'filtroEvalAsig'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (sel && !sel._bound) {
        sel._bound = true;
        sel.addEventListener('change', renderEvalsAdmin);
      }
    });

    // Binding botón nueva eval
    var btn = document.getElementById('btnNuevaEval');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', function () { abrirModalEvalAdmin(null); });
    }
  }



  // ------------------------------------------------
  // MODALES — bindings
  // ------------------------------------------------
  function initModales() {
    // Cerrar por botón ✕
    var cierres = {
      'btnCerrarModalEval': 'modalEval',
      'btnCerrarModalMonedas': 'modalMonedas',
      'btnCerrarModalMision': 'modalMision',
      'btnCerrarModalItem': 'modalItem',
      'btnCerrarModalProfesor': 'modalProfesor',
      'btnCerrarModalEditarAlumno': 'modalEditarAlumno',
    };
    Object.keys(cierres).forEach(function (btnId) {
      var btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', function () { cerrarModal(cierres[btnId]); });
    });

    // Cerrar al clic en el overlay
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrarModal(overlay.id);
      });
    });

    // Abrir modales desde botones de toolbar
    var btnNuevaEval = document.getElementById('btnNuevaEval');
    if (btnNuevaEval) btnNuevaEval.addEventListener('click', function () {
      abrirModalEvalAdmin(null);
    });

    var btnDarMonedas = document.getElementById('btnDarMonedas');
    if (btnDarMonedas) btnDarMonedas.addEventListener('click', function () {
      llenarSelectAlumnos();
      abrirModal('modalMonedas');
    });

    var btnNuevaMision = document.getElementById('btnNuevaMision');
    if (btnNuevaMision) btnNuevaMision.addEventListener('click', function () {
      document.getElementById('modalMisionTitulo').textContent = 'Nueva Misión';
      document.getElementById('fMisionId').value = '';
      var fTipo = document.getElementById('fMisionTipo');
      var fDesc = document.getElementById('fMisionDesc');
      fTipo.value = '';
      fTipo.readOnly = false;
      fDesc.value = '';
      fDesc.readOnly = false;
      document.getElementById('fMisionIcono').value = '';
      document.getElementById('fMisionRecompensa').value = 50;
      document.getElementById('fMisionXP').value = 0;
      abrirModal('modalMision');
    });

    var btnNuevoItem = document.getElementById('btnNuevoItem');
    if (btnNuevoItem) btnNuevoItem.addEventListener('click', function () {
      document.getElementById('modalItemTitulo').textContent = 'Nuevo Ítem';
      document.getElementById('fItemId').value = '';
      document.getElementById('fItemNombre').value = '';
      document.getElementById('fItemCategoria').value = 'cosmético';
      document.getElementById('fItemTipo').value = 'cosmético';
      document.getElementById('fItemPrecio').value = 500;
      document.getElementById('fItemNivelMin').value = 1;
      document.getElementById('fItemIcono').value = '';
      document.getElementById('fItemImagenUrl').value = '';
      document.getElementById('fItemDesc').value = '';
      document.getElementById('fItemStock').value = '';
      document.getElementById('fItemStockUsado').value = 0;
      document.getElementById('fItemCompraRepetida').checked = false;
      document.getElementById('fItemDisponible').checked = true;
      document.getElementById('fItemDuracion').value = 24;
      document.getElementById('fItemMultiplicador').value = 2;
      document.getElementById('fItemAlcance').value = 'todo';
      toggleSeccionBoost('cosmético');
      document.getElementById('btnEliminarItem').style.display = 'none';
      abrirModal('modalItem');
    });

    // Toggle sección boost al cambiar tipo
    var fItemTipo = document.getElementById('fItemTipo');
    if (fItemTipo) fItemTipo.addEventListener('change', function () {
      toggleSeccionBoost(this.value);
    });

    // Eliminar ítem
    var btnEliminarItem = document.getElementById('btnEliminarItem');
    if (btnEliminarItem) btnEliminarItem.addEventListener('click', eliminarItem);

    // Guardar — ítem
    var btnGuardarItem = document.getElementById('btnGuardarItem');
    if (btnGuardarItem) btnGuardarItem.addEventListener('click', guardarItem);

    var btnNuevoProfesor = document.getElementById('btnNuevoProfesor');
    if (btnNuevoProfesor) btnNuevoProfesor.addEventListener('click', function () {
      document.getElementById('modalProfesorTitulo').textContent = 'Nuevo Profesor';
      document.getElementById('fProfesorClerkId').value = '';
      document.getElementById('fProfesorNombre').value = '';
      document.getElementById('fProfesorEmail').value = '';
      document.getElementById('fProfesorClerkIdInput').value = '';
      document.querySelectorAll('#gradosCheckGrid input').forEach(function (cb) { cb.checked = false; });
      abrirModal('modalProfesor');
    });

    // Guardar — evaluación (sin endpoint aún)
    var btnGuardarEval = document.getElementById('btnGuardarEval');
    if (btnGuardarEval) btnGuardarEval.addEventListener('click', function () {
      toast('Módulo de evaluaciones próximamente', 'info');
      cerrarModal('modalEval');
    });

    // Guardar — monedas
    var btnConfirmarMonedas = document.getElementById('btnConfirmarMonedas');
    if (btnConfirmarMonedas) btnConfirmarMonedas.addEventListener('click', guardarMonedas);

    // Guardar — misión
    var btnGuardarMision = document.getElementById('btnGuardarMision');
    if (btnGuardarMision) btnGuardarMision.addEventListener('click', guardarMision);

    // Guardar — ítem (binding ya cargado arriba junto a btnNuevoItem)

    // Guardar — profesor
    var btnGuardarProfesor = document.getElementById('btnGuardarProfesor');
    if (btnGuardarProfesor) btnGuardarProfesor.addEventListener('click', guardarProfesor);

    // Guardar — editar alumno
    var btnGuardarAlumno = document.getElementById('btnGuardarAlumno');
    if (btnGuardarAlumno) btnGuardarAlumno.addEventListener('click', guardarAlumno);
  }

  // ------------------------------------------------
  // GUARDAR — monedas
  // ------------------------------------------------
  function guardarMonedas() {
    var clerk_id_alumno = document.getElementById('fMonedasAlumno').value;
    var cantidad = Number(document.getElementById('fMonedasCantidad').value);
    var motivo = document.getElementById('fMonedasMotivo').value;

    if (!clerk_id_alumno || !cantidad || cantidad <= 0) {
      toast('Completa todos los campos', 'warning');
      return;
    }
    apiPost({ action: 'dar_monedas', clerk_id_alumno: clerk_id_alumno, cantidad: cantidad, motivo: motivo })
      .then(function (data) {
        toast('Se dieron ' + data.monedas + ' monedas a ' + data.alumno, 'coins');
        cerrarModal('modalMonedas');
        cargarAlumnos();
        cargarTransacciones();
      }).catch(function () {
        toast('Error al dar monedas', 'error');
      });
  }

  // ------------------------------------------------
  // GUARDAR — misión
  // ------------------------------------------------
  function guardarMision() {
    var id = document.getElementById('fMisionId').value;
    var tipo = document.getElementById('fMisionTipo').value.trim();
    var descripcion = document.getElementById('fMisionDesc').value.trim();
    var icono = document.getElementById('fMisionIcono').value.trim();
    var recompensa = Number(document.getElementById('fMisionRecompensa').value);
    var xp = Number(document.getElementById('fMisionXP').value);

    if (!tipo || !descripcion) { toast('Completa tipo y descripción', 'warning'); return; }

    var promesa = id
      // Al editar: solo icono y recompensas son modificables (tipo/desc son fijos)
      ? apiPut({ action: 'editar_mision', id: id, icono: icono, recompensa_base: recompensa, recompensa_xp: xp })
      : apiPost({ action: 'crear_mision', tipo: tipo, descripcion: descripcion, icono: icono, recompensa_base: recompensa, recompensa_xp: xp });

    promesa.then(function () {
      // Restaurar campos a editables para la próxima vez que se cree una misión
      document.getElementById('fMisionTipo').readOnly = false;
      document.getElementById('fMisionDesc').readOnly = false;
      toast(id ? 'Misión actualizada' : 'Misión creada', 'success');
      cerrarModal('modalMision');
      cargarBancoMisiones();
    }).catch(function () {
      toast('Error al guardar misión', 'error');
    });
  }

  // ------------------------------------------------
  // GUARDAR — ítem tienda
  // ------------------------------------------------
  function guardarItem() {
    var id = document.getElementById('fItemId').value;
    var nombre = document.getElementById('fItemNombre').value.trim();
    var categoria = document.getElementById('fItemCategoria').value;
    var tipo = document.getElementById('fItemTipo').value;
    var precio = Number(document.getElementById('fItemPrecio').value);
    var nivelMin = Number(document.getElementById('fItemNivelMin').value) || 1;
    var icono = document.getElementById('fItemIcono').value.trim();
    var imagenUrl = document.getElementById('fItemImagenUrl').value.trim();
    var descripcion = document.getElementById('fItemDesc').value.trim();
    var stockVal = document.getElementById('fItemStock').value;
    var stock = stockVal === '' ? null : Number(stockVal);
    var compraRep = document.getElementById('fItemCompraRepetida').checked;
    var disponible = document.getElementById('fItemDisponible').checked;
    var duracion = tipo === 'activable' ? Number(document.getElementById('fItemDuracion').value) || 24 : null;
    var multi = tipo === 'activable' ? Number(document.getElementById('fItemMultiplicador').value) || 2 : null;
    var alcance = tipo === 'activable' ? document.getElementById('fItemAlcance').value : null;

    if (!nombre || !precio) { toast('Completa nombre y precio', 'warning'); return; }

    var payload = {
      action: id ? 'editar_item' : 'crear_item',
      id: id || undefined,
      nombre: nombre, categoria: categoria, tipo: tipo,
      precio: precio, nivel_minimo: nivelMin,
      emoji: icono, imagen_url: imagenUrl || null,
      descripcion: descripcion,
      stock: stock, compra_repetida: compraRep,
      disponible: disponible,
      duracion_horas: duracion, multiplicador: multi, alcance: alcance
    };

    var req = id ? apiPut(payload) : apiPost(payload);
    req.then(function () {
      toast(id ? 'Ítem actualizado ✅' : 'Ítem creado ✅', 'success');
      cerrarModal('modalItem');
      cargarTiendaAdmin();
    }).catch(function () {
      toast('Error al guardar ítem', 'error');
    });
  }

  // ELIMINAR — ítem tienda
  // ------------------------------------------------
  function eliminarItem() {
    var id = document.getElementById('fItemId').value;
    var nombre = document.getElementById('fItemNombre').value || 'este ítem';
    if (!id) return;
    if (!confirm('¿Eliminar "' + nombre + '" permanentemente de la BD?\nEsta acción no se puede deshacer.')) return;

    apiPost({ action: 'eliminar_item', id: id })
      .then(function () {
        toast('Ítem eliminado', 'success');
        cerrarModal('modalItem');
        cargarTiendaAdmin();
      }).catch(function () {
        toast('Error al eliminar ítem', 'error');
      });
  }

  // ------------------------------------------------
  // GUARDAR — profesor
  // ------------------------------------------------
  function guardarProfesor() {
    var clerk_id = document.getElementById('fProfesorClerkIdInput').value.trim();
    var nombre = document.getElementById('fProfesorNombre').value.trim();
    var email = document.getElementById('fProfesorEmail').value.trim();
    var grados = [];
    document.querySelectorAll('#gradosCheckGrid input:checked').forEach(function (cb) {
      grados.push(Number(cb.value));
    });

    if (!clerk_id || !nombre || !email) {
      toast('Completa todos los campos obligatorios', 'warning');
      return;
    }
    apiPost({ action: 'crear_profesor', clerk_id: clerk_id, nombre: nombre, email: email, grados: grados })
      .then(function () {
        toast('Profesor creado', 'success');
        cerrarModal('modalProfesor');
        cargarProfesores();
      }).catch(function () {
        toast('Error al crear profesor', 'error');
      });
  }

  // ------------------------------------------------
  // EDITAR ALUMNO
  // ------------------------------------------------
  function abrirEditarAlumno(clerkId) {
    var a = alumnos.find(function (x) { return x.clerk_id === clerkId; });
    if (!a) return;

    document.getElementById('fAlumnoClerkId').value = a.clerk_id;
    document.getElementById('fAlumnoNombre').value = a.nombre || '';
    document.getElementById('fAlumnoGrado').value = a.grado_actual || 1;
    document.getElementById('fAlumnoRacha').value = a.racha_dias || 0;
    document.getElementById('fAlumnoMonedas').value = a.monedas || 0;
    document.getElementById('fAlumnoAvatar').value = a.avatar_base || '🐰';

    // Construir grid de avatares
    var grid = document.getElementById('avatarSelectorGrid');
    if (grid) {
      grid.innerHTML = AVATARES.map(function (emoji) {
        var activo = emoji === (a.avatar_base || '🐰');
        return '<button type="button" ' +
          'style="font-size:1.4rem;background:' + (activo ? 'rgba(250,204,21,.25)' : 'rgba(255,255,255,.06)') + ';' +
          'border:2px solid ' + (activo ? '#facc15' : 'transparent') + ';' +
          'border-radius:8px;padding:.2rem .3rem;cursor:pointer;" ' +
          'data-av="' + emoji + '">' + emoji + '</button>';
      }).join('');

      grid.querySelectorAll('[data-av]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('fAlumnoAvatar').value = btn.dataset.av;
          grid.querySelectorAll('[data-av]').forEach(function (b) {
            var sel = b.dataset.av === btn.dataset.av;
            b.style.background = sel ? 'rgba(250,204,21,.25)' : 'rgba(255,255,255,.06)';
            b.style.borderColor = sel ? '#facc15' : 'transparent';
          });
        });
      });
    }

    abrirModal('modalEditarAlumno');
  }

  function guardarAlumno() {
    var clerk_id = document.getElementById('fAlumnoClerkId').value;
    var nombre = document.getElementById('fAlumnoNombre').value.trim();
    var grado_actual = Number(document.getElementById('fAlumnoGrado').value);
    var racha_dias = Number(document.getElementById('fAlumnoRacha').value);
    var monedas = Number(document.getElementById('fAlumnoMonedas').value);
    var avatar_base = document.getElementById('fAlumnoAvatar').value;

    if (!nombre) { toast('El nombre no puede estar vacío', 'warning'); return; }

    apiPut({
      action: 'editar_alumno',
      clerk_id: clerk_id,
      nombre: nombre,
      grado_actual: grado_actual,
      racha_dias: racha_dias,
      monedas: monedas,
      avatar_base: avatar_base,
    }).then(function () {
      toast('Alumno actualizado', 'success');
      cerrarModal('modalEditarAlumno');
      cargarAlumnos();
    }).catch(function () {
      toast('Error al guardar alumno', 'error');
    });
  }

  // ------------------------------------------------
  // Helpers internos
  // ------------------------------------------------
  function setTextoLocal(id, valor) {
    var el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Exponer funciones globales necesarias fuera del closure
  window._adminRenderAlumnos = function () { renderTablaAlumnos(); };

})();
// ─── MODAL ENTREGA (globales para onclick inline) ─────────────────
function abrirModalEntrega(invId, itemNombre, alumnoNombre, emoji) {
  document.getElementById('entregaInvId').value = invId;
  document.getElementById('entregaItem').value = (emoji || '🎁') + ' ' + (itemNombre || '');
  document.getElementById('entregaAlumno').value = alumnoNombre || '';
  document.getElementById('entregaAdmin').value = window._adminNombre || 'Administrador';
  document.getElementById('entregaNota').value = '';
  var modal = document.getElementById('modalEntrega');
  modal.style.display = 'flex';
}

function cerrarModalEntrega() {
  document.getElementById('modalEntrega').style.display = 'none';
}

function confirmarEntrega() {
  var invId = document.getElementById('entregaInvId').value;
  var nota = document.getElementById('entregaNota').value.trim();
  if (!invId) return;

  var btn = document.querySelector('#modalEntrega button[onclick="confirmarEntrega()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  fetch(BASE_URL + '/api/admin', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify({ action: 'marcar_entregado', inventario_id: invId, nota: nota })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.mensaje || 'Error');
      cerrarModalEntrega();
      toast('✅ Entrega registrada correctamente', 'success');
      // Recargar lista de canjes
      setTimeout(function () { cargarCanjesPendientesGlobal(); }, 400);
    })
    .catch(function (e) {
      toast('❌ Error: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar entrega'; }
    });
}

// Exponer para poder recargar desde confirmarEntrega
function cargarCanjesPendientesGlobal() {
  fetch(BASE_URL + '/api/admin?action=canjes_pendientes', {
    credentials: 'include',
    headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var canjes = data.canjes || [];
      var seccion = document.getElementById('seccionCanjes');
      var badge = document.getElementById('badgeCanjes');
      var lista = document.getElementById('canjesLista');
      var count = document.getElementById('canjesCount');
      if (!seccion || !lista) return;
      if (canjes.length === 0) {
        seccion.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
      }
      seccion.style.display = 'block';
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = canjes.length; }
      if (count) { count.textContent = canjes.length; }
      lista.innerHTML = canjes.map(function (c) {
        var diff = (Date.now() - new Date(c.created_at).getTime()) / 1000;
        var hace = diff < 3600 ? 'Hace ' + Math.round(diff / 60) + ' min'
          : diff < 86400 ? 'Hace ' + Math.round(diff / 3600) + 'h'
            : 'Hace ' + Math.round(diff / 86400) + ' día(s)';
        return '<div class="canje-row-admin">' +
          '<div class="canje-avatar-admin">👤</div>' +
          '<div class="canje-info-admin">' +
          '<div class="canje-nombre-admin">' + (c.alumno_nombre || 'Alumno') + '</div>' +
          '<div class="canje-sub-admin">' + (c.emoji || '🎁') + ' ' + (c.item_nombre || '') + ' · ' + Number(c.precio_pagado).toLocaleString('es-CL') + ' EC</div>' +
          '<div class="canje-fecha-admin">⏰ ' + hace + '</div>' +
          '</div>' +
          '<button class="btn-entregar-admin" onclick="abrirModalEntrega(\'' + c.id + '\',\'' + (c.item_nombre || '').replace(/'/g, "\\'") + '\',\'' + (c.alumno_nombre || '').replace(/'/g, "\\'") + '\',\'' + (c.emoji || '🎁') + '\')">✅ Entregar</button>' +
          '</div>';
      }).join('');
    }).catch(function () { });
}

// ─── MODAL EVALUACIÓN ADMIN (globales para onclick inline) ─────────
function abrirModalEvalAdmin(eval_data) {
  var modal = document.getElementById('modalEvalAdmin');
  var titulo = document.getElementById('modalEvalAdminTitulo');
  if (!modal) return;

  // Limpiar
  document.getElementById('evalAdminId').value = eval_data ? eval_data.id : '';
  document.getElementById('evalAdminAsig').value = eval_data ? (eval_data.asignatura || '') : '';
  document.getElementById('evalAdminFecha').value = eval_data ? ((eval_data.fecha_evaluacion || '').split('T')[0]) : '';
  document.getElementById('evalAdminTipo').value = eval_data ? (eval_data.tipo_evaluacion || 'prueba') : 'prueba';
  document.getElementById('evalAdminGrado').value = eval_data ? (eval_data.grado_destinatario || '') : '';
  document.getElementById('evalAdminDesc').value = eval_data ? (eval_data.descripcion || '') : '';

  if (titulo) titulo.textContent = eval_data ? '✏️ Editar Evaluación' : '📅 Nueva Evaluación';

  // Cargar colegios en el selector
  var selColegio = document.getElementById('evalAdminColegio');
  if (selColegio) {
    selColegio.innerHTML = '<option value="">Cargando...</option>';
    fetch(BASE_URL + '/api/admin?action=colegios', {
      credentials: 'include',
      headers: { 'Authorization': 'Bearer ' + window.CLERK_TOKEN }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var colegios = data.colegios || [];
        selColegio.innerHTML = '<option value="">Selecciona colegio...</option>' +
          colegios.map(function (c) {
            var sel = eval_data && eval_data.colegio_id === c.id ? ' selected' : '';
            return '<option value="' + c.id + '"' + sel + '>' + c.nombre + '</option>';
          }).join('');
      })
      .catch(function () {
        selColegio.innerHTML = '<option value="">Error cargando colegios</option>';
      });
  }

  modal.style.display = 'flex';
}

function cerrarModalEvalAdmin() {
  var modal = document.getElementById('modalEvalAdmin');
  if (modal) modal.style.display = 'none';
}

function guardarEvalAdmin() {
  var id = document.getElementById('evalAdminId').value;
  var asig = document.getElementById('evalAdminAsig').value;
  var fecha = document.getElementById('evalAdminFecha').value;
  var tipo = document.getElementById('evalAdminTipo').value;
  var grado = document.getElementById('evalAdminGrado').value;
  var desc = document.getElementById('evalAdminDesc').value.trim();

  if (!asig || !fecha) {
    alert('Asignatura y Fecha son obligatorias');
    return;
  }

  var btn = document.getElementById('btnGuardarEvalAdmin');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  var colegio_id = document.getElementById('evalAdminColegio')
    ? document.getElementById('evalAdminColegio').value || null
    : STATE.colegioId || null;

  if (!colegio_id) {
    alert('Selecciona un colegio');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Evaluación'; }
    return;
  }

  var body = {
    action: id ? 'editar_evaluacion' : 'crear_evaluacion',
    asignatura: asig,
    fecha_evaluacion: fecha,
    tipo_evaluacion: tipo,
    grado: grado ? Number(grado) : null,
    colegio_id: colegio_id,
    descripcion: desc || null,
  };
  if (id) body.id = id;

  var method = id ? 'PUT' : 'POST';

  fetch(BASE_URL + '/api/admin', {
    method: method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify(body)
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.mensaje || 'Error');
      cerrarModalEvalAdmin();
      toast((id ? '✏️' : '📅') + ' Evaluación ' + (id ? 'actualizada' : 'creada') + ' correctamente', 'success');
      // Recargar lista
      fetch(BASE_URL + '/api/admin?action=evaluaciones_admin', {
        credentials: 'include',
        headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (window._evalsAdminRef) window._evalsAdminRef(d.evaluaciones || []);
      }).catch(function () { });
      // Recargar via la función interna si disponible
      setTimeout(function () {
        var el = document.getElementById('evalAdminLista');
        if (el) el.innerHTML = '<p style="color:var(--text-dim);padding:1rem;">Actualizando...</p>';
        fetch(BASE_URL + '/api/admin?action=evaluaciones_admin', {
          credentials: 'include',
          headers: { ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {}) }
        }).then(function (r) { return r.json(); }).then(function (d) {
          // Setear en scope closure no es posible directamente, disparar tab reload
          document.querySelector('[data-tab="evaluaciones"]') &&
            document.querySelector('[data-tab="evaluaciones"]').click();
        }).catch(function () { });
      }, 300);
    })
    .catch(function (e) {
      toast('❌ Error: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Evaluación'; }
    });
}

function eliminarEvalAdmin(id) {
  if (!confirm('¿Eliminar esta evaluación? Los alumnos ya no la verán en su calendario.')) return;
  fetch(BASE_URL + '/api/admin', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(window.CLERK_TOKEN ? { 'Authorization': 'Bearer ' + window.CLERK_TOKEN } : {})
    },
    body: JSON.stringify({ action: 'eliminar_evaluacion', id: id })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.mensaje);
      toast('🗑️ Evaluación eliminada', 'success');
      setTimeout(function () {
        document.querySelector('[data-tab="evaluaciones"]') &&
          document.querySelector('[data-tab="evaluaciones"]').click();
      }, 300);
    })
    .catch(function (e) { toast('❌ ' + e.message, 'error'); });
}