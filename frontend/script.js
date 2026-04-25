/**
 * FloraGuard — Main Application Script
 * SPA router + inicializácia stránok
 *
 * Komunikuje s backendom cez services/api.js:
 *   apiDetect(file)  → POST /api/predict
 *   apiHistory()     → GET  /api/history  (normalizované na pole)
 *   apiPing()        → GET  /api/ping
 *   apiInfo()        → GET  /api/info
 */

const PAGES = ['home', 'detect', 'history', 'about'];

// ── Router ────────────────────────────────────────────────────

function showPage(pageId) {
    if (!PAGES.includes(pageId)) pageId = 'home';

    PAGES.forEach(id => {
        const el = document.getElementById(`page-${id}`);
        if (el) el.classList.toggle('active', id === pageId);
    });

    // Aktívny stav v navigácii
    document.querySelectorAll('[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    // Stránkovo-špecifická inicializácia
    if (pageId === 'history') loadHistoryPage();
    if (pageId === 'detect') checkSystemStatus();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delegácia všetkých data-page kliknutí
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-page]');
    if (!target) return;
    e.preventDefault();
    const page = target.dataset.page;
    if (page) showPage(page);
});

// ── Systémový status (sidebar na Detect stránke) ──────────────

async function checkSystemStatus() {
    await checkBackendStatus();
}

async function checkBackendStatus() {
    const backendEl = document.getElementById('sidebar-backend-status');
    const dbEl      = document.getElementById('sidebar-db-status');
    const aiEl      = document.getElementById('sidebar-ai-status');

    if (!backendEl) return;

    // 1. Ping backendu
    const backendOk = await apiPing();
    backendEl.textContent = backendOk ? 'Online' : 'Offline';
    backendEl.className = 'status-badge ' + (backendOk ? 'ok' : 'error');

    if (!backendOk) {
        if (dbEl) { dbEl.textContent = '—'; dbEl.className = 'status-badge pending'; }
        if (aiEl) { aiEl.textContent = '—'; aiEl.className = 'status-badge pending'; }
        return;
    }

    // 2. Info endpoint → stav DB
    if (dbEl) {
        const info = await apiInfo();
        if (info && info.database_connected !== undefined) {
            dbEl.textContent = info.database_connected ? 'Online' : 'Offline';
            dbEl.className = 'status-badge ' + (info.database_connected ? 'ok' : 'error');
        } else {
            dbEl.textContent = 'Neznáme';
            dbEl.className = 'status-badge pending';
        }
    }

    // AI status sa aktualizuje po úspešnej predikcii (v uploader.js)
    if (aiEl && aiEl.textContent === '—') {
        aiEl.textContent = 'Závisí od predikcie';
        aiEl.className = 'status-badge pending';
    }
}

// Exponuj pre uploader.js
function updateAiStatus(ok) {
    const el = document.getElementById('sidebar-ai-status');
    if (!el) return;
    el.textContent = ok ? 'Online' : 'Chyba';
    el.className = 'status-badge ' + (ok ? 'ok' : 'error');
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 FloraGuard — aplikácia spustená');
    console.log('Backend URL:', window.FLORA_API_URL || 'https://invasive-plants-backend-dm.azurewebsites.net');

    showPage('home');

    // Background check hneď po načítaní
    setTimeout(checkBackendStatus, 800);
});
