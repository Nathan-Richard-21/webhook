// RAILWAY - Minimal working Express server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Infinity Cybertech Webhook - Railway',
    status: 'running',
    endpoints: ['/health', '/webhook/stream-chat'],
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Infinity Cybertech Webhook - Railway',
    platform: 'Railway',
    url: 'https://webhook-production-d624.up.railway.app',
    timestamp: new Date().toISOString()
  });
});

// Send push notification helper
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  try {
    const fetch = require('node-fetch');
    console.log(`📡 Sending push notification...`);
    
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high'
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('✅ Push notification result:', result);
    return result;
  } catch (error) {
    console.error('❌ Push notification error:', error);
    return { error: error.message };
  }
};

// Webhook endpoint
app.post('/webhook/stream-chat', async (req, res) => {
  try {
    const { type, message, user, channel, pushToken } = req.body;
    console.log(`🔔 Railway webhook received: ${type}`);
    
    // Test notification
    if (type === 'test' && pushToken) {
      const result = await sendPushNotification(
        pushToken, 
        '🧪 Railway Test', 
        'Webhook server is working!',
        { test: true }
      );
      
      return res.json({ 
        success: true, 
        message: 'Test notification sent from Railway',
        result: result
      });
    }
    
    // Handle new messages
    if (type === 'message.new' && user?.id !== 'admin' && pushToken) {
      const title = user?.name || 'New Message';
      const body = message?.text || 'You have a new message';
      
      const result = await sendPushNotification(
        pushToken,
        title,
        body,
        { channelId: channel?.id, senderId: user?.id }
      );
      
      return res.json({ success: true, message: 'Notification sent', result });
    }
    
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway webhook server running on port ${PORT}`);
  console.log(`🌐 Health: https://webhook-production-d624.up.railway.app/health`);
  console.log(`📡 Webhook: https://webhook-production-d624.up.railway.app/webhook/stream-chat`);
});

module.exports = app;
