javascript
const express = require('express');
const mqtt = require('mqtt');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;

// 1. Connect to your Free Supabase PostgreSQL Database using Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. Connect to your Free HiveMQ Cloud MQTT Broker
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  port: process.env.MQTT_PORT || 1883
});

mqttClient.on('connect', () => {
  console.log('Connected to HiveMQ Cloud MQTT Broker!');
  mqttClient.subscribe('society/telemetry/edge');
});

// 3. Process Incoming Telemetry from the ESP32 Gateway
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    // Calls the PostgreSQL function we created earlier
    await pool.query('SELECT process_water_consumption(\$1, \$2, \$3);', [
      data.house_id,
      data.source,
      data.consumed
    ]);
    console.log(`Successfully updated consumption for House ${data.house_id}`);
  } catch (err) {
    console.error('Error processing telemetry database record:', err.message);
  }
});

// 4. API Endpoint: Send User Profile & Graph Data to the Frontend Dashboard
app.get('/api/dashboard/:houseId', async (req, res) => {
  try {
    const houseId = parseInt(req.params.houseId);
    
    // Fetch Current Account Balance and Info
    const accountRes = await pool.query('SELECT * FROM accounts WHERE house_id = \$1', [houseId]);
    
    if (accountRes.rows.length === 0) {
      return res.status(404).json({ error: "House record not found" });
    }

    // Mock response structure that seamlessly feeds into the dashboard UI built in previous steps
    res.json({
      account: accountRes.rows[0],
      message: "Data synced successfully from cloud nodes"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve a basic web interface placeholder for the portal
app.get('/', (req, res) => {
  res.send('<h1>AquaPay Pro Cloud Server Engine Is Online (Connected to GitHub)</h1>');
});

app.listen(port, () => {
  console.log(`Web Portal server running smoothly on port ${port}`);
});
