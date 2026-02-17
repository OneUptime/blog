# How to Build a Real-Time Dashboard with Azure SignalR Service and Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SignalR, Node.js, Real-Time, Dashboard, WebSocket, JavaScript

Description: Build a real-time dashboard that pushes live updates to connected clients using Azure SignalR Service with a Node.js backend.

---

Dashboards that show stale data are worse than no dashboard at all. If your monitoring screen is five minutes behind, you are reacting to problems instead of catching them. Real-time dashboards need a way to push data to the browser the moment something changes. Azure SignalR Service handles the push infrastructure, managing WebSocket connections at scale so your Node.js backend can focus on the data.

This guide builds a real-time metrics dashboard from scratch - a Node.js server that collects system metrics and pushes them to a browser dashboard through Azure SignalR Service.

## Why Azure SignalR Service

You could run SignalR on your own server, but then you are managing WebSocket connections yourself. Each connection consumes memory and file descriptors. When you have hundreds or thousands of dashboard viewers, that adds up. Azure SignalR Service offloads the connection management. Your server sends data to the service through its REST API, and the service handles distributing it to all connected clients.

## Prerequisites

- Azure account
- Node.js 18 or later
- Azure CLI installed and authenticated
- Basic knowledge of Node.js and HTML/JavaScript

## Setting Up Azure SignalR Service

```bash
# Create a resource group
az group create --name signalr-demo-rg --location eastus

# Create a SignalR Service instance in serverless mode
az signalr create \
  --name my-signalr-service \
  --resource-group signalr-demo-rg \
  --location eastus \
  --sku Free_F1 \
  --service-mode Serverless

# Get the connection string
az signalr key list \
  --name my-signalr-service \
  --resource-group signalr-demo-rg \
  --query primaryConnectionString \
  --output tsv
```

The `Serverless` mode means your backend does not maintain persistent connections to SignalR. Instead, it uses the REST API to send messages, which is more efficient for dashboard-style applications where data flows primarily from server to clients.

## Project Setup

```bash
# Create the project
mkdir signalr-dashboard && cd signalr-dashboard
npm init -y

# Install dependencies
npm install express @microsoft/signalr dotenv cors
npm install --save-dev typescript @types/express @types/cors ts-node
```

Create the `.env` file:

```env
# Azure SignalR connection string
SIGNALR_CONNECTION_STRING="Endpoint=https://my-signalr-service.service.signalr.net;AccessKey=your-key;Version=1.0;"
PORT=3000
```

## Building the Server

The server has three responsibilities: serving the frontend, negotiating SignalR connections, and pushing metrics data.

```typescript
// server.ts - Node.js server for the real-time dashboard
import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Parse the SignalR connection string
function parseConnectionString(connStr: string) {
  const pairs: Record<string, string> = {};
  connStr.split(';').forEach((part) => {
    const [key, ...rest] = part.split('=');
    pairs[key.trim()] = rest.join('=');
  });
  return {
    endpoint: pairs['Endpoint'],
    accessKey: pairs['AccessKey'],
  };
}

const { endpoint, accessKey } = parseConnectionString(
  process.env.SIGNALR_CONNECTION_STRING!
);
const hubName = 'dashboard';

// Generate a JWT token for client authentication
function generateToken(userId: string): string {
  const audience = `${endpoint}/client/?hub=${hubName}`;
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: audience,
    iat: Math.floor(Date.now() / 1000),
    exp: expiry,
    sub: userId,
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', accessKey)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// Negotiate endpoint - clients call this to get connection info
app.post('/api/negotiate', (req, res) => {
  const userId = `user-${Date.now()}`;
  const token = generateToken(userId);

  res.json({
    url: `${endpoint}/client/?hub=${hubName}`,
    accessToken: token,
  });
});

// Send a message to all connected clients through the SignalR REST API
async function broadcastMessage(target: string, args: unknown[]) {
  const url = `${endpoint}/api/v1/hubs/${hubName}/:send?api-version=2022-11-01`;
  const token = generateToken('server');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      target,
      arguments: args,
    }),
  });

  if (!response.ok) {
    console.error(`Failed to broadcast: ${response.status}`);
  }
}

// Simulate metrics collection and broadcast
function startMetricsCollection() {
  setInterval(async () => {
    // Generate realistic-looking metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: 20 + Math.random() * 60,
        cores: 4,
        loadAvg: [1.2 + Math.random(), 1.5 + Math.random(), 1.8 + Math.random()],
      },
      memory: {
        total: 16384,
        used: 8000 + Math.random() * 4000,
        free: 4000 + Math.random() * 2000,
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 500000),
        connections: Math.floor(50 + Math.random() * 200),
      },
      requests: {
        total: Math.floor(1000 + Math.random() * 5000),
        errors: Math.floor(Math.random() * 50),
        avgLatency: 20 + Math.random() * 80,
        p99Latency: 100 + Math.random() * 400,
      },
    };

    // Broadcast the metrics to all connected dashboard clients
    await broadcastMessage('metricsUpdate', [metrics]);
  }, 2000); // Push updates every 2 seconds
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  startMetricsCollection();
});
```

## Building the Dashboard Frontend

Create the HTML dashboard that receives and displays the real-time data:

```html
<!-- public/index.html - Real-time metrics dashboard -->
<!DOCTYPE html>
<html>
<head>
  <title>Real-Time Dashboard</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.0/signalr.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { text-align: center; color: #00d4ff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
    .card { background: #16213e; border-radius: 8px; padding: 20px; border: 1px solid #0f3460; }
    .card h2 { margin-top: 0; color: #00d4ff; font-size: 16px; }
    .metric { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .metric.green { color: #00e676; }
    .metric.yellow { color: #ffc107; }
    .metric.red { color: #ff5252; }
    .sub { color: #888; font-size: 14px; }
    .bar { height: 8px; background: #0f3460; border-radius: 4px; margin-top: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
    #status { text-align: center; padding: 10px; margin-bottom: 20px; }
    .connected { color: #00e676; }
    .disconnected { color: #ff5252; }
  </style>
</head>
<body>
  <h1>System Metrics Dashboard</h1>
  <div id="status" class="disconnected">Connecting...</div>

  <div class="grid">
    <div class="card">
      <h2>CPU Usage</h2>
      <div id="cpu-value" class="metric green">--%</div>
      <div class="bar"><div id="cpu-bar" class="bar-fill" style="width:0%;background:#00e676"></div></div>
      <div class="sub" id="cpu-load">Load: --</div>
    </div>

    <div class="card">
      <h2>Memory Usage</h2>
      <div id="mem-value" class="metric green">-- MB</div>
      <div class="bar"><div id="mem-bar" class="bar-fill" style="width:0%;background:#00d4ff"></div></div>
      <div class="sub" id="mem-detail">-- / -- MB</div>
    </div>

    <div class="card">
      <h2>Network</h2>
      <div id="net-connections" class="metric green">--</div>
      <div class="sub">Active Connections</div>
      <div class="sub" id="net-traffic">In: -- KB/s | Out: -- KB/s</div>
    </div>

    <div class="card">
      <h2>Request Rate</h2>
      <div id="req-total" class="metric green">--/s</div>
      <div class="sub" id="req-errors">Errors: --</div>
      <div class="sub" id="req-latency">Avg: --ms | P99: --ms</div>
    </div>
  </div>

  <script>
    // Connect to Azure SignalR Service
    async function connect() {
      // Get connection info from the negotiate endpoint
      const res = await fetch('/api/negotiate', { method: 'POST' });
      const { url, accessToken } = await res.json();

      // Build the SignalR connection
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      // Handle metrics updates from the server
      connection.on('metricsUpdate', (metrics) => {
        updateDashboard(metrics);
      });

      connection.onreconnecting(() => {
        document.getElementById('status').className = 'disconnected';
        document.getElementById('status').textContent = 'Reconnecting...';
      });

      connection.onreconnected(() => {
        document.getElementById('status').className = 'connected';
        document.getElementById('status').textContent = 'Connected';
      });

      await connection.start();
      document.getElementById('status').className = 'connected';
      document.getElementById('status').textContent = 'Connected - Live';
    }

    // Update the dashboard with new metrics
    function updateDashboard(m) {
      // CPU
      const cpuPct = m.cpu.usage.toFixed(1);
      document.getElementById('cpu-value').textContent = cpuPct + '%';
      document.getElementById('cpu-value').className = 'metric ' + getColor(m.cpu.usage, 50, 80);
      document.getElementById('cpu-bar').style.width = cpuPct + '%';
      document.getElementById('cpu-load').textContent =
        'Load: ' + m.cpu.loadAvg.map(v => v.toFixed(2)).join(', ');

      // Memory
      const memPct = ((m.memory.used / m.memory.total) * 100).toFixed(1);
      document.getElementById('mem-value').textContent = m.memory.used.toFixed(0) + ' MB';
      document.getElementById('mem-bar').style.width = memPct + '%';
      document.getElementById('mem-detail').textContent =
        m.memory.used.toFixed(0) + ' / ' + m.memory.total + ' MB';

      // Network
      document.getElementById('net-connections').textContent = m.network.connections;
      document.getElementById('net-traffic').textContent =
        'In: ' + (m.network.bytesIn / 1024).toFixed(0) + ' KB/s | Out: ' +
        (m.network.bytesOut / 1024).toFixed(0) + ' KB/s';

      // Requests
      document.getElementById('req-total').textContent = m.requests.total + '/s';
      document.getElementById('req-errors').textContent = 'Errors: ' + m.requests.errors;
      document.getElementById('req-latency').textContent =
        'Avg: ' + m.requests.avgLatency.toFixed(0) + 'ms | P99: ' +
        m.requests.p99Latency.toFixed(0) + 'ms';
    }

    // Return a color class based on threshold values
    function getColor(value, warnAt, critAt) {
      if (value >= critAt) return 'red';
      if (value >= warnAt) return 'yellow';
      return 'green';
    }

    connect().catch(console.error);
  </script>
</body>
</html>
```

## Scaling Considerations

The Free tier of Azure SignalR supports 20 concurrent connections. For a production dashboard, you will need the Standard tier. The key decision is how many SignalR units you need. Each unit supports 1,000 concurrent connections. If you expect 500 dashboard viewers at peak, one unit is enough with room to spare.

For the server side, since you are using the REST API in serverless mode, your Node.js server does not hold any SignalR connections. It just makes HTTP calls. This means you can scale your server horizontally without worrying about sticky sessions or connection affinity.

## Adding Group Support

If you have multiple dashboards for different teams, use groups to target updates:

```typescript
// Send metrics only to clients in a specific group
async function sendToGroup(groupName: string, target: string, args: unknown[]) {
  const url = `${endpoint}/api/v1/hubs/${hubName}/groups/${groupName}/:send?api-version=2022-11-01`;
  const token = generateToken('server');

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ target, arguments: args }),
  });
}
```

## Wrapping Up

Azure SignalR Service takes the hard part out of building real-time dashboards. You do not manage WebSocket connections, you do not worry about scaling connections across server instances, and you do not build your own message routing. Your Node.js server collects or receives data, calls the SignalR REST API, and the service pushes it to every connected browser. The serverless mode means you only pay for messages sent, not for idle connections. For monitoring dashboards, live scoreboards, or any application where users need to see changes the moment they happen, this architecture gets you to production quickly and scales cleanly.
