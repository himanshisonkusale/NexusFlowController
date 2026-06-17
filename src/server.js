const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimiter');
const { register } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// metrics 
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// health check 
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    node: process.env.HOSTNAME || 'local',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// token generate
app.post('/token', (req, res) => {
  const { tier } = req.body;
  const token = jwt.sign(
    { tier: tier || 'anonymous' },
    'nexus-secret-key',
    { expiresIn: '1h' }
  );
  res.json({ token });
});

app.use(rateLimiter);

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Request successful!',
    node: process.env.HOSTNAME || 'local'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});