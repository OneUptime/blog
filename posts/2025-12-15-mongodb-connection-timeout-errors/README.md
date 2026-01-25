# How to Fix "connection timeout" Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, DevOps, Troubleshooting, Performance

Description: Diagnose and resolve MongoDB connection timeout errors with comprehensive troubleshooting steps covering network issues, connection pool configuration, server settings, and application-level fixes.

---

Connection timeout errors in MongoDB can bring your application to a halt. These errors occur when your application cannot establish or maintain a connection to the MongoDB server within the expected time frame. This guide covers all the common causes and their solutions.

## Understanding Connection Timeouts

MongoDB connection timeouts typically appear as:

```
MongoNetworkError: connection timed out
MongoServerSelectionError: connection timed out
MongoTimeoutError: Server selection timed out after 30000 ms
```

```mermaid
flowchart TD
    A[Connection Attempt] --> B{DNS Resolution}
    B -->|Fails| C[DNS Timeout]
    B -->|Success| D{TCP Connect}
    D -->|Fails| E[Network Timeout]
    D -->|Success| F{TLS Handshake}
    F -->|Fails| G[TLS Timeout]
    F -->|Success| H{Authentication}
    H -->|Fails| I[Auth Timeout]
    H -->|Success| J[Connection Ready]

    C --> K[Check DNS/Hostname]
    E --> L[Check Firewall/Network]
    G --> M[Check TLS Config]
    I --> N[Check Credentials]
```

## Common Causes and Solutions

### 1. Network and Firewall Issues

The most common cause of connection timeouts is network connectivity.

**Check basic connectivity:**

```bash
# Test if MongoDB port is reachable
nc -zv mongodb-host.example.com 27017

# Or using telnet
telnet mongodb-host.example.com 27017

# Check DNS resolution
nslookup mongodb-host.example.com

# Trace the route
traceroute mongodb-host.example.com
```

**Firewall rules to verify:**

```bash
# On the MongoDB server, ensure port 27017 is open
sudo ufw status
sudo ufw allow 27017

# For iptables
sudo iptables -L -n | grep 27017

# AWS Security Group - ensure inbound rule exists for port 27017
```

**Solution checklist:**
- Verify MongoDB is running: `systemctl status mongod`
- Check MongoDB is binding to correct interface in `/etc/mongod.conf`
- Ensure firewall allows traffic on port 27017
- Verify no network ACLs blocking traffic
- Check VPC peering or VPN connections if applicable

### 2. Connection String Issues

Incorrect connection strings cause timeouts when the driver cannot find the server.

```javascript
// Common connection string problems

// Wrong: Using localhost when MongoDB is remote
const uri = "mongodb://localhost:27017/mydb";

// Wrong: Missing authentication database
const uri = "mongodb://user:pass@host:27017/mydb";

// Correct: Include authSource
const uri = "mongodb://user:pass@host:27017/mydb?authSource=admin";

// Wrong: Incorrect replica set name
const uri = "mongodb://host:27017/mydb?replicaSet=wrongName";

// Correct: Use the actual replica set name
const uri = "mongodb://host1:27017,host2:27017/mydb?replicaSet=rs0";
```

### 3. Connection Pool Exhaustion

When all connections in the pool are in use, new requests time out waiting.

```javascript
// Node.js - Increase pool size
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri, {
  maxPoolSize: 100,        // Default is 100
  minPoolSize: 10,         // Maintain minimum connections
  maxIdleTimeMS: 60000,    // Close idle connections after 60s
  waitQueueTimeoutMS: 30000 // Wait up to 30s for available connection
});

// Monitor pool events
client.on('connectionPoolCreated', (event) => {
  console.log('Pool created:', event);
});

client.on('connectionCheckedOut', (event) => {
  console.log('Connection checked out');
});

client.on('connectionPoolCleared', (event) => {
  console.log('Pool cleared - possible issue');
});
```

**Signs of pool exhaustion:**
- Timeouts increase under load
- Application works initially then fails
- Errors mention "waiting for available connection"

### 4. Server Selection Timeout

In replica sets, the driver must select an appropriate server.

```javascript
// Increase server selection timeout
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 30000,  // Default is 30000 (30s)
  connectTimeoutMS: 20000,          // Time to establish connection
  socketTimeoutMS: 360000           // Time for operations
});
```

**Replica set specific issues:**

```javascript
// Ensure you can reach all replica set members
const uri = "mongodb://primary:27017,secondary1:27017,secondary2:27017/mydb?replicaSet=rs0";

// For read preferences, ensure secondaries are reachable
const client = new MongoClient(uri, {
  readPreference: 'secondaryPreferred'
});
```

### 5. DNS Resolution Delays

Slow DNS can cause timeouts, especially with MongoDB Atlas or replica sets.

```javascript
// Use direct connection to bypass SRV lookup issues
// Instead of: mongodb+srv://cluster.mongodb.net
const uri = "mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0";

// Or increase DNS timeout
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 60000  // Give more time for DNS
});
```

**DNS caching:**

```bash
# On Linux, check DNS cache
systemd-resolve --statistics

# Flush DNS cache if needed
sudo systemd-resolve --flush-caches
```

### 6. TLS/SSL Configuration Issues

Misconfigured TLS can cause connection hangs.

```javascript
// Proper TLS configuration
const client = new MongoClient(uri, {
  tls: true,
  tlsCAFile: '/path/to/ca-certificate.pem',
  tlsCertificateKeyFile: '/path/to/client-certificate.pem',
  tlsAllowInvalidCertificates: false,  // Keep false in production
  tlsAllowInvalidHostnames: false      // Keep false in production
});

// For self-signed certificates in development only
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true  // NEVER in production
});
```

### 7. MongoDB Server Configuration

Server-side settings can cause client timeouts.

```yaml
# /etc/mongod.conf

# Ensure MongoDB binds to correct interfaces
net:
  port: 27017
  bindIp: 0.0.0.0  # Or specific IPs

# Adjust operation timeouts
setParameter:
  maxTimeMS: 60000

# Increase connection limits
net:
  maxIncomingConnections: 65536
```

**Check server status:**

```javascript
// Connect to MongoDB and check status
db.serverStatus().connections
// { current: 45, available: 51155, totalCreated: 1234 }

// Check if nearing connection limit
db.serverStatus().connections.current / db.serverStatus().connections.available
```

## Application-Level Solutions

### Implementing Retry Logic

```javascript
async function connectWithRetry(uri, maxRetries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });

      await client.connect();
      console.log('Connected successfully');
      return client;

    } catch (error) {
      lastError = error;
      console.log(`Connection attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to connect after ${maxRetries} attempts: ${lastError.message}`);
}
```

### Connection Health Checks

```javascript
class MongoHealthCheck {
  constructor(client) {
    this.client = client;
    this.isHealthy = false;
  }

  async check() {
    try {
      const admin = this.client.db().admin();
      await admin.ping();
      this.isHealthy = true;
      return true;
    } catch (error) {
      this.isHealthy = false;
      console.error('Health check failed:', error.message);
      return false;
    }
  }

  startPeriodicCheck(intervalMs = 30000) {
    setInterval(() => this.check(), intervalMs);
  }
}

// Usage
const healthCheck = new MongoHealthCheck(client);
healthCheck.startPeriodicCheck();
```

### Graceful Degradation

```javascript
async function queryWithFallback(collection, query, options = {}) {
  const timeout = options.timeout || 5000;

  try {
    return await Promise.race([
      collection.find(query).toArray(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.error('Query failed, returning cached data:', error.message);
    return getCachedData(query); // Fallback to cache
  }
}
```

## MongoDB Atlas Specific Issues

### Atlas Connection Troubleshooting

```javascript
// Atlas connection string format
const uri = "mongodb+srv://user:password@cluster.mongodb.net/mydb?retryWrites=true&w=majority";

// If SRV lookup fails, use standard format
const uri = "mongodb://user:password@shard-00-00.mongodb.net:27017,shard-00-01.mongodb.net:27017,shard-00-02.mongodb.net:27017/mydb?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority";
```

**Atlas checklist:**
- Whitelist your IP in Atlas Network Access
- Verify user credentials are correct
- Check cluster is not paused (free tier)
- Ensure correct database user (not Atlas user)

```bash
# Test Atlas connectivity
openssl s_client -connect cluster.mongodb.net:27017

# Verify SRV records
dig +short SRV _mongodb._tcp.cluster.mongodb.net
```

## Monitoring and Alerting

```javascript
// Set up connection event monitoring
client.on('serverHeartbeatFailed', (event) => {
  console.error('Heartbeat failed:', event);
  alertOps('MongoDB heartbeat failed');
});

client.on('topologyDescriptionChanged', (event) => {
  const newTopology = event.newDescription;
  if (newTopology.type === 'Unknown') {
    alertOps('Lost connection to MongoDB cluster');
  }
});

// Log slow operations that might indicate issues
client.on('commandSucceeded', (event) => {
  if (event.duration > 1000) {
    console.warn(`Slow operation: ${event.commandName} took ${event.duration}ms`);
  }
});
```

## Quick Diagnostic Checklist

```mermaid
flowchart TD
    A[Timeout Error] --> B{Can ping host?}
    B -->|No| C[Check network/firewall]
    B -->|Yes| D{Can connect on port?}
    D -->|No| E[Check MongoDB running<br/>Check port binding]
    D -->|Yes| F{Auth succeeds?}
    F -->|No| G[Check credentials<br/>Check authSource]
    F -->|Yes| H{Pool available?}
    H -->|No| I[Increase pool size<br/>Check for leaks]
    H -->|Yes| J[Check server load<br/>Check slow queries]
```

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Immediate timeout | Network/Firewall | Check connectivity |
| Timeout after delay | DNS issues | Use IP or check DNS |
| Works then fails | Pool exhaustion | Increase pool, fix leaks |
| Intermittent timeouts | Network instability | Add retry logic |
| Timeout during peak | Server overload | Scale or optimize |

---

Connection timeout errors in MongoDB usually stem from network issues, misconfiguration, or resource exhaustion. Start by verifying basic connectivity, then check your connection string and pool settings. Implement proper retry logic and health checks in your application to handle transient failures gracefully. Monitor your connections and set up alerts to catch issues before they impact users.
