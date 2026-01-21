# How to Configure BullMQ Connection Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Redis, Node.js, Connection Pooling, TLS, High Availability, Failover

Description: A comprehensive guide to configuring BullMQ connection options including Redis connection pooling, TLS encryption, Sentinel failover, cluster mode, and best practices for production deployments.

---

BullMQ relies on Redis for all its operations, making proper connection configuration critical for reliability and performance. This guide covers everything from basic connections to advanced setups with TLS, Sentinel, and Redis Cluster.

## Basic Connection Configuration

The simplest way to connect BullMQ to Redis:

```typescript
import { Queue, Worker } from 'bullmq';

// Basic connection with host and port
const queue = new Queue('my-queue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Connection with password
const secureQueue = new Queue('secure-queue', {
  connection: {
    host: 'redis.example.com',
    port: 6379,
    password: 'your-redis-password',
  },
});

// Connection with database selection
const dbQueue = new Queue('db-queue', {
  connection: {
    host: 'localhost',
    port: 6379,
    db: 2, // Use database 2
  },
});
```

## Using Connection URLs

You can also use Redis URLs for simpler configuration:

```typescript
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Using Redis URL
const connection = new Redis('redis://:password@redis.example.com:6379/0');

const queue = new Queue('my-queue', { connection });

// URL with TLS
const tlsConnection = new Redis('rediss://:password@redis.example.com:6380/0');

const secureQueue = new Queue('secure-queue', {
  connection: tlsConnection,
});
```

## Shared Connection Pattern

For optimal resource usage, share connections across queues and workers:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// Create a shared connection factory
function createConnection(): Redis {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    // Critical settings for BullMQ
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// Shared connection for all components
const sharedConnection = createConnection();

// Multiple queues using the same connection
const emailQueue = new Queue('email', { connection: sharedConnection });
const notificationQueue = new Queue('notification', { connection: sharedConnection });
const analyticsQueue = new Queue('analytics', { connection: sharedConnection });

// Workers can share a different connection instance
const workerConnection = createConnection();

const emailWorker = new Worker('email', async (job) => {
  // Process email
}, { connection: workerConnection });

const notificationWorker = new Worker('notification', async (job) => {
  // Process notification
}, { connection: workerConnection });
```

## Connection Pool Configuration

For high-throughput applications, configure connection pooling:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis, Cluster } from 'ioredis';

interface PooledConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxConnections: number;
}

class ConnectionPool {
  private connections: Redis[] = [];
  private currentIndex = 0;
  private options: PooledConnectionOptions;

  constructor(options: PooledConnectionOptions) {
    this.options = options;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.options.maxConnections; i++) {
      const connection = new Redis({
        host: this.options.host,
        port: this.options.port,
        password: this.options.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.connections.push(connection);
    }
  }

  getConnection(): Redis {
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return connection;
  }

  async closeAll() {
    await Promise.all(this.connections.map(conn => conn.quit()));
  }
}

// Usage
const pool = new ConnectionPool({
  host: 'redis.example.com',
  port: 6379,
  password: 'secret',
  maxConnections: 10,
});

// Create queues with pooled connections
const queues = ['email', 'notification', 'analytics', 'reporting'].map(
  name => new Queue(name, { connection: pool.getConnection() })
);
```

## TLS/SSL Configuration

For encrypted connections to Redis:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

// Basic TLS connection
const tlsConnection = new Redis({
  host: 'redis.example.com',
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    // Empty object enables TLS with default settings
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// TLS with certificate verification
const certConnection = new Redis({
  host: 'redis.example.com',
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    ca: fs.readFileSync(path.join(__dirname, 'certs/ca.crt')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/client.crt')),
    key: fs.readFileSync(path.join(__dirname, 'certs/client.key')),
    rejectUnauthorized: true,
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// TLS with SNI (Server Name Indication)
const sniConnection = new Redis({
  host: 'redis.example.com',
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: {
    servername: 'redis.example.com',
    ca: fs.readFileSync(path.join(__dirname, 'certs/ca.crt')),
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Create queue with TLS connection
const secureQueue = new Queue('secure-jobs', {
  connection: tlsConnection,
});

// AWS ElastiCache with TLS
const elastiCacheConnection = new Redis({
  host: 'my-cluster.xxxxx.use1.cache.amazonaws.com',
  port: 6379,
  tls: {
    // AWS ElastiCache uses TLS but doesn't require client certificates
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

## Redis Sentinel Configuration

For high availability with automatic failover:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Sentinel connection
const sentinelConnection = new Redis({
  sentinels: [
    { host: 'sentinel-1.example.com', port: 26379 },
    { host: 'sentinel-2.example.com', port: 26379 },
    { host: 'sentinel-3.example.com', port: 26379 },
  ],
  name: 'mymaster', // Sentinel master name
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.SENTINEL_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Sentinel-specific options
  sentinelRetryStrategy: (times: number) => {
    return Math.min(times * 100, 3000);
  },
});

// Handle connection events
sentinelConnection.on('connect', () => {
  console.log('Connected to Redis via Sentinel');
});

sentinelConnection.on('+switch-master', (master) => {
  console.log('Sentinel switched to new master:', master);
});

sentinelConnection.on('error', (error) => {
  console.error('Sentinel connection error:', error);
});

// Create queue with Sentinel connection
const haQueue = new Queue('ha-queue', {
  connection: sentinelConnection,
});

// Sentinel with TLS
const secureSentinelConnection = new Redis({
  sentinels: [
    { host: 'sentinel-1.example.com', port: 26379 },
    { host: 'sentinel-2.example.com', port: 26379 },
    { host: 'sentinel-3.example.com', port: 26379 },
  ],
  name: 'mymaster',
  password: process.env.REDIS_PASSWORD,
  sentinelPassword: process.env.SENTINEL_PASSWORD,
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
  },
  sentinelTLS: {
    ca: fs.readFileSync('/path/to/sentinel-ca.crt'),
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

## Redis Cluster Configuration

For horizontal scaling with Redis Cluster:

```typescript
import { Queue, Worker } from 'bullmq';
import { Cluster } from 'ioredis';

// Redis Cluster connection
const clusterConnection = new Cluster(
  [
    { host: 'redis-node-1.example.com', port: 6379 },
    { host: 'redis-node-2.example.com', port: 6379 },
    { host: 'redis-node-3.example.com', port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    // Cluster-specific options
    clusterRetryStrategy: (times: number) => {
      return Math.min(times * 100, 3000);
    },
    enableOfflineQueue: true,
    scaleReads: 'slave', // Read from replicas
  }
);

// Handle cluster events
clusterConnection.on('connect', () => {
  console.log('Connected to Redis Cluster');
});

clusterConnection.on('node error', (error, node) => {
  console.error(`Error on node ${node}:`, error);
});

clusterConnection.on('+node', (node) => {
  console.log('New node added:', node.options.host);
});

clusterConnection.on('-node', (node) => {
  console.log('Node removed:', node.options.host);
});

// Create queue with cluster connection
// Note: BullMQ requires all keys for a queue to be on the same node
// Use hash tags to ensure this
const clusterQueue = new Queue('{my-app}:jobs', {
  connection: clusterConnection,
});

// Cluster with TLS
const secureClusterConnection = new Cluster(
  [
    { host: 'redis-node-1.example.com', port: 6380 },
    { host: 'redis-node-2.example.com', port: 6380 },
    { host: 'redis-node-3.example.com', port: 6380 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: {
        ca: fs.readFileSync('/path/to/ca.crt'),
      },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
  }
);
```

## Connection Retry Strategies

Configure how BullMQ handles connection failures:

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Custom retry strategy
const connection = new Redis({
  host: 'redis.example.com',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Retry strategy for initial connection and reconnection
  retryStrategy: (times: number) => {
    if (times > 10) {
      // Stop retrying after 10 attempts
      console.error('Redis connection failed after 10 retries');
      return null;
    }
    // Exponential backoff with max 30 seconds
    const delay = Math.min(times * 1000, 30000);
    console.log(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  // Reconnection settings
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
});

// Connection event handling
connection.on('connect', () => {
  console.log('Redis connected');
});

connection.on('ready', () => {
  console.log('Redis ready to accept commands');
});

connection.on('error', (error) => {
  console.error('Redis error:', error.message);
});

connection.on('close', () => {
  console.log('Redis connection closed');
});

connection.on('reconnecting', (delay: number) => {
  console.log(`Reconnecting to Redis in ${delay}ms`);
});

connection.on('end', () => {
  console.log('Redis connection ended');
});

const queue = new Queue('resilient-queue', { connection });
```

## Environment-Based Configuration

Create a configuration module for different environments:

```typescript
// src/config/redis.config.ts

import { Redis, Cluster, RedisOptions, ClusterOptions } from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  sentinel?: {
    nodes: Array<{ host: string; port: number }>;
    masterName: string;
    sentinelPassword?: string;
  };
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
  };
}

function getRedisConfig(): RedisConfig {
  const env = process.env.NODE_ENV || 'development';

  const configs: Record<string, RedisConfig> = {
    development: {
      host: 'localhost',
      port: 6379,
    },
    test: {
      host: 'localhost',
      port: 6380,
      db: 15,
    },
    staging: {
      host: process.env.REDIS_HOST || 'redis-staging.example.com',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: true,
    },
    production: {
      host: process.env.REDIS_HOST || 'redis-prod.example.com',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: true,
      sentinel: process.env.REDIS_SENTINEL_ENABLED === 'true'
        ? {
            nodes: [
              { host: 'sentinel-1.example.com', port: 26379 },
              { host: 'sentinel-2.example.com', port: 26379 },
              { host: 'sentinel-3.example.com', port: 26379 },
            ],
            masterName: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
            sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
          }
        : undefined,
    },
  };

  return configs[env] || configs.development;
}

export function createBullMQConnection(): Redis | Cluster {
  const config = getRedisConfig();
  const baseOptions: Partial<RedisOptions> = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 1000, 30000),
  };

  // Cluster mode
  if (config.cluster) {
    return new Cluster(config.cluster.nodes, {
      redisOptions: {
        password: config.password,
        tls: config.tls ? {} : undefined,
        ...baseOptions,
      },
    });
  }

  // Sentinel mode
  if (config.sentinel) {
    return new Redis({
      sentinels: config.sentinel.nodes,
      name: config.sentinel.masterName,
      password: config.password,
      sentinelPassword: config.sentinel.sentinelPassword,
      tls: config.tls ? {} : undefined,
      ...baseOptions,
    });
  }

  // Standard mode
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    tls: config.tls ? {} : undefined,
    ...baseOptions,
  });
}

// Export singleton connection
let connection: Redis | Cluster | null = null;

export function getConnection(): Redis | Cluster {
  if (!connection) {
    connection = createBullMQConnection();
  }
  return connection;
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
```

## Connection Health Checks

Implement health checks for monitoring:

```typescript
import { Redis } from 'ioredis';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
  info?: {
    redisVersion: string;
    connectedClients: number;
    usedMemory: string;
    uptime: number;
  };
}

async function checkRedisHealth(connection: Redis): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Ping test
    await connection.ping();
    const latency = Date.now() - startTime;

    // Get Redis info
    const info = await connection.info();
    const infoLines = info.split('\r\n');
    const getValue = (key: string): string => {
      const line = infoLines.find(l => l.startsWith(`${key}:`));
      return line ? line.split(':')[1] : '';
    };

    return {
      status: 'healthy',
      latency,
      info: {
        redisVersion: getValue('redis_version'),
        connectedClients: parseInt(getValue('connected_clients')) || 0,
        usedMemory: getValue('used_memory_human'),
        uptime: parseInt(getValue('uptime_in_seconds')) || 0,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Express health endpoint example
import express from 'express';

const app = express();
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

app.get('/health/redis', async (req, res) => {
  const health = await checkRedisHealth(connection);
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## Connection Timeouts

Configure various timeouts for reliability:

```typescript
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'redis.example.com',
  port: 6379,
  password: process.env.REDIS_PASSWORD,

  // Connection timeout (time to establish connection)
  connectTimeout: 10000, // 10 seconds

  // Command timeout (time for a command to complete)
  commandTimeout: 5000, // 5 seconds

  // Socket keepalive
  keepAlive: 30000, // 30 seconds

  // Disable offline queue to fail fast
  enableOfflineQueue: false,

  // BullMQ required settings
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  // Auto-reconnect settings
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
});

// Per-command timeout
async function executeWithTimeout<T>(
  connection: Redis,
  command: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    command(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Command timeout')), timeout)
    ),
  ]);
}

// Usage
const result = await executeWithTimeout(
  connection,
  () => connection.get('key'),
  1000 // 1 second timeout
);
```

## Best Practices

1. **Always set `maxRetriesPerRequest: null`** - This is required for BullMQ to handle blocking commands properly.

2. **Set `enableReadyCheck: false`** - Prevents issues with Redis Cluster and Sentinel.

3. **Share connections wisely** - Share connections within the same process but use separate connection instances for queues and workers.

4. **Use connection pooling for high throughput** - Create multiple connections for applications processing many jobs.

5. **Configure retry strategies** - Implement exponential backoff with maximum retry limits.

6. **Enable TLS in production** - Always encrypt Redis connections in production environments.

7. **Monitor connection health** - Implement health checks and alerting for Redis connections.

8. **Handle connection events** - Listen to connection events to log issues and trigger alerts.

9. **Use environment variables** - Never hardcode credentials; use environment variables or secret management.

10. **Test failover scenarios** - Regularly test Sentinel failover and Cluster resharding.

## Conclusion

Proper connection configuration is essential for building reliable BullMQ applications. Whether you're running a simple development setup or a highly available production system with Redis Sentinel or Cluster, understanding these connection options helps you build robust job processing systems. Always test your connection configuration under failure scenarios to ensure your application handles Redis outages gracefully.
