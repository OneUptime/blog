# How to Configure Docker Containers for WebSocket Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, websocket, containers, networking, nginx, reverse proxy, real-time

Description: A practical guide to configuring Docker containers for reliable WebSocket connections in production environments.

---

WebSocket connections need special treatment in Docker environments. Unlike standard HTTP requests that complete in milliseconds, WebSocket connections stay open for minutes, hours, or even days. This changes how you configure ports, proxies, health checks, and timeouts. Get any of these wrong and your users will experience dropped connections, failed upgrades, or silent failures.

This guide covers everything you need to run WebSocket services inside Docker reliably, from basic port mapping to production-ready reverse proxy configurations.

## Understanding WebSocket in Docker

A WebSocket connection starts as a regular HTTP request with an `Upgrade` header. The server agrees to the upgrade, and the connection switches from HTTP to a persistent, bidirectional TCP connection. Docker does not interfere with this process at the transport level, but intermediary services like load balancers and reverse proxies can break the upgrade handshake if they are not configured properly.

The main challenges are:

- Proxy servers stripping the `Upgrade` header
- Idle connection timeouts killing long-lived connections
- Health checks not accounting for WebSocket endpoints
- Container restarts dropping active connections without warning

## Basic WebSocket Container Setup

Here is a simple Node.js WebSocket server packaged in Docker.

Create the server file:

```javascript
// server.js - A basic WebSocket server using the ws library
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws, req) => {
  console.log(`Client connected from ${req.socket.remoteAddress}`);

  // Send a welcome message on connection
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WS server' }));

  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`Received: ${message}`);
    // Echo the message back to the sender
    ws.send(JSON.stringify({ type: 'echo', data: message }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server listening on port ${PORT}`);
```

The Dockerfile for this service:

```dockerfile
# Dockerfile - Lightweight Node.js image for the WebSocket server
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js .

# Expose the WebSocket port
EXPOSE 8080

# Run as non-root for security
USER node

CMD ["node", "server.js"]
```

Run the container with the WebSocket port mapped:

```bash
# Start the WebSocket server container, mapping port 8080
docker run -d \
  --name ws-server \
  -p 8080:8080 \
  ws-server:latest
```

Test the connection using `websocat` or any WebSocket client:

```bash
# Connect to the WebSocket server and send a test message
websocat ws://localhost:8080
```

## Configuring Nginx as a WebSocket Reverse Proxy

Running WebSocket services behind Nginx requires explicit configuration. Nginx does not forward the `Upgrade` and `Connection` headers by default.

This Nginx configuration properly proxies WebSocket connections:

```nginx
# nginx.conf - WebSocket-aware reverse proxy configuration
upstream websocket_backend {
    # Reference the Docker service name for DNS resolution
    server ws-server:8080;
}

server {
    listen 80;
    server_name ws.example.com;

    location /ws {
        proxy_pass http://websocket_backend;

        # These three headers are required for the WebSocket upgrade handshake
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward client information to the backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Increase timeouts for long-lived WebSocket connections
        # Default is 60s, which will kill idle connections too quickly
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

The critical parts are `proxy_http_version 1.1`, the `Upgrade` header, and the `Connection "upgrade"` header. Without all three, the WebSocket handshake fails with a 400 or 502 error.

## Docker Compose for WebSocket Services

Here is a complete Compose file with the WebSocket server, Nginx reverse proxy, and a Redis pub/sub backend for scaling WebSocket broadcasts:

```yaml
# docker-compose.yml - Full WebSocket stack with proxy and pub/sub
version: "3.8"

services:
  ws-server:
    build: ./ws-server
    environment:
      PORT: "8080"
      REDIS_URL: redis://redis:6379
    # Do not expose ports directly; let Nginx handle external traffic
    expose:
      - "8080"
    depends_on:
      - redis
    networks:
      - ws-network
    # Keep the container running and restart on failure
    restart: unless-stopped
    healthcheck:
      # Use a simple TCP check since WebSocket upgrade is not standard HTTP
      test: ["CMD-SHELL", "nc -z localhost 8080 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - ws-server
    networks:
      - ws-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    # Only expose Redis internally
    expose:
      - "6379"
    networks:
      - ws-network
    restart: unless-stopped

networks:
  ws-network:
    driver: bridge
```

## Handling Connection Timeouts

WebSocket connections are long-lived by design, but every layer in your stack has default timeout values that will kill idle connections. You need to adjust these at every level.

### Application-Level Ping/Pong

Implement ping/pong frames to keep connections alive and detect dead clients:

```javascript
// keepalive.js - Server-side ping interval to detect stale connections
const PING_INTERVAL = 30000; // 30 seconds

wss.on('connection', (ws) => {
  ws.isAlive = true;

  // Mark connection as alive when pong is received
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Periodically ping all clients and terminate unresponsive ones
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating unresponsive client');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

// Clean up the interval when the server shuts down
wss.on('close', () => {
  clearInterval(interval);
});
```

### Docker-Level Keep-Alive

Configure TCP keep-alive at the container level using sysctl options:

```bash
# Run the container with TCP keep-alive settings tuned for WebSocket
docker run -d \
  --name ws-server \
  --sysctl net.ipv4.tcp_keepalive_time=60 \
  --sysctl net.ipv4.tcp_keepalive_intvl=10 \
  --sysctl net.ipv4.tcp_keepalive_probes=6 \
  -p 8080:8080 \
  ws-server:latest
```

These settings tell the kernel to start sending keep-alive probes after 60 seconds of idle time, send probes every 10 seconds, and give up after 6 failed probes.

## Scaling WebSocket Services

Scaling WebSocket servers is harder than scaling stateless HTTP APIs because each client holds an open connection to a specific server instance. You need a pub/sub system so messages reach clients connected to different instances.

Here is how to scale the WebSocket server behind Nginx with sticky sessions:

```nginx
# nginx-scaled.conf - Load balancing with sticky sessions for WebSocket
upstream websocket_backend {
    # ip_hash ensures the same client always reaches the same backend
    ip_hash;
    server ws-server-1:8080;
    server ws-server-2:8080;
    server ws-server-3:8080;
}
```

In Docker Compose, scale the service:

```bash
# Scale the WebSocket server to 3 instances
docker compose up -d --scale ws-server=3
```

## Graceful Shutdown for WebSocket Containers

When a container stops, active WebSocket connections drop immediately unless you handle the shutdown signal. Implement a graceful shutdown that notifies clients and closes connections cleanly.

```javascript
// graceful-shutdown.js - Close WebSocket connections before container exits
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing WebSocket server...');

  // Notify all connected clients that the server is shutting down
  wss.clients.forEach((ws) => {
    ws.send(JSON.stringify({ type: 'server_shutdown' }));
    ws.close(1001, 'Server shutting down');
  });

  // Close the server after giving clients a moment to reconnect elsewhere
  setTimeout(() => {
    wss.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  }, 5000);
});
```

Set the Docker stop grace period to allow time for this cleanup:

```yaml
# In docker-compose.yml, give the container time to close connections
services:
  ws-server:
    stop_grace_period: 15s
```

## Monitoring WebSocket Connections

Track active connections and connection metrics for observability:

```bash
# Check how many WebSocket connections a container currently holds
docker exec ws-server sh -c "ss -tn state established | grep ':8080' | wc -l"
```

For deeper inspection, check the connection details:

```bash
# View all established connections on the WebSocket port
docker exec ws-server ss -tn state established '( dport = :8080 or sport = :8080 )'
```

## Summary

Running WebSocket services in Docker requires attention to proxy configuration, timeout management, and connection lifecycle handling. Always set the `Upgrade` and `Connection` headers in your reverse proxy. Implement application-level ping/pong to keep connections alive across all the network layers. Use a pub/sub backend like Redis when scaling horizontally. Handle SIGTERM signals gracefully so container restarts do not leave clients in a broken state. With these pieces in place, your Dockerized WebSocket services will run reliably in production.
