import { initReactPrivy } from './privy-react.js';

window.updateAuthUI = function(user) {
  const btn = document.getElementById('tb-login-btn');
  const profileBtn = document.querySelector('.tb-profile-btn');
  if (user) {
    if (btn) btn.style.display = 'none';
    if (profileBtn) profileBtn.style.display = 'flex';
    window.loadProfileDashboard();
    
    // Initialize realtime notifications
    if (window.initPusher) window.initPusher(user.id);
  } else {
    if (btn) btn.style.display = 'flex';
    if (profileBtn) profileBtn.style.display = 'none';
  }

  // Load global BC stats
  loadGlobalStats();
};

// Function to load global stats
async function loadGlobalStats() {
  try {
    const res = await fetch('/api/bantahbro/global-stats');
    if (!res.ok) throw new Error('Failed to fetch global stats');
    const data = await res.json();
    
    const bcEl = document.getElementById('tb-treasury');
    if (bcEl) {
      bcEl.innerHTML = `${data.globalBC.toLocaleString()} BC <span class="tb-chest">📦</span>`;
    }
    
    const fightersEl = document.getElementById('tb-global-fighters');
    if (fightersEl) {
      fightersEl.innerHTML = `${data.globalFighters.toLocaleString()} <span class="live-badge">LIVE</span>`;
    }
  } catch (error) {
    console.error('Error loading global stats:', error);
  }
}

// ----------------------------------------------------
// UI Render Functions
// ----------------------------------------------------

export async function fetchWithAuth(url, options = {}) {
  if (!window.privyGetAccessToken) throw new Error('Privy not initialized');
  const token = await window.privyGetAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  
  return fetch(url, { ...options, headers });
}

export async function loadProfileDashboard() {
  try {
    const res = await fetchWithAuth('/api/bantahbro/profile');
    if (!res.ok) throw new Error('Failed to load profile');
    const data = await res.json();
    renderProfile(data);
  } catch (err) {
    console.error(err);
  }
}
window.loadProfileDashboard = loadProfileDashboard;

function renderProfile(data) {
  const page = document.getElementById('page-profile');
  if (!page) return;

  // Update Stats
  const bcStat = document.getElementById('prof-stat-bc');
  if (bcStat) bcStat.textContent = data.balance;

  const agentsStat = document.getElementById('prof-stat-agents');
  if (agentsStat) agentsStat.textContent = data.fighterFeed.profiles.length;

  const queueStat = document.getElementById('prof-stat-queue');
  if (queueStat) queueStat.textContent = data.queueFeed.battles.length;

  const usdcStat = document.getElementById('prof-stat-usdc');
  if (usdcStat) usdcStat.textContent = '$' + (data.earnedUSDC || 0).toFixed(2);

  const bantcStat = document.getElementById('prof-stat-bantc');
  if (bantcStat) bantcStat.textContent = (data.bantcClaim || 0).toLocaleString();

  // Update Agents Panel
  const agentsPanel = document.getElementById('prof-panel-my-agents');
  if (agentsPanel) {
    if (data.fighterFeed && data.fighterFeed.profiles.length > 0) {
      let html = '<div class="prof-fighters" style="display:flex;gap:15px;flex-wrap:wrap;padding:20px;">';
      data.fighterFeed.profiles.forEach(f => {
        html += `<div class="prof-fighter-card" style="background:#2a2a2a;border:1px solid #444;border-radius:10px;padding:15px;text-align:center;width:150px;">
          <img src="${f.avatar_url || 'images/fighters/char04/portrait.png'}" style="width:100px;height:100px;object-fit:cover;border-radius:5px;margin-bottom:10px;" />
          <h3 style="margin:0;font-size:16px;">${f.display_name || 'Agent'}</h3>
          <p style="margin:5px 0 0;font-size:12px;color:#aaa;">Wins: ${f.wins || 0} | Losses: ${f.losses || 0}</p>
        </div>`;
      });
      html += '</div>';
      agentsPanel.innerHTML = html;
    } else {
      // Keep empty state
      agentsPanel.innerHTML = `<div class="prof-empty">
          <div class="prof-empty-icon">🤖</div>
          <div class="prof-empty-title">No agents yet</div>
          <div class="prof-empty-body">Import a fighter or connect a wallet with eligible assets to get your first agent.</div>
          <button class="prof-cta-btn" onclick="closePage();openPage('create')">+ Import Agent</button>
      </div>`;
    }
  }

  // Update Battle History Panel
  const historyPanel = document.getElementById('prof-panel-battle-history');
  if (historyPanel) {
    if (data.battleHistory && data.battleHistory.length > 0) {
      let html = '<div style="padding:20px; display:flex; flex-direction:column; gap:10px;">';
      data.battleHistory.forEach(b => {
        html += `<div style="background:#222; border:1px solid #333; padding:10px; border-radius:5px;">
          <h4 style="margin:0 0 5px; color:#fff;">Battle vs ${b.loser_agent_id || 'Unknown'}</h4>
          <p style="margin:0; font-size:12px; color:#aaa;">Result: ${b.winner_agent_id ? 'Won' : 'Lost'} | Rounds: ${b.rounds || 0}</p>
        </div>`;
      });
      html += '</div>';
      historyPanel.innerHTML = html;
    } else {
      historyPanel.innerHTML = `<div class="prof-empty"><div class="prof-empty-icon">⚔️</div><div class="prof-empty-title">No battle history</div></div>`;
    }
  }

  // Update Packs Panel
  const packsPanel = document.getElementById('prof-panel-packs');
  if (packsPanel) {
    if (data.packs && data.packs.length > 0) {
      let html = '<div style="padding:20px; display:flex; gap:10px; flex-wrap:wrap;">';
      data.packs.forEach(p => {
        html += `<div style="background:#2a2a2a; border:1px solid #444; padding:15px; border-radius:10px; width:120px; text-align:center;">
          <div style="font-size:30px; margin-bottom:10px;">📦</div>
          <h4 style="margin:0; color:#fff; font-size:14px;">Pack #${p.pack_instance_id ? p.pack_instance_id.substring(0,4) : 'X'}</h4>
        </div>`;
      });
      html += '</div>';
      packsPanel.innerHTML = html;
    } else {
      packsPanel.innerHTML = `<div class="prof-empty"><div class="prof-empty-icon">📦</div><div class="prof-empty-title">No packs owned</div></div>`;
    }
  }

  // Update Runes Panel
  const runesPanel = document.getElementById('prof-panel-runes');
  if (runesPanel) {
    if (data.runes && data.runes.length > 0) {
      let html = '<div style="padding:20px; display:flex; gap:10px; flex-wrap:wrap;">';
      data.runes.forEach(r => {
        html += `<div style="background:#2a2a2a; border:1px solid #444; padding:15px; border-radius:10px; width:120px; text-align:center;">
          <div style="font-size:30px; margin-bottom:10px;">🔮</div>
          <h4 style="margin:0; color:#fff; font-size:14px;">Rune</h4>
        </div>`;
      });
      html += '</div>';
      runesPanel.innerHTML = html;
    } else {
      runesPanel.innerHTML = `<div class="prof-empty"><div class="prof-empty-icon">🔮</div><div class="prof-empty-title">No runes owned</div></div>`;
    }
  }
}

// Initialize React Privy immediately since type="module" is deferred
initReactPrivy();

export async function loadLeaderboard() {
  try {
    const token = await window.privyGetAccessToken();
    const res = await fetch('/api/bantahbro/leaderboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const data = await res.json();
    renderLeaderboard(data.leaderboard);
  } catch (err) {
    console.error('Error loading leaderboard:', err);
  }
}

async function loadAgentsList() {
  try {
    const token = await window.privyGetAccessToken();
    const res = await fetch('/api/bantahbro/leaderboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch agents list');
    const data = await res.json();
    renderAgentsGrid(data.leaderboard);
  } catch (err) {
    console.error('Error loading agents list:', err);
  }
}
window.loadAgentsList = loadAgentsList;

function renderAgentsGrid(agents) {
  const grid = document.getElementById('ag-grid');
  if (!grid) return;

  if (!agents || agents.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:40px;">No agents found.</div>';
    return;
  }

  let html = '';
  agents.forEach((agent, i) => {
    const rank = i + 1;
    const wins = parseInt(agent.wins || 0);
    const losses = parseInt(agent.losses || 0);
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : '0%';
    const wallet = agent.wallet_address || '0x000...0000';
    const shortWallet = wallet.substring(0,6) + '...' + wallet.slice(-4);
    
    // Fallbacks
    const name = agent.display_name || agent.agent_id || 'Unknown';
    const level = Math.max(1, agent.fame_score || 0);
    
    // Status (mock logic since real status isn't in DB yet)
    let statusClass = 'idle';
    let statusLabel = '💤 IDLE';
    let bgGradient = 'linear-gradient(160deg,#1a0a2e,#4a1b7e,#1a0a2e)';
    if (rank === 1) { statusClass = 'king'; statusLabel = '👑 KING'; bgGradient = 'linear-gradient(160deg,#1a0a2e,#3d1b7e,#1a0a2e)'; }
    else if (rank % 3 === 0) { statusClass = 'queue'; statusLabel = '⏳ QUEUE'; bgGradient = 'linear-gradient(160deg,#2e2a0a,#7e6e1b,#2e2a0a)'; }

    html += `
      <div class="ag-card" data-status="${statusClass}" data-name="${name.toLowerCase()}">
          <div class="ag-card-header" style="background:${bgGradient}">
              <span class="ag-status-badge ag-badge-${statusClass}">${statusLabel}</span>
              <div class="ag-rank">#${rank} <span class="ag-rank-price gold">${(agent.bc_earned || 0).toLocaleString()} BC</span></div>
              <img src="${agent.avatar_url || 'images/fighters/char04/left/stand/0.png'}" class="ag-sprite" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
              <div class="ag-sprite-fallback" style="display:none">🤖</div>
          </div>
          <div class="ag-card-body">
              <div class="ag-card-title-row">
                  <div>
                      <div class="ag-name">${name}</div>
                      <div class="ag-meta">Lv ${level} · ${shortWallet}</div>
                  </div>
                  <div class="ag-pwr-chip">
                      <span class="ag-pwr-val">${wins * 10}</span>
                      <span class="ag-pwr-label">PWR</span>
                  </div>
              </div>
              <div class="ag-stats">
                  <div class="ag-stat-box"><div class="ag-stat-val gold">${wins}</div><div class="ag-stat-lbl">WINS</div></div>
                  <div class="ag-stat-box"><div class="ag-stat-val">${losses}</div><div class="ag-stat-lbl">LOSSES</div></div>
              </div>
              <div class="ag-winbar-wrap">
                  <div class="ag-winbar-label"><span>Win Rate</span><span>${winRate}</span></div>
                  <div class="ag-winbar-track"><div class="ag-winbar-fill" style="width:${winRate}"></div></div>
              </div>
              <button class="ag-challenge-btn" onclick="openChallengeModal('${name}','${agent.agent_id}','${statusLabel}')">⚔ Challenge</button>
          </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}
window.loadLeaderboard = loadLeaderboard;

function renderLeaderboard(leaderboard) {
  const tbody = document.querySelector('.lb-table tbody');
  if (!tbody) return;
  
  if (!leaderboard || leaderboard.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No leaderboard data available yet.</td></tr>';
    return;
  }

  let html = '';
  leaderboard.forEach((agent, index) => {
    const rank = index + 1;
    let rankBadge = rank;
    if (rank === 1) rankBadge = '🥇';
    else if (rank === 2) rankBadge = '🥈';
    else if (rank === 3) rankBadge = '🥉';

    const winPercent = (agent.wins + agent.losses > 0) ? ((agent.wins / (agent.wins + agent.losses)) * 100).toFixed(1) : 0;
    
    html += `<tr class="lb-row">
      <td class="lb-rank">${rankBadge}</td>
      <td class="lb-fighter">
        <span class="lb-avatar" style="background:url('${agent.avatar_url || 'images/fighters/char04/portrait.png'}'); background-size:cover; background-position:center;"></span>
        <div><div class="lb-name">${agent.display_name || 'Unknown Fighter'}</div><div class="lb-sub">Lv ${agent.fame_score || 1}</div></div>
      </td>
      <td class="lb-owner">${(agent.wallet_address || '0x...').substring(0,8)}...</td>
      <td class="lb-num gold">${agent.wins || 0}</td>
      <td class="lb-num">${agent.losses || 0}</td>
      <td class="lb-num">${winPercent}%</td>
      <td class="lb-num gold">${(agent.bc_earned || 0).toLocaleString()} BC</td>
      <td class="lb-num">${agent.fame_score || 0}</td>
      <td class="lb-status"><span class="status-dot ${index % 2 === 0 ? 'idle' : 'live'}"></span> ${index % 2 === 0 ? 'Idle' : 'Fighting'}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

// Pusher Realtime Notifications
let _pusher = null;
window.initPusher = function(userId) {
  if (window.Pusher && !_pusher) {
    _pusher = new Pusher('decd2cca5e39cf0cbcd4', {
      cluster: 'mt1'
    });
    const channel = _pusher.subscribe('user-' + userId);
    channel.bind('notification', function(data) {
      showToastNotification(data);
    });
  }
};

function showToastNotification(data) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <div style="font-size:24px;">${data.icon || '🔔'}</div>
    <div style="flex:1;">
      <h4 style="margin:0 0 5px;font-size:14px;">${data.title || 'New Notification'}</h4>
      <p style="margin:0;font-size:12px;color:#bbb;">${data.message || ''}</p>
    </div>
  `;
  
  toast.style.background = '#2a2a2a';
  toast.style.border = '1px solid #444';
  toast.style.color = '#fff';
  toast.style.padding = '15px';
  toast.style.borderRadius = '8px';
  toast.style.display = 'flex';
  toast.style.gap = '15px';
  toast.style.alignItems = 'center';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  toast.style.width = '300px';
  toast.style.transition = 'opacity 0.5s ease';
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}
// ==========================================
// DYNAMIC CHAT (TROLLBOX)
// ==========================================

let lastChatCount = 0;
let chatInterval = null;

async function loadChatMessages(initial = false) {
  try {
    const res = await fetch('/api/bantahbro/chat');
    if (!res.ok) throw new Error('Failed to fetch chat');
    const data = await res.json();
    
    // Check if we have new messages
    if (data.messages && data.messages.length > 0) {
      if (initial || data.messages.length !== lastChatCount) {
        lastChatCount = data.messages.length;
        
        // Re-render chat
        const tbMsgs = document.getElementById('trollbox-msgs');
        if (tbMsgs) {
            tbMsgs.innerHTML = ''; // clear old
            data.messages.forEach(m => {
                // Determine if it's our own message
                const own = (window.privyUser && window.privyUser.wallet && window.privyUser.wallet.address === m.wallet_address);
                if (window._tbAddMsg) {
                    window._tbAddMsg(m.user_name, m.message, own);
                }
            });
        }
      }
    }
  } catch (error) {
    console.error('Chat Error:', error);
  }
}

// Global chat sender
window.handleSendChat = async function() {
    const inp = document.getElementById('trollbox-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    
    const wallet = (window.privyUser && window.privyUser.wallet) ? window.privyUser.wallet.address : null;
    let uName = wallet ? wallet.substring(0,6) : null;
    
    // Clear input
    inp.value = '';
    
    try {
        const res = await fetch('/api/bantahbro/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_name: uName,
                wallet_address: wallet,
                message: text
            })
        });
        
        if (res.ok) {
            // Instantly fetch new chat to update UI
            await loadChatMessages();
            inp.focus();
        }
    } catch (err) {
        console.error('Failed to send chat', err);
    }
};

// Initialize chat polling
document.addEventListener('DOMContentLoaded', () => {
    // Slight delay to let static UI load
    setTimeout(() => {
        loadChatMessages(true);
        if (chatInterval) clearInterval(chatInterval);
        chatInterval = setInterval(() => loadChatMessages(false), 3000);
    }, 1000);
});


// ==========================================
// DYNAMIC CHALLENGES AND QUEUE
// ==========================================



async function loadNotifications() {
    try {
        const res = await fetch('/api/bantahbro/notifications');
        if (!res.ok) return;
        const data = await res.json();
        
        const container = document.getElementById('notif-list-container');
        if (!container) return;
        
        if (!data.notifications || data.notifications.length === 0) {
            container.innerHTML = '<div style="padding:15px; color:#888; text-align:center; font-size:12px;">No recent notifications.</div>';
            return;
        }
        
        container.innerHTML = data.notifications.map(n => {
            const timeStr = n.created_at ? new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
            return `
            <div class="notif-item">
                <div class="notif-icon">${n.icon || '??'}</div>
                <div class="notif-content">
                    <div class="notif-title">${n.title || 'System Notification'}</div>
                    <div class="notif-desc">${n.message || ''}</div>
                    <div class="notif-time">${timeStr}</div>
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadLivePredictions() {
    try {
        const res = await fetch('/api/bantahbro/battles?status=live');
        if (!res.ok) return;
        const data = await res.json();
        
        const container = document.getElementById('pred-matchups-container');
        if (!container) return;
        
        if (!data.battles || data.battles.length === 0) {
            container.innerHTML = '<div style="padding:15px; color:#888; text-align:center; font-size:12px;">No live predictions available.</div>';
            return;
        }
        
        container.innerHTML = data.battles.map(b => {
            const p1Avatar = getFighterAvatar(b.p1_agent, 'right') || 'images/fighters/char04/portrait.png';
            const p2Avatar = getFighterAvatar(b.p2_agent, 'left') || 'images/fighters/char04/portrait.png';
            const pool = b.prize_pool ? b.prize_pool : '128,450';
            
            return `
            <div class="pred-matchup" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div class="pred-fighter pred-fighter-p1">
                        <div class="pred-fighter-portrait p1-portrait" style="background:rgba(255,255,255,0.05); overflow:hidden;">
                            <img src="${p1Avatar}" alt="P1" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" onerror="this.src='images/fighters/char04/portrait.png'" />
                        </div>
                        <div class="pred-fighter-name">${b.p1_agent || 'ROBOT V1'}</div>
                        <div class="pred-fighter-pct pred-pct-blue">50%</div>
                    </div>

                    <div class="pred-vs-col">
                        <div class="pred-vs-badge">VS</div>
                    </div>

                    <div class="pred-fighter pred-fighter-p2">
                        <div class="pred-fighter-portrait p2-portrait" style="background:rgba(255,255,255,0.05); overflow:hidden;">
                            <img src="${p2Avatar}" alt="P2" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" onerror="this.src='images/fighters/char04/portrait.png'" />
                        </div>
                        <div class="pred-fighter-name">${b.p2_agent || 'FLOATROBO'}</div>
                        <div class="pred-fighter-pct pred-pct-red">50%</div>
                    </div>
                </div>

                <div class="pred-pool">POOL: ${pool} BC</div>
                
                <div class="pred-actions">
                    <button class="pred-btn pred-btn-p1">&#x2694; BACK P1</button>
                    <button class="pred-btn pred-btn-p2">BACK P2 &#x2694;</button>
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function loadChallengerQueue() {
    try {
        const res = await fetch('/api/bantahbro/battles?status=queued');
        if (!res.ok) throw new Error('Failed to fetch battles queue');
        const data = await res.json();
        
        const qList = document.getElementById('sidebar-queue-list');
        if (!qList) return;
        
        qList.innerHTML = '';
        if (data.battles.length === 0) {
            qList.innerHTML = '<div style="padding:15px; color:#888;">Queue is empty.</div>';
            return;
        }
        
        data.battles.forEach((b, i) => {
            const num = i + 1;
            const active = num <= 2;
            const html = `
                <div class="queue-item ${active ? 'queue-active' : 'queue-waiting'}">
                    <div class="qi-num ${active ? '' : 'dim'}">${num}</div>
                    <div class="qi-portrait qi-${active ? 'p'+num : 'neutral'}">
                        ${active ? '<img src="images/fighters/'+b.p1_agent+'/left/stand/0.png" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" onerror="this.src=\'images/fighters/char04/left/stand/0.png\'">' : '??'}
                    </div>
                    <div class="qi-info">
                        <div class="qi-addr">${b.p1_wallet ? b.p1_wallet.substring(0,10)+'...' : 'Unknown'}</div>
                        <div class="qi-name">${b.p1_agent || 'Fighter'}</div>
                        <div class="qi-power">Queued</div>
                    </div>
                    ${active ? '<div class="qi-hp-pill">100%</div>' : ''}
                </div>
            `;
            qList.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadChallengesPage() {
    try {
        const res = await fetch('/api/bantahbro/battles');
        if (!res.ok) throw new Error('Failed to fetch all battles');
        const data = await res.json();

        const liveList    = document.getElementById('ch-live-list');
        const queueList   = document.getElementById('ch-queue-list');
        const historyList = document.getElementById('ch-history-list');

        if (!liveList || !queueList || !historyList) return;

        const live   = data.battles.filter(b => b.status === 'live');
        const queued = data.battles.filter(b => b.status === 'queued');
        const ended  = data.battles.filter(b => b.status === 'ended');

        // Update stat counts
        const liveCount    = document.getElementById('ch-stat-live-count');
        const queueCount   = document.getElementById('ch-stat-queue-count');
        const historyCount = document.getElementById('ch-stat-history-count');
        if (liveCount)    liveCount.textContent    = live.length;
        if (queueCount)   queueCount.textContent   = queued.length;
        if (historyCount) historyCount.textContent = ended.length;

        function shortAddr(addr) {
            if (!addr) return '0x???';
            return addr.substring(0, 6) + '...' + addr.slice(-4);
        }
        
        function getFighterAvatar(agentName, facing) {
            if (!agentName) return `images/fighters/char04/${facing}/idle/0.png`;
            const normalized = agentName.toLowerCase().replace(/\s+/g, '');
            let folder = normalized;
            if (normalized === 'robotv1') folder = 'char04';
            if (normalized === 'robopepe') folder = 'char03';
            return `images/fighters/${folder}/${facing}/idle/0.png`;
        }

        
        // Render Live
        liveList.innerHTML = live.length ? live.map(b => `
            <div class="ch-card ch-card-live">
                <div class="ch-card-fighters">
                    <div class="ch-fighter-block" style="display:flex; align-items:center; gap:10px;">
                        <img src="${getFighterAvatar(b.p1_agent, 'right')}" style="width:40px; height:40px; object-fit:contain; image-rendering:pixelated; background:rgba(255,255,255,0.05); border-radius:8px;" onerror="this.src='images/fighters/char04/right/idle/0.png'">
                        <div>
                            <div class="ch-fighter-name">${b.p1_agent || 'Fighter'}</div>
                            <div class="ch-fighter-wallet">${shortAddr(b.p1_wallet)}</div>
                        </div>
                    </div>
                    <div class="ch-vs-badge">VS</div>
                    <div class="ch-fighter-block" style="display:flex; align-items:center; gap:10px; flex-direction:row-reverse; text-align:right;">
                        <img src="${getFighterAvatar(b.p2_agent, 'left')}" style="width:40px; height:40px; object-fit:contain; image-rendering:pixelated; background:rgba(255,255,255,0.05); border-radius:8px;" onerror="this.src='images/fighters/char04/left/idle/0.png'">
                        <div>
                            <div class="ch-fighter-name">${b.p2_agent || '???'}</div>
                            <div class="ch-fighter-wallet">${shortAddr(b.p2_wallet)}</div>
                        </div>
                    </div>
                </div>
                <div class="ch-card-status" style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <div style="font-weight:bold; color:#aaffaa; font-family:monospace; font-size:14px;">${b.prize_pool ? `${b.prize_pool} BC` : '2,000 BC'}</div>
                    <span class="ch-status-badge ch-badge-live"><span class="ch-pulse-dot" style="width:5px;height:5px;"></span> LIVE</span>
                </div>
            </div>
        `).join('') : `<div class="ch-empty"><div class="ch-empty-icon">&#x1F534;</div><div class="ch-empty-title">No live battles</div><div class="ch-empty-sub">The arena is quiet &mdash; for now.</div></div>`;

        // Render Queued
        queueList.innerHTML = queued.length ? queued.map((b, i) => `
            <div class="ch-card ch-card-queue">
                <div class="ch-queue-num">${i + 1}</div>
                <div class="ch-card-fighters">
                    <div class="ch-fighter-block" style="display:flex; align-items:center; gap:10px;">
                        <img src="${getFighterAvatar(b.p1_agent, 'right')}" style="width:40px; height:40px; object-fit:contain; image-rendering:pixelated; background:rgba(255,255,255,0.05); border-radius:8px;" onerror="this.src='images/fighters/char04/right/idle/0.png'">
                        <div>
                            <div class="ch-fighter-name">${b.p1_agent || 'Fighter'}</div>
                            <div class="ch-fighter-wallet">${shortAddr(b.p1_wallet)}</div>
                        </div>
                    </div>
                </div>
                <div class="ch-card-status" style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                    <div style="font-weight:bold; color:#aaffaa; font-family:monospace; font-size:14px;">${b.prize_pool ? `${b.prize_pool} BC` : '2,000 BC'}</div>
                    <span class="ch-status-badge ch-badge-queue">&#x23F3; WAITING</span>
                </div>
            </div>
        `).join('') : `<div class="ch-empty"><div class="ch-empty-icon">&#x23F3;</div><div class="ch-empty-title">Queue is empty</div><div class="ch-empty-sub">No challengers waiting &mdash; be the first!</div></div>`;

        // Render Ended
        historyList.innerHTML = ended.length ? `
            <div class="ch-history-table">
                <div class="ch-htable-header">
                    <div>Fighter 1</div>
                    <div></div>
                    <div>Fighter 2</div>
                    <div>Winner</div>
                    <div>Prize Pool</div>
                </div>
                ${ended.map(b => `
                    <div class="ch-htable-row">
                        <div class="ch-fighter-block" style="display:flex; align-items:center; gap:10px;">
                            <img src="${getFighterAvatar(b.p1_agent, 'right')}" style="width:36px; height:36px; object-fit:contain; image-rendering:pixelated; background:rgba(255,255,255,0.05); border-radius:6px;" onerror="this.src='images/fighters/char04/right/idle/0.png'">
                            <div>
                                <div class="ch-fighter-name" style="font-size:14px;">${b.p1_agent || 'Fighter'}</div>
                            </div>
                        </div>
                        <div class="ch-vs-badge" style="font-size:10px; padding:2px 4px; opacity:0.5; margin:auto;">VS</div>
                        <div class="ch-fighter-block" style="display:flex; align-items:center; gap:10px; flex-direction:row-reverse; text-align:right;">
                            <img src="${getFighterAvatar(b.p2_agent, 'left')}" style="width:36px; height:36px; object-fit:contain; image-rendering:pixelated; background:rgba(255,255,255,0.05); border-radius:6px;" onerror="this.src='images/fighters/char04/left/idle/0.png'">
                            <div>
                                <div class="ch-fighter-name" style="font-size:14px;">${b.p2_agent || '???'}</div>
                            </div>
                        </div>
                        <div class="ch-winner-col" style="display:flex; align-items:center; justify-content:flex-end;">
                            ${b.winner ? `<div class="ch-winner-label" style="display:inline-block; padding:4px 8px; background:rgba(255,215,0,0.15); color:#ffd700; border-radius:4px; font-weight:bold; font-size:12px;">${b.winner}</div>` : '<span style="color:#666;">Draw</span>'}
                        </div>
                        <div class="ch-prize-col" style="font-weight:bold; color:#aaffaa; display:flex; align-items:center; justify-content:flex-end;">
                            ${b.prize_pool ? `${b.prize_pool} BC` : '2,000 BC'}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : `<div class="ch-empty"><div class="ch-empty-icon">&#x1F4DC;</div><div class="ch-empty-title">No battle history</div><div class="ch-empty-sub">Completed fights will appear here.</div></div>`;

    } catch (e) {
        console.error(e);
    }
}

// Hook into the openPage logic to fetch data when opened
const originalOpenPage = window.openPage;
window.openPage = function(pageId) {
    if (typeof originalOpenPage === 'function') {
        originalOpenPage(pageId);
    } else {
        // Fallback if originalOpenPage is not defined yet or we replaced it
        document.querySelectorAll('.page-section').forEach(el => el.style.display = 'none');
        const p = document.getElementById('page-' + pageId);
        if (p) p.style.display = 'block';
    }
    
    if (pageId === 'challenges') {
        loadChallengesPage();
    }
};

// Initial calls
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadChallengerQueue();
        loadLivePredictions();
        loadNotifications();
        setInterval(loadChallengerQueue, 5000);
        loadLivePredictions();
        setInterval(loadLivePredictions, 5000);
        setInterval(loadNotifications, 5000); // Poll every 5s
        
        // Kick off the auto-battle loop
        window.startAutoBattle();
    }, 1200);
});

// ==========================================
// AUTOMATED BATTLE SEQUENCER
// ==========================================

window.startAutoBattle = async function() {
    console.log("Checking queue for next battle...");
    try {
        const res = await fetch('/api/bantahbro/battles/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.success && data.battle) {
            console.log("Starting auto-battle:", data.battle.p1_agent, "vs", data.battle.p2_agent);
            window._currentBattleId = data.battle.id;
            
            // Wait a brief moment before firing the visual engine
            setTimeout(() => {
                if (typeof window.startPhaserMatch === 'function') {
                    window.startPhaserMatch(data.battle.p1_agent, data.battle.p2_agent);
                }
            }, 1000);
        } else {
            console.log("Queue is empty. Waiting for challengers...");
            // Poll again in 5 seconds
            setTimeout(window.startAutoBattle, 5000);
        }
    } catch (err) {
        console.error("Failed to fetch next battle:", err);
        setTimeout(window.startAutoBattle, 5000);
    }
};

window.onGameEnd = async function(winnerIndex) {
    console.log("Game Ended. Winner index:", winnerIndex);
    if (window._currentBattleId) {
        try {
            // Get the battle info to know who won
            const res = await fetch('/api/bantahbro/battles');
            const data = await res.json();
            const currentBattle = data.battles.find(b => b.id === window._currentBattleId);
            
            if (currentBattle) {
                const winnerKey = winnerIndex === 0 ? currentBattle.p1_agent : currentBattle.p2_agent;
                
                await fetch('/api/bantahbro/battles/' + window._currentBattleId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'ended',
                        winner: winnerKey
                    })
                });
                console.log("Battle marked as ended. Winner:", winnerKey);
            }
        } catch (err) {
            console.error("Error patching battle end:", err);
        }
    }
    
    // Wait 3 seconds, then start the next fight from the queue automatically
    console.log("Starting next battle in 3 seconds...");
    setTimeout(window.startAutoBattle, 3000);
};
