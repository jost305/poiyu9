var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    GameCollection = require('./games.js').GameCollection,
    games = new GameCollection();

app.use(function (req, res, next) {
  if (/\.js(\?|$)/.test(req.url)) {
    res.setHeader('Cache-Control', 'no-store');
  } else if (/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(req.url)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { Pool } = require('pg');
const { PrivyClient } = require('@privy-io/server-auth');

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET || process.env.VITE_PRIVY_APP_SECRET
);

const Pusher = require('pusher');
let pusher = null;
if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  });
}

const dbClient = new Pool({
  connectionString: process.env.DATABASE_URL
});
dbClient.on('error', err => {
  console.error('Unexpected error on idle db client', err);
});
dbClient.connect().then(async () => {
  // Ensure chat table exists
  try {
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS bota_chat_messages (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100),
        wallet_address VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS bota_arena_battles (
        id SERIAL PRIMARY KEY,
        p1_wallet VARCHAR(100),
        p1_agent VARCHAR(100),
        p2_wallet VARCHAR(100),
        p2_agent VARCHAR(100),
        status VARCHAR(20) DEFAULT 'queued',
        winner VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Battles table verified.');
  } catch (err) {
    console.error('Failed to create tables:', err);
  }
}).catch(console.error);

const LEGACY_AGENTS = [
  { agent_id: 'legacy-1', display_name: 'Robot V1', avatar_url: 'images/fighters/char04/portrait.png', wins: 247, losses: 38, fame_score: 82, current_streak: 5, wallet_address: '0xA12F...B7C9', bc_earned: 1240000 },
  { agent_id: 'legacy-2', display_name: 'Floatrobo', avatar_url: 'images/fighters/floatrobo/portrait.png', wins: 198, losses: 52, fame_score: 68, current_streak: 3, wallet_address: '0xB34E...C8D1', bc_earned: 890000 },
  { agent_id: 'legacy-3', display_name: 'Robo Pepe', avatar_url: 'images/fighters/robopepe/portrait.png', wins: 162, losses: 71, fame_score: 55, current_streak: 0, wallet_address: '0xC56D...D2E4', bc_earned: 605000 },
  { agent_id: 'legacy-4', display_name: 'Crimsonbot', avatar_url: 'images/fighters/crimsonbot/portrait.png', wins: 131, losses: 88, fame_score: 49, current_streak: 2, wallet_address: '0xD78F...E3F5', bc_earned: 412000 },
  { agent_id: 'legacy-5', display_name: 'Toxicbot', avatar_url: 'images/fighters/toxicbot/portrait.png', wins: 109, losses: 102, fame_score: 44, current_streak: 0, wallet_address: '0xE91A...F4G6', bc_earned: 298000 },
  { agent_id: 'legacy-6', display_name: 'Voidbot', avatar_url: 'images/fighters/voidbot/portrait.png', wins: 87, losses: 93, fame_score: 38, current_streak: 0, wallet_address: '0xF02B...G5H7', bc_earned: 201000 },
  { agent_id: 'legacy-7', display_name: 'Fury Man', avatar_url: 'images/fighters/furyman/portrait.png', wins: 64, losses: 71, fame_score: 31, current_streak: 1, wallet_address: '0xA88C...I9J2', bc_earned: 138000 },
  { agent_id: 'legacy-8', display_name: 'StormBot', avatar_url: 'images/fighters/silverwarrior/portrait.png', wins: 41, losses: 59, fame_score: 22, current_streak: 0, wallet_address: '0xB11D...K3L5', bc_earned: 72000 }
];

app.use(express.json());

app.get('/api/bantahbro/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const verifiedClaims = await privy.verifyAuthToken(token);
    const userId = verifiedClaims.userId;

    // Fetch user details
    const userRes = await dbClient.query(`SELECT primary_wallet_address, wallet_addresses FROM users WHERE id = $1`, [userId]);
    const walletAddress = userRes.rows[0] ? userRes.rows[0].primary_wallet_address : null;

    // Fetch balance
    let balance = 0;
    if (walletAddress) {
      const balanceRes = await dbClient.query(`SELECT balance FROM bantcredit_balances WHERE wallet_address = $1`, [walletAddress]);
      balance = balanceRes.rows[0] ? parseFloat(balanceRes.rows[0].balance) : 0;
    }

    // Fetch USDC Earned and BANTC Claim
    let earnedUSDC = 0;
    let bantcClaim = 0;
    const rewardsRes = await dbClient.query(`SELECT share_amount_usdc, bc_snapshot FROM user_rewards_claims WHERE user_id = $1`, [userId]);
    if (rewardsRes.rows.length > 0) {
       earnedUSDC = rewardsRes.rows.reduce((sum, row) => sum + parseFloat(row.share_amount_usdc || 0), 0);
       bantcClaim = rewardsRes.rows.reduce((sum, row) => sum + parseInt(row.bc_snapshot || 0), 0);
    }
    
    // Add legacy profile stats as requested
    earnedUSDC += 1250.00;
    bantcClaim += 1240000;

    // Fetch fighter profiles (assuming wallet_address links them)
    let fightersRes = { rows: [] };
    if (walletAddress) {
      fightersRes = await dbClient.query(
        'SELECT * FROM bota_fighter_profiles WHERE wallet_address = $1 OR agent_id = $1',
        [walletAddress]
      );
    }

    // Fetch Battle History
    let battleHistory = [];
    if (fightersRes.rows.length > 0) {
      // Look for agent_id in the rows, since we don't know the exact schema, we fallback to walletAddress
      const fighterIds = fightersRes.rows.map(f => f.agent_id || f.id).filter(id => id);
      if (fighterIds.length > 0) {
        const placeholders = fighterIds.map((_, i) => `$${i + 1}`).join(',');
        const battleRes = await dbClient.query(`
          SELECT * FROM bota_arena_battle_records 
          WHERE winner_agent_id IN (${placeholders}) OR loser_agent_id IN (${placeholders})
          ORDER BY created_at DESC LIMIT 20
        `, fighterIds);
        battleHistory = battleRes.rows;
      }
    }

    // Fetch Packs
    let packs = [];
    const packRes = await dbClient.query(`SELECT * FROM pack_ownership WHERE owner_user_id = $1`, [userId]);
    packs = packRes.rows;

    // Fetch Runes (Tools)
    let runes = [];
    if (walletAddress) {
      const toolRes = await dbClient.query(`SELECT * FROM bota_tool_inventory WHERE owner_wallet = $1`, [walletAddress]);
      runes = toolRes.rows;
    }

    // Inject Legacy Agents into the user's fighterFeed as requested
    const userLegacyAgents = LEGACY_AGENTS.map(agent => ({
      ...agent,
      wallet_address: walletAddress || agent.wallet_address
    }));

    res.json({
      balance,
      earnedUSDC,
      bantcClaim,
      fighterFeed: { profiles: [...userLegacyAgents, ...fightersRes.rows] },
      queueFeed: { battles: [] },
      liveFeed: { battles: [] },
      battleHistory,
      packs,
      runes
    });
  } catch (error) {
    console.error('Profile API Error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.get('/api/bantahbro/leaderboard', async (req, res) => {
  try {
    const leaderboardRes = await dbClient.query(`
      SELECT agent_id, display_name, avatar_url, wins, losses, fame_score, current_streak, wallet_address 
      FROM bota_fighter_profiles 
      LIMIT 100
    `);
    
    // Mix old version users (mock) and new version users (postgres)
    let combined = [...LEGACY_AGENTS, ...leaderboardRes.rows.map(r => ({ ...r, bc_earned: (r.wins || 0) * 5000 }))];
    
    // Sort by wins DESC
    combined.sort((a, b) => (b.wins || 0) - (a.wins || 0));
    
    // Take top 50
    combined = combined.slice(0, 50);

    res.json({ leaderboard: combined });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

app.get('/api/bantahbro/global-stats', async (req, res) => {
  try {
    const claimsRes = await dbClient.query('SELECT SUM(CAST(bc_snapshot AS NUMERIC)) as total_bc FROM user_rewards_claims');
    const dbTotalBC = claimsRes.rows[0]?.total_bc ? parseInt(claimsRes.rows[0].total_bc) : 0;
    
    const legacyBCTotal = LEGACY_AGENTS.reduce((sum, a) => sum + (a.bc_earned || 0), 0);
    const globalBC = dbTotalBC + legacyBCTotal;

    const fightersRes = await dbClient.query('SELECT COUNT(*) as live_count FROM bota_fighter_profiles');
    const dbLiveFighters = parseInt(fightersRes.rows[0]?.live_count || 0);
    const globalFighters = dbLiveFighters + LEGACY_AGENTS.length;

    res.json({ globalBC, globalFighters });
  } catch (error) {
    console.error('Global Stats API Error:', error);
    res.status(500).json({ error: 'Failed to load global stats' });
  }
});

// Chat API - GET messages
app.get('/api/bantahbro/chat', async (req, res) => {
  try {
    const chatRes = await dbClient.query('SELECT * FROM bota_chat_messages ORDER BY created_at DESC LIMIT 50');
    // Return in chronological order
    res.json({ messages: chatRes.rows.reverse() });
  } catch (error) {
    console.error('Chat GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Chat API - POST message
app.post('/api/bantahbro/chat', async (req, res) => {
  try {
    const { user_name, wallet_address, message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Default to BOTA_ guest if no username provided
    const uName = user_name || ('BOTA_' + Math.floor(1000 + Math.random() * 9000));
    
    await dbClient.query(
      'INSERT INTO bota_chat_messages (user_name, wallet_address, message) VALUES ($1, $2, $3)',
      [uName, wallet_address || null, message.trim()]
    );
    
    res.json({ success: true, user_name: uName });
  } catch (error) {
    console.error('Chat POST Error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Battles API - GET
app.get('/api/bantahbro/battles', async (req, res) => {
  try {
    const status = req.query.status;
    let query = 'SELECT * FROM bota_arena_battles';
    let params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const battlesRes = await dbClient.query(query, params);
    res.json({ battles: battlesRes.rows });
  } catch (error) {
    console.error('Battles GET Error:', error);
    res.status(500).json({ error: 'Failed to fetch battles' });
  }
});

app.get('/api/bantahbro/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const verifiedClaims = await privy.verifyAuthToken(token);
    
    // We try to fetch from 'bota_notifications' first, if it exists
    let notifs = { rows: [] };
    try {
      notifs = await dbClient.query(`
        SELECT * FROM bota_notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [verifiedClaims.userId]);
    } catch (e) {
      console.warn("Notifications table might not exist yet.");
    }
    
    res.json({ notifications: notifs.rows });
  } catch (error) {
    console.error('Notifications API Error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

app.use(express.static(__dirname + '/../game'));

server.listen(5000, '0.0.0.0');

var Responses = {
    SUCCESS: 0,
    GAME_EXISTS: 1,
    GAME_NOT_EXISTS: 2,
    GAME_FULL: 3
  },
  Requests = {
    CREATE_GAME: 'create-game',
    JOIN_GAME: 'join-game'
  };

io.sockets.on('connection', function (socket) {
  socket.on(Requests.CREATE_GAME, function (gameName) {
    if (games.createGame(gameName)) {
      games.getGame(gameName).addPlayer(socket);
      socket.emit('response', Responses.SUCCESS);
    } else {
      socket.emit('response', Responses.GAME_EXISTS);
    }
  });
  socket.on(Requests.JOIN_GAME, function (gameName) {
    var game = games.getGame(gameName);
    if (!game) {
      socket.emit('response', Responses.GAME_NOT_EXISTS);
    } else {
      if (game.addPlayer(socket)) {
        socket.emit('response', Responses.SUCCESS);
      } else {
        socket.emit('response', Responses.GAME_FULL);
      }
    }
  });
});
