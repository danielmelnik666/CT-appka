/**
 * FloraGuard — History Component
 *
 * Backend GET /api/history vracia:
 * { count: N, detections: [ {id, image_name, is_invasive, confidence_percent, message, timestamp, client_ip} ] }
 *
 * apiHistory() v api.js to normalizuje na pole detections[].
 * Dopĺňame aj lokálnu históriu z localStorage.
 */

async function loadHistoryPage() {
    const container = document.getElementById('history-content');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-inline">
            <div class="spinner-sm"></div>
            <span>Načítavam históriu…</span>
        </div>`;

    try {
        // Načítaj z backendu (pole detection objektov)
        let items = await apiHistory();

        // Zoraď podľa dátumu zostupne
        items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (!items || items.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }

        container.innerHTML = `<div class="history-grid">${items.map(renderHistoryCard).join('')}</div>`;

    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Chyba načítavania</h3>
                <p>${err.message || 'Nepodarilo sa načítať históriu.'}</p>
                <button class="btn btn-outline" onclick="loadHistoryPage()">Skúsiť znova</button>
            </div>`;
    }
}

/**
 * Renderuje jeden riadok histórie.
 * Polia z backendu: id, image_name, is_invasive, confidence_percent, message, timestamp, client_ip
 */
function renderHistoryCard(item) {
    const date = new Date(item.timestamp).toLocaleString('sk-SK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const conf = Math.round(item.confidence_percent ?? 0);
    const isInvasive = item.is_invasive;
    const fileName = item.image_name || 'neznámy súbor';
    // Skrátime dlhé názvy súborov
    const displayName = fileName.length > 30 ? fileName.slice(0, 28) + '…' : fileName;

    return `
        <div class="history-card ${isInvasive ? 'hc-invasive' : 'hc-safe'}">
            <div class="history-thumb-placeholder">
                ${item.image_url
                ? `<img src="${item.image_url}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
                : (isInvasive ? '⚠️' : '🌿')
            }
            </div>
            <div class="history-info">
                <h3>${isInvasive ? 'Invázny druh' : 'Bezpečný druh'}</h3>
                <div class="history-filename">${displayName}</div>
                <div class="history-meta">
                    <span class="risk-badge ${isInvasive ? 'risk-high' : 'risk-none'}">
                        ${isInvasive ? 'Invázny' : 'Bezpečný'}
                    </span>
                    <span class="history-date">🕐 ${date}</span>
                </div>
                <div class="history-message">${item.message || ''}</div>
            </div>
            <div class="history-status">
                <span class="history-conf-num">${conf}%</span>
                <span class="history-conf-label">istota</span>
            </div>
        </div>`;
}

function renderEmptyState() {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">🌱</div>
            <h3>Žiadne detekcie zatiaľ</h3>
            <p>Spustite svoju prvú analýzu rastliny a výsledok sa objaví tu.</p>
            <button class="btn btn-primary" data-page="detect">Analyzovať fotografiu</button>
        </div>`;
}
