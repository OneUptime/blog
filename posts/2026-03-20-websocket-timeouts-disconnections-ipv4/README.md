# How to Handle WebSocket Timeouts and Disconnections on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, Timeout, Reconnection, IPv4, Node.js, Resilience, Error Handling

Description: Implement robust WebSocket timeout detection, automatic reconnection, and graceful disconnection handling for IPv4 connections in Node.js applications.

## Introduction

WebSocket connections can fail in many ways: the server crashes, the network drops, a firewall terminates idle connections, or the client's IPv4 address changes. Building resilient WebSocket applications requires handling all these scenarios with proper timeout detection, exponential backoff reconnection, and clean state management.

## Server-Side: Detecting and Handling Disconnections

```javascript
const WebSocket = require('ws');

const PING_INTERVAL = 30000;     // Ping every 30 seconds
const PING_TIMEOUT = 10000;      // Mark dead if no pong in 10 seconds
const CLIENT_TIMEOUT = 300000;   // Terminate if no activity in 5 minutes

const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  
  // Initialize connection metadata
  ws.isAlive = true;
  ws.lastActivity = Date.now();
  ws.connectTime = Date.now();
  
  // Update activity on any message
  ws.on('message', (data) => {
    ws.lastActivity = Date.now();
    // Reply to application-level ping (browsers can't send protocol pings)
    if (data.toString() === '__ping__') {
      ws.send('__pong__');
      return;
    }
    // Process message...
  });
  
  // Pong resets the alive flag
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastActivity = Date.now();
  });
  
  // Clean state on close
  ws.on('close', (code, reason) => {
    const duration = Math.floor((Date.now() - ws.connectTime) / 1000);
    console.log(`${ip} disconnected after ${duration}s: code=${code} reason=${reason}`);
    cleanupClient(ws);
  });
  
  ws.on('error', (err) => {
    console.error(`${ip} error: ${err.message}`);
    // 'close' event follows automatically after error
  });
});

function cleanupClient(ws) {
  // Clean up any resources associated with this connection
  // e.g., remove from rooms, cancel subscriptions
}

// Heartbeat loop: ping clients and terminate non-responsive ones
const heartbeat = setInterval(() => {
  const now = Date.now();
  
  wss.clients.forEach((ws) => {
    // Timeout: no activity for CLIENT_TIMEOUT ms
    if (now - ws.lastActivity > CLIENT_TIMEOUT) {
      console.log('Terminating idle client');
      ws.terminate();
      return;
    }
    
    if (!ws.isAlive) {
      // No pong since last ping - dead connection
      console.log('Terminating dead connection (no pong)');
      ws.terminate();
      return;
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

wss.on('close', () => clearInterval(heartbeat));

console.log('WebSocket server on ws://0.0.0.0:8080');
```

## Client-Side: Automatic Reconnection with Backoff

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      maxRetries: options.maxRetries || 10,
      initialDelay: options.initialDelay || 1000,   // 1 second
      maxDelay: options.maxDelay || 30000,           // 30 seconds
      pingInterval: options.pingInterval || 25000,
      pongTimeout: options.pongTimeout || 8000,
      ...options
    };
    
    this.ws = null;
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pongTimer = null;
    this.messageQueue = [];
    this.intentionalClose = false;
    
    this.connect();
  }
  
  connect() {
    this.intentionalClose = false;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log(`Connected to ${this.url}`);
        this.retryCount = 0;
        
        // Flush queued messages
        while (this.messageQueue.length > 0) {
          this.ws.send(this.messageQueue.shift());
        }
        
        this.startPing();
        this.onopen?.();
      };
      
      this.ws.onmessage = (event) => {
        if (event.data === '__pong__') {
          clearTimeout(this.pongTimer);
          return;
        }
        this.onmessage?.(event);
      };
      
      this.ws.onerror = (err) => {
        console.error(`WebSocket error: ${err.message || 'Unknown error'}`);
      };
      
      this.ws.onclose = (event) => {
        this.stopPing();
        
        if (this.intentionalClose) {
          console.log('Connection closed intentionally');
          this.onclose?.(event);
          return;
        }
        
        console.log(`Connection lost (code=${event.code}). Reconnecting...`);
        this.scheduleReconnect();
      };
      
    } catch (err) {
      console.error(`Failed to create WebSocket: ${err.message}`);
      this.scheduleReconnect();
    }
  }
  
  scheduleReconnect() {
    if (this.retryCount >= this.options.maxRetries) {
      console.error(`Max retries (${this.options.maxRetries}) reached`);
      this.onmaxretries?.();
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, ..., max 30s
    const delay = Math.min(
      this.options.initialDelay * Math.pow(2, this.retryCount),
      this.options.maxDelay
    );
    
    this.retryCount++;
    console.log(`Retry ${this.retryCount}/${this.options.maxRetries} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
  
  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('__ping__');
        
        this.pongTimer = setTimeout(() => {
          console.log('Pong timeout - closing for reconnect');
          // Browser close() only allows 1000 or 3000-4999; use app-reserved 4000
          this.ws.close(4000, 'Ping timeout');
        }, this.options.pongTimeout);
      }
    }, this.options.pingInterval);
  }
  
  stopPing() {
    clearInterval(this.pingTimer);
    clearTimeout(this.pongTimer);
  }
  
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue messages to send on reconnect
      console.log('Queuing message (not connected)');
      this.messageQueue.push(data);
    }
  }
  
  close() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    this.stopPing();
    this.ws?.close();
  }
}

// Usage
const client = new ReconnectingWebSocket('ws://192.168.1.100:8080', {
  maxRetries: 20,
  initialDelay: 500
});

client.onopen = () => console.log('Ready!');
client.onmessage = (e) => console.log('Received:', e.data);
client.onclose = (e) => console.log('Closed:', e.code);

// Send messages (auto-queued if disconnected)
client.send(JSON.stringify({ type: 'subscribe', channel: 'alerts' }));
```

## Conclusion

Robust WebSocket applications need both server-side heartbeat detection (ping/pong) and client-side reconnection with exponential backoff. The message queue ensures no data is lost during brief disconnections, and the `intentionalClose` flag prevents reconnect loops when you explicitly close the connection.
