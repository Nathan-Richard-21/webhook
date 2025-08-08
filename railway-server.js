const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Store push tokens (Railway has persistent storage)
const userTokens = new Map();

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Infinity Cybertech Webhook Server', 
    status: 'running',
    endpoints: ['/health', '/register-push-token', '/webhook/stream-chat']
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Infinity Cybertech Webhook',
    platform: 'Railway',
    timestamp: new Date().toISOString(),
    registeredTokens: userTokens.size
  });
});

// Register push token
app.post('/register-push-token', (req, res) => {
  try {
    const { userId, pushToken } = req.body;
    if (!userId || !pushToken) {
      return res.status(400).json({ error: 'Missing userId or pushToken' });
    }
    
    userTokens.set(userId, pushToken);
    console.log(`📱 Registered token for ${userId}: ${pushToken}`);
    
    res.json({ success: true, message: 'Token registered successfully' });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send push notification
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  try {
    console.log(`📡 Sending push to: ${pushToken}`);
    
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high'
    };

    const fetch = require('node-fetch');
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('✅ Push result:', result);
    return true;
  } catch (error) {
    console.error('❌ Push error:', error);
    return false;
  }
};

// Webhook endpoint
app.post('/webhook/stream-chat', async (req, res) => {
  try {
    const { type, message, user, channel, pushToken } = req.body;
    console.log(`🔔 Webhook: ${type}`);
    
    if (type === 'test') {
      if (pushToken) {
        await sendPushNotification(pushToken, '🧪 Railway Test', 'Webhook is working!');
        return res.json({ success: true, message: 'Test notification sent' });
      }
    }
    
    if (type === 'message.new') {
      if (user?.id === 'admin') {
        return res.json({ success: true, message: 'Admin message ignored' });
      }
      
      const adminToken = userTokens.get('admin') || pushToken;
      if (adminToken) {
        const title = user?.name || 'New Message';
        const body = message?.text || 'You have a new message';
        await sendPushNotification(adminToken, title, body, { channelId: channel?.id });
        return res.json({ success: true, message: 'Notification sent' });
      }
    }
    
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List tokens (for debugging)
app.get('/tokens', (req, res) => {
  const tokens = Array.from(userTokens.entries()).map(([userId, token]) => ({
    userId,
    tokenPreview: `${token.substring(0, 20)}...`
  }));
  res.json({ tokens, count: tokens.length });
});

app.listen(PORT, () => {
  console.log(`🚀 Railway webhook server running on port ${PORT}`);
  console.log(`🌐 Health: https://webhooksite-production.up.railway.app/health`);
});

module.exports = app;
