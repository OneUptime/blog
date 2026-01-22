# How to Fix Error: ECONNREFUSED in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Networking, ErrorHandling, Debugging, Troubleshooting

Description: Learn how to diagnose and fix the ECONNREFUSED connection refused error in Node.js when connecting to databases, APIs, or other services.

---

The `ECONNREFUSED` (Connection Refused) error occurs when Node.js attempts to connect to a server that is not accepting connections. This happens with database connections, HTTP requests, or any network communication.

## Understanding the Error

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
```

Common causes:
- Service not running
- Wrong host or port
- Firewall blocking connection
- Service not listening on the expected interface
- Network configuration issues

## Diagnosing the Issue

### Check if Service is Running

```bash
# Check if port is in use
lsof -i :5432     # PostgreSQL default port
lsof -i :6379     # Redis default port
lsof -i :27017    # MongoDB default port

# Or using netstat
netstat -an | grep LISTEN | grep 5432

# Check specific service
systemctl status postgresql
systemctl status redis
systemctl status mongod
```

### Test Connection Manually

```bash
# Test TCP connection
telnet localhost 5432
nc -zv localhost 5432

# Test HTTP endpoint
curl -v http://localhost:3000/health
```

### Check Network Configuration

```bash
# Check what interfaces a service is listening on
ss -tlnp | grep 5432

# Check firewall rules
sudo iptables -L -n
sudo ufw status
```

## Fixing Database Connection Issues

### PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Check PostgreSQL configuration
cat /etc/postgresql/14/main/postgresql.conf | grep listen_addresses
# Should be: listen_addresses = '*' or 'localhost'

# Check pg_hba.conf for allowed connections
cat /etc/postgresql/14/main/pg_hba.conf
```

```javascript
// Correct connection string
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',     // Or '127.0.0.1'
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb',
});

// With connection string
const pool = new Pool({
  connectionString: 'postgresql://postgres:password@localhost:5432/mydb',
});
```

### MongoDB

```bash
# Start MongoDB
sudo systemctl start mongod

# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

```javascript
const mongoose = require('mongoose');

// Check connection string
mongoose.connect('mongodb://localhost:27017/mydb')
  .then(() => console.log('Connected'))
  .catch(err => console.error('Connection error:', err));
```

### Redis

```bash
# Start Redis
sudo systemctl start redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

## Docker Network Issues

### Check Container Status

```bash
# List running containers
docker ps

# Check container logs
docker logs <container_name>

# Inspect container network
docker inspect <container_name> | grep IPAddress
```

### Docker Compose Networking

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    depends_on:
      - db
    environment:
      DB_HOST: db  # Use service name, not localhost
      DB_PORT: 5432

  db:
    image: postgres:14
    ports:
      - "5432:5432"
```

```javascript
// In Docker, use service names
const pool = new Pool({
  host: process.env.DB_HOST || 'db',  // 'db' is the service name
  port: 5432,
});
```

### Connecting from Host to Container

```javascript
// When connecting from host machine to Docker container
const pool = new Pool({
  host: 'localhost',  // Use localhost with published ports
  port: 5432,         // The published port
});
```

## Implementing Connection Retry

### Simple Retry

```javascript
async function connectWithRetry(connectFn, maxRetries = 5, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectFn();
      console.log('Connected successfully');
      return;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;  // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error('Failed to connect after max retries');
}

// Usage
await connectWithRetry(() => mongoose.connect('mongodb://localhost:27017/mydb'));
```

### With Database Libraries

```javascript
// Sequelize with retry
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  retry: {
    max: 5,
    match: [/ECONNREFUSED/],
  },
});

// Mongoose with reconnection
mongoose.connect('mongodb://localhost:27017/mydb', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting reconnect...');
});

// ioredis with automatic retry
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

## Handling ECONNREFUSED in HTTP Requests

### Axios

```javascript
const axios = require('axios');

async function makeRequest(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (error.code === 'ECONNREFUSED' && i < retries - 1) {
        console.log(`Retry ${i + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
}
```

### With Circuit Breaker

```javascript
const CircuitBreaker = require('opossum');
const axios = require('axios');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const breaker = new CircuitBreaker(
  () => axios.get('http://localhost:3000/api'),
  options
);

breaker.on('open', () => console.log('Circuit breaker opened'));
breaker.on('halfOpen', () => console.log('Circuit breaker half-open'));
breaker.on('close', () => console.log('Circuit breaker closed'));

async function makeRequest() {
  try {
    return await breaker.fire();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Service unavailable');
    }
    throw error;
  }
}
```

## Health Check Patterns

### Wait for Service

```javascript
async function waitForService(url, timeout = 30000, interval = 1000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await axios.get(url, { timeout: 1000 });
      console.log('Service is available');
      return true;
    } catch (error) {
      console.log('Waiting for service...');
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Service not available after ${timeout}ms`);
}

// Usage before starting app
await waitForService('http://localhost:5432');
```

### Docker Wait Script

```bash
#!/bin/bash
# wait-for-it.sh

host="$1"
port="$2"
timeout="${3:-30}"

echo "Waiting for $host:$port..."

for i in $(seq 1 $timeout); do
  nc -z "$host" "$port" && echo "Service is up!" && exit 0
  sleep 1
done

echo "Timeout waiting for $host:$port"
exit 1
```

```yaml
# docker-compose.yml
services:
  app:
    command: ["./wait-for-it.sh", "db", "5432", "--", "node", "app.js"]
```

## Common Scenarios and Solutions

### localhost vs 127.0.0.1

```javascript
// These may behave differently
const host1 = 'localhost';   // May resolve to IPv6 ::1
const host2 = '127.0.0.1';   // IPv4 explicitly

// Force IPv4
const net = require('net');
const socket = net.connect({ host: '127.0.0.1', port: 5432 });
```

### Service Binding Issues

```bash
# Service only listening on localhost
listen_addresses = 'localhost'  # Cannot connect from other machines

# Service listening on all interfaces
listen_addresses = '*'  # Can connect from anywhere
```

### DNS Resolution Issues

```javascript
const dns = require('dns');

// Check DNS resolution
dns.lookup('myservice', (err, address, family) => {
  console.log('Address:', address, 'Family:', family);
});
```

## Summary

| Cause | Solution |
|-------|----------|
| Service not running | Start the service |
| Wrong port | Verify port configuration |
| Docker networking | Use service names, not localhost |
| Firewall | Check and configure firewall rules |
| Service binding | Configure service to listen on correct interface |
| DNS issues | Use IP address or fix DNS configuration |

Debugging checklist:
1. Check if service is running
2. Verify host and port configuration
3. Test connection manually (telnet, nc)
4. Check firewall rules
5. Verify network configuration
6. Implement retry logic
7. Add proper error handling and logging
