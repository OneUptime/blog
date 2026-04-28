# How to Implement a Rate Limiter for IPv4 Connections in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Rate Limiting, IPv4, TCP, Security, Net Module, DDoS Protection

Description: Implement per-IP rate limiting for IPv4 TCP connections in Node.js to protect your server from connection floods, brute-force attacks, and resource exhaustion.

## Introduction

Rate limiting prevents individual IPv4 clients from overwhelming your server with excessive connections or requests. This guide implements a sliding-window rate limiter that tracks connection attempts per source IP and rejects clients that exceed configurable thresholds.

## Connection Rate Limiter

```javascript
// rate-limiter.js
'use strict';

/**
 * Sliding-window rate limiter for TCP connections by source IP
 */
class IPRateLimiter {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 10;  // Max concurrent connections per IP
    this.maxRate = options.maxRate || 5;                 // Max new connections per window
    this.windowMs = options.windowMs || 60000;           // Window size in milliseconds
    this.blockDurationMs = options.blockDurationMs || 300000; // Block duration: 5 minutes
    
    // connectionCount[ip] = current open connection count
    this.connectionCount = new Map();
    // rateWindow[ip] = [timestamp, timestamp, ...]
    this.rateWindow = new Map();
    // blocked[ip] = unblock timestamp
    this.blocked = new Map();
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  /**
   * Check if a connection from this IP should be allowed
   * @returns {{ allowed: boolean, reason: string }}
   */
  checkConnection(ip) {
    const now = Date.now();
    
    // Check if IP is blocked
    if (this.blocked.has(ip)) {
      if (now < this.blocked.get(ip)) {
        const remaining = Math.ceil((this.blocked.get(ip) - now) / 1000);
        return { allowed: false, reason: `IP blocked for ${remaining}s` };
      }
      // Block expired
      this.blocked.delete(ip);
    }
    
    // Check concurrent connection limit
    const currentConns = this.connectionCount.get(ip) || 0;
    if (currentConns >= this.maxConnections) {
      return { allowed: false, reason: `Too many concurrent connections (${currentConns}/${this.maxConnections})` };
    }
    
    // Check rate window
    const windowStart = now - this.windowMs;
    let timestamps = (this.rateWindow.get(ip) || []).filter(ts => ts > windowStart);
    
    if (timestamps.length >= this.maxRate) {
      // Too many new connections - apply block
      const blockUntil = now + this.blockDurationMs;
      this.blocked.set(ip, blockUntil);
      return { allowed: false, reason: `Rate limit exceeded - IP blocked for ${this.blockDurationMs / 1000}s` };
    }
    
    // Record this connection attempt
    timestamps.push(now);
    this.rateWindow.set(ip, timestamps);
    
    return { allowed: true };
  }
  
  /**
   * Record a new open connection
   */
  onConnect(ip) {
    this.connectionCount.set(ip, (this.connectionCount.get(ip) || 0) + 1);
  }
  
  /**
   * Record a connection close
   */
  onDisconnect(ip) {
    const count = (this.connectionCount.get(ip) || 1) - 1;
    if (count <= 0) {
      this.connectionCount.delete(ip);
    } else {
      this.connectionCount.set(ip, count);
    }
  }
  
  /**
   * Remove expired entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [ip, timestamps] of this.rateWindow) {
      const valid = timestamps.filter(ts => ts > windowStart);
      if (valid.length === 0) {
        this.rateWindow.delete(ip);
      } else {
        this.rateWindow.set(ip, valid);
      }
    }
    
    for (const [ip, unblockTime] of this.blocked) {
      if (now > unblockTime) this.blocked.delete(ip);
    }
  }
  
  getStats(ip) {
    return {
      connections: this.connectionCount.get(ip) || 0,
      recentAttempts: (this.rateWindow.get(ip) || []).length,
      blocked: this.blocked.has(ip)
    };
  }
}

module.exports = IPRateLimiter;
```

## Using the Rate Limiter in a TCP Server

```javascript
const net = require('net');
const IPRateLimiter = require('./rate-limiter');

const limiter = new IPRateLimiter({
  maxConnections: 5,       // Max 5 concurrent connections per IP
  maxRate: 10,             // Max 10 new connections per minute
  windowMs: 60000,         // 1-minute window
  blockDurationMs: 300000  // Block for 5 minutes on violation
});

const server = net.createServer((socket) => {
  const ip = socket.remoteAddress;
  
  // Check rate limit BEFORE doing anything with the connection
  const { allowed, reason } = limiter.checkConnection(ip);
  
  if (!allowed) {
    console.warn(`[RATE LIMIT] Rejected ${ip}: ${reason}`);
    socket.end(`Too many requests: ${reason}\n`);
    return;
  }
  
  limiter.onConnect(ip);
  console.log(`[CONNECT] ${ip} (${JSON.stringify(limiter.getStats(ip))})`);
  
  socket.setNoDelay(true);
  socket.setTimeout(60000);
  
  socket.on('timeout', () => socket.destroy());
  socket.on('error', (err) => {
    if (err.code !== 'ECONNRESET') console.error(`[ERROR] ${ip}: ${err.message}`);
  });
  
  function cleanup() {
    limiter.onDisconnect(ip);
  }
  
  socket.on('close', cleanup);
  socket.on('end', () => socket.end());
  
  socket.on('data', (data) => {
    socket.write(`Echo: ${data}`);
  });
});

server.listen(8080, '0.0.0.0', () => {
  console.log('Rate-limited server on port 8080');
});
```

## Testing the Rate Limiter

```bash
# Rapidly open connections to trigger the rate limit

for i in {1..15}; do
  nc -z localhost 8080 &
done
wait

# Expected: the first few connections succeed, then subsequent attempts are rejected
# once either the concurrent limit (maxConnections) or rate limit (maxRate) is hit.
```

## Conclusion

A per-IP connection rate limiter is an essential defense layer for any publicly accessible TCP server. This sliding-window implementation handles concurrent connection limits and connection rate enforcement with automatic unblocking after a configurable cooldown period.
