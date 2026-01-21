# How to Implement Connection Pooling for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection Pooling, Performance, Scalability, Backend, Database, High Availability

Description: A comprehensive guide to implementing connection pooling for Redis, covering pool sizing strategies, health checks, connection reuse patterns, and best practices for building scalable applications with optimal resource utilization.

---

Connection pooling is essential for building high-performance Redis applications. Instead of creating a new connection for each operation, connection pools maintain a set of reusable connections, significantly reducing latency and resource consumption. This guide covers pool sizing strategies, health checks, connection lifecycle management, and best practices for production deployments.

## Why Connection Pooling Matters

Creating a new Redis connection involves:

1. **TCP Handshake** - Three-way handshake adds latency
2. **TLS Negotiation** - Additional overhead for encrypted connections
3. **Redis AUTH** - Authentication adds another round-trip
4. **Memory Allocation** - Both client and server allocate buffers

For high-throughput applications, these costs accumulate quickly:

```
Without pooling: 1000 requests/sec x 5ms connection time = 5 seconds wasted per second
With pooling:    Connections reused, near-zero connection overhead
```

## Connection Pool Architecture

### Basic Pool Concepts

```
Application Threads          Connection Pool              Redis Server
     |                            |                            |
     |---[Request 1]------------>|                            |
     |                           |---[Reuse Conn A]---------->|
     |                           |<--[Response]---------------|
     |<--[Result 1]--------------|                            |
     |                           |                            |
     |---[Request 2]------------>|                            |
     |                           |---[Reuse Conn B]---------->|
     |                           |<--[Response]---------------|
     |<--[Result 2]--------------|                            |
```

### Key Components

1. **Idle Connections** - Ready to use immediately
2. **Active Connections** - Currently serving requests
3. **Connection Factory** - Creates new connections when needed
4. **Health Checker** - Validates connection health
5. **Evictor** - Removes stale or unhealthy connections

## Python Implementation

### Using redis-py with Connection Pooling

```python
import redis
from redis import ConnectionPool, BlockingConnectionPool
import time
import threading
from contextlib import contextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisPoolManager:
    """
    Manages Redis connection pools with health checking
    and automatic recovery.
    """

    def __init__(
        self,
        host: str = 'localhost',
        port: int = 6379,
        password: str = None,
        db: int = 0,
        max_connections: int = 50,
        min_idle: int = 5,
        max_idle_time: int = 300,
        connection_timeout: float = 5.0,
        socket_timeout: float = 5.0,
        health_check_interval: int = 30,
        use_ssl: bool = False
    ):
        self.config = {
            'host': host,
            'port': port,
            'password': password,
            'db': db,
            'max_connections': max_connections,
            'socket_connect_timeout': connection_timeout,
            'socket_timeout': socket_timeout,
            'ssl': use_ssl,
            'decode_responses': True,
            'health_check_interval': health_check_interval
        }

        self.min_idle = min_idle
        self.max_idle_time = max_idle_time
        self._pool = None
        self._client = None
        self._lock = threading.Lock()
        self._health_check_thread = None
        self._running = False

    def initialize(self):
        """Initialize the connection pool."""
        with self._lock:
            if self._pool is None:
                # BlockingConnectionPool waits for available connection
                # instead of raising an error when pool is exhausted
                self._pool = BlockingConnectionPool(
                    **self.config,
                    timeout=20  # Max wait time for available connection
                )
                self._client = redis.Redis(connection_pool=self._pool)

                # Warm up the pool with minimum idle connections
                self._warm_up_pool()

                # Start health check thread
                self._start_health_checker()

                logger.info(f"Redis pool initialized with max {self.config['max_connections']} connections")

    def _warm_up_pool(self):
        """Pre-create minimum idle connections."""
        connections = []
        try:
            for _ in range(self.min_idle):
                conn = self._pool.get_connection('PING')
                connections.append(conn)

            # Return connections to pool
            for conn in connections:
                self._pool.release(conn)

            logger.info(f"Pool warmed up with {self.min_idle} connections")
        except Exception as e:
            logger.error(f"Failed to warm up pool: {e}")

    def _start_health_checker(self):
        """Start background health check thread."""
        self._running = True
        self._health_check_thread = threading.Thread(
            target=self._health_check_loop,
            daemon=True
        )
        self._health_check_thread.start()

    def _health_check_loop(self):
        """Periodically check pool health."""
        while self._running:
            try:
                self._perform_health_check()
            except Exception as e:
                logger.error(f"Health check failed: {e}")
            time.sleep(self.config['health_check_interval'])

    def _perform_health_check(self):
        """Check Redis connectivity and pool status."""
        try:
            # Test connection
            start = time.time()
            result = self._client.ping()
            latency = (time.time() - start) * 1000

            if result:
                logger.debug(f"Health check passed, latency: {latency:.2f}ms")

            # Log pool statistics
            pool_stats = self.get_pool_stats()
            logger.debug(f"Pool stats: {pool_stats}")

        except redis.ConnectionError as e:
            logger.error(f"Redis connection error: {e}")
            self._reconnect()

    def _reconnect(self):
        """Attempt to reconnect to Redis."""
        logger.info("Attempting to reconnect to Redis...")
        try:
            self._pool.disconnect()
            time.sleep(1)  # Brief pause before reconnecting
            self._warm_up_pool()
            logger.info("Successfully reconnected to Redis")
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")

    def get_pool_stats(self) -> dict:
        """Get current pool statistics."""
        with self._lock:
            if self._pool is None:
                return {}

            return {
                'max_connections': self._pool.max_connections,
                'current_connections': len(self._pool._in_use_connections),
                'available_connections': len(self._pool._available_connections),
                'pid': self._pool.pid
            }

    @property
    def client(self) -> redis.Redis:
        """Get the Redis client instance."""
        if self._client is None:
            self.initialize()
        return self._client

    @contextmanager
    def get_connection(self):
        """Get a connection from the pool with automatic release."""
        conn = self._pool.get_connection('command')
        try:
            yield conn
        finally:
            self._pool.release(conn)

    def execute(self, command: str, *args, **kwargs):
        """Execute a Redis command with automatic retry."""
        max_retries = 3
        retry_delay = 0.1

        for attempt in range(max_retries):
            try:
                return getattr(self.client, command)(*args, **kwargs)
            except redis.ConnectionError as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Command failed, retrying in {retry_delay}s: {e}")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    raise

    def close(self):
        """Close the connection pool."""
        self._running = False
        if self._health_check_thread:
            self._health_check_thread.join(timeout=5)
        if self._pool:
            self._pool.disconnect()
            logger.info("Redis pool closed")


# Usage example
def main():
    # Create pool manager
    pool = RedisPoolManager(
        host='localhost',
        port=6379,
        max_connections=50,
        min_idle=5,
        health_check_interval=30
    )

    pool.initialize()

    # Use the client
    pool.client.set('key1', 'value1')
    value = pool.client.get('key1')
    print(f"Retrieved: {value}")

    # Check pool stats
    stats = pool.get_pool_stats()
    print(f"Pool stats: {stats}")

    # Clean up
    pool.close()


if __name__ == '__main__':
    main()
```

### Advanced Pool Configuration

```python
import redis
from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redis import ConnectionPool
import ssl

class AdvancedRedisPool:
    """
    Advanced Redis connection pool with SSL, retry logic,
    and circuit breaker pattern.
    """

    def __init__(self, config: dict):
        self.config = config
        self._pool = None
        self._client = None
        self._circuit_open = False
        self._failure_count = 0
        self._last_failure_time = 0
        self._circuit_threshold = 5
        self._circuit_timeout = 30

    def _create_ssl_context(self) -> ssl.SSLContext:
        """Create SSL context for secure connections."""
        ctx = ssl.create_default_context()

        if self.config.get('ssl_certfile'):
            ctx.load_cert_chain(
                certfile=self.config['ssl_certfile'],
                keyfile=self.config.get('ssl_keyfile')
            )

        if self.config.get('ssl_ca_certs'):
            ctx.load_verify_locations(self.config['ssl_ca_certs'])

        if self.config.get('ssl_check_hostname', True):
            ctx.check_hostname = True
        else:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        return ctx

    def _create_retry_strategy(self) -> Retry:
        """Create retry strategy with exponential backoff."""
        backoff = ExponentialBackoff(
            cap=10,  # Maximum backoff in seconds
            base=0.1  # Base backoff in seconds
        )

        return Retry(
            backoff=backoff,
            retries=3,
            supported_errors=(
                redis.ConnectionError,
                redis.TimeoutError,
                redis.BusyLoadingError
            )
        )

    def initialize(self):
        """Initialize the connection pool with all features."""
        pool_kwargs = {
            'host': self.config['host'],
            'port': self.config['port'],
            'password': self.config.get('password'),
            'db': self.config.get('db', 0),
            'max_connections': self.config.get('max_connections', 50),
            'socket_connect_timeout': self.config.get('connect_timeout', 5),
            'socket_timeout': self.config.get('socket_timeout', 5),
            'socket_keepalive': True,
            'socket_keepalive_options': {
                # TCP keepalive options (Linux)
                1: 60,   # TCP_KEEPIDLE - time before sending keepalive probes
                2: 10,   # TCP_KEEPINTVL - interval between probes
                3: 5     # TCP_KEEPCNT - number of failed probes before giving up
            },
            'decode_responses': True,
            'health_check_interval': self.config.get('health_check_interval', 30)
        }

        # Add SSL if configured
        if self.config.get('use_ssl'):
            pool_kwargs['ssl'] = True
            pool_kwargs['ssl_context'] = self._create_ssl_context()

        self._pool = ConnectionPool(**pool_kwargs)

        # Create client with retry strategy
        self._client = redis.Redis(
            connection_pool=self._pool,
            retry=self._create_retry_strategy(),
            retry_on_error=[
                redis.ConnectionError,
                redis.TimeoutError
            ]
        )

    def _check_circuit(self):
        """Check if circuit breaker allows requests."""
        if not self._circuit_open:
            return True

        # Check if circuit timeout has passed
        import time
        if time.time() - self._last_failure_time > self._circuit_timeout:
            self._circuit_open = False
            self._failure_count = 0
            return True

        return False

    def _record_failure(self):
        """Record a failure for circuit breaker."""
        import time
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._failure_count >= self._circuit_threshold:
            self._circuit_open = True
            logger.warning("Circuit breaker opened due to repeated failures")

    def _record_success(self):
        """Record a success - reset failure count."""
        self._failure_count = 0

    def execute_with_circuit_breaker(self, command: str, *args, **kwargs):
        """Execute command with circuit breaker protection."""
        if not self._check_circuit():
            raise redis.ConnectionError("Circuit breaker is open")

        try:
            result = getattr(self._client, command)(*args, **kwargs)
            self._record_success()
            return result
        except (redis.ConnectionError, redis.TimeoutError) as e:
            self._record_failure()
            raise


# Configuration example
config = {
    'host': 'redis.example.com',
    'port': 6379,
    'password': 'secret',
    'db': 0,
    'max_connections': 100,
    'connect_timeout': 5,
    'socket_timeout': 5,
    'health_check_interval': 30,
    'use_ssl': True,
    'ssl_certfile': '/path/to/client.crt',
    'ssl_keyfile': '/path/to/client.key',
    'ssl_ca_certs': '/path/to/ca.crt'
}

pool = AdvancedRedisPool(config)
pool.initialize()
```

## Node.js Implementation

### Using ioredis with Connection Pooling

```javascript
const Redis = require('ioredis');
const genericPool = require('generic-pool');
const EventEmitter = require('events');

/**
 * Redis Connection Pool Manager for Node.js
 * Provides connection pooling, health checks, and automatic recovery
 */
class RedisPoolManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            host: options.host || 'localhost',
            port: options.port || 6379,
            password: options.password,
            db: options.db || 0,
            maxConnections: options.maxConnections || 50,
            minConnections: options.minConnections || 5,
            acquireTimeout: options.acquireTimeout || 10000,
            idleTimeout: options.idleTimeout || 30000,
            connectionTimeout: options.connectionTimeout || 5000,
            healthCheckInterval: options.healthCheckInterval || 30000,
            enableTLS: options.enableTLS || false,
            tlsOptions: options.tlsOptions || {}
        };

        this.pool = null;
        this.healthCheckTimer = null;
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingRequests: 0,
            connectionErrors: 0,
            commandsExecuted: 0
        };
    }

    /**
     * Initialize the connection pool
     */
    async initialize() {
        const factory = {
            create: async () => {
                const redisOptions = {
                    host: this.options.host,
                    port: this.options.port,
                    password: this.options.password,
                    db: this.options.db,
                    connectTimeout: this.options.connectionTimeout,
                    commandTimeout: 5000,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            return null; // Stop retrying
                        }
                        return Math.min(times * 200, 2000);
                    },
                    lazyConnect: true,
                    enableReadyCheck: true,
                    maxRetriesPerRequest: 3
                };

                if (this.options.enableTLS) {
                    redisOptions.tls = this.options.tlsOptions;
                }

                const client = new Redis(redisOptions);

                client.on('error', (err) => {
                    this.stats.connectionErrors++;
                    this.emit('connectionError', err);
                });

                client.on('connect', () => {
                    this.emit('connectionCreated');
                });

                await client.connect();
                await client.ping(); // Validate connection

                this.stats.totalConnections++;
                return client;
            },

            destroy: async (client) => {
                this.stats.totalConnections--;
                await client.quit();
            },

            validate: async (client) => {
                try {
                    const result = await client.ping();
                    return result === 'PONG';
                } catch (err) {
                    return false;
                }
            }
        };

        this.pool = genericPool.createPool(factory, {
            max: this.options.maxConnections,
            min: this.options.minConnections,
            acquireTimeoutMillis: this.options.acquireTimeout,
            idleTimeoutMillis: this.options.idleTimeout,
            testOnBorrow: true,
            testOnReturn: true,
            evictionRunIntervalMillis: 30000,
            numTestsPerEvictionRun: 3
        });

        this.pool.on('factoryCreateError', (err) => {
            this.emit('poolError', err);
        });

        // Start health check
        this.startHealthCheck();

        console.log(`Redis pool initialized: max=${this.options.maxConnections}, min=${this.options.minConnections}`);
    }

    /**
     * Execute a Redis command using a pooled connection
     */
    async execute(command, ...args) {
        let client;

        try {
            client = await this.pool.acquire();
            this.stats.activeConnections++;

            const result = await client[command](...args);
            this.stats.commandsExecuted++;

            return result;
        } catch (err) {
            this.stats.connectionErrors++;
            throw err;
        } finally {
            if (client) {
                this.stats.activeConnections--;
                await this.pool.release(client);
            }
        }
    }

    /**
     * Execute multiple commands in a pipeline
     */
    async pipeline(commands) {
        let client;

        try {
            client = await this.pool.acquire();
            this.stats.activeConnections++;

            const pipeline = client.pipeline();

            for (const [command, ...args] of commands) {
                pipeline[command](...args);
            }

            const results = await pipeline.exec();
            this.stats.commandsExecuted += commands.length;

            return results;
        } finally {
            if (client) {
                this.stats.activeConnections--;
                await this.pool.release(client);
            }
        }
    }

    /**
     * Execute commands in a transaction
     */
    async transaction(commands) {
        let client;

        try {
            client = await this.pool.acquire();
            this.stats.activeConnections++;

            const multi = client.multi();

            for (const [command, ...args] of commands) {
                multi[command](...args);
            }

            const results = await multi.exec();
            this.stats.commandsExecuted += commands.length;

            return results;
        } finally {
            if (client) {
                this.stats.activeConnections--;
                await this.pool.release(client);
            }
        }
    }

    /**
     * Run a function with a dedicated connection
     */
    async withConnection(fn) {
        let client;

        try {
            client = await this.pool.acquire();
            this.stats.activeConnections++;

            return await fn(client);
        } finally {
            if (client) {
                this.stats.activeConnections--;
                await this.pool.release(client);
            }
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthCheck() {
        this.healthCheckTimer = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (err) {
                this.emit('healthCheckError', err);
            }
        }, this.options.healthCheckInterval);
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        const start = Date.now();

        try {
            await this.execute('ping');
            const latency = Date.now() - start;

            this.updateStats();

            this.emit('healthCheck', {
                healthy: true,
                latency,
                stats: this.getStats()
            });
        } catch (err) {
            this.emit('healthCheck', {
                healthy: false,
                error: err.message,
                stats: this.getStats()
            });
        }
    }

    /**
     * Update pool statistics
     */
    updateStats() {
        this.stats.idleConnections = this.pool.available;
        this.stats.waitingRequests = this.pool.pending;
    }

    /**
     * Get current statistics
     */
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }

    /**
     * Close the connection pool
     */
    async close() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        if (this.pool) {
            await this.pool.drain();
            await this.pool.clear();
        }

        console.log('Redis pool closed');
    }
}


// Usage example
async function main() {
    const pool = new RedisPoolManager({
        host: 'localhost',
        port: 6379,
        maxConnections: 50,
        minConnections: 5,
        healthCheckInterval: 30000
    });

    pool.on('healthCheck', (result) => {
        console.log('Health check:', result);
    });

    pool.on('connectionError', (err) => {
        console.error('Connection error:', err);
    });

    await pool.initialize();

    // Execute commands
    await pool.execute('set', 'key1', 'value1');
    const value = await pool.execute('get', 'key1');
    console.log('Retrieved:', value);

    // Pipeline
    const results = await pool.pipeline([
        ['set', 'key2', 'value2'],
        ['set', 'key3', 'value3'],
        ['get', 'key2'],
        ['get', 'key3']
    ]);
    console.log('Pipeline results:', results);

    // Get stats
    console.log('Stats:', pool.getStats());

    await pool.close();
}

main().catch(console.error);
```

### Cluster-Aware Connection Pool

```javascript
const Redis = require('ioredis');

/**
 * Redis Cluster connection pool with automatic node discovery
 * and read replica support
 */
class RedisClusterPool {
    constructor(options = {}) {
        this.options = {
            nodes: options.nodes || [
                { host: 'localhost', port: 7000 }
            ],
            scaleReads: options.scaleReads || 'slave',
            maxRedirections: options.maxRedirections || 16,
            retryDelayOnFailover: options.retryDelayOnFailover || 100,
            enableReadyCheck: true,
            slotsRefreshTimeout: options.slotsRefreshTimeout || 1000,
            slotsRefreshInterval: options.slotsRefreshInterval || 5000,
            natMap: options.natMap || {},
            lazyConnect: true
        };

        this.cluster = null;
        this.readReplicas = [];
        this.currentReplicaIndex = 0;
    }

    async initialize() {
        this.cluster = new Redis.Cluster(this.options.nodes, {
            scaleReads: this.options.scaleReads,
            maxRedirections: this.options.maxRedirections,
            retryDelayOnFailover: this.options.retryDelayOnFailover,
            enableReadyCheck: this.options.enableReadyCheck,
            slotsRefreshTimeout: this.options.slotsRefreshTimeout,
            slotsRefreshInterval: this.options.slotsRefreshInterval,
            natMap: this.options.natMap,
            lazyConnect: this.options.lazyConnect,

            // Connection options for each node
            redisOptions: {
                connectTimeout: 5000,
                commandTimeout: 5000,
                retryStrategy: (times) => {
                    if (times > 3) return null;
                    return Math.min(times * 200, 2000);
                }
            }
        });

        this.cluster.on('error', (err) => {
            console.error('Cluster error:', err);
        });

        this.cluster.on('+node', (node) => {
            console.log('Node added:', node.options.host, node.options.port);
        });

        this.cluster.on('-node', (node) => {
            console.log('Node removed:', node.options.host, node.options.port);
        });

        this.cluster.on('node error', (err, node) => {
            console.error('Node error:', node, err);
        });

        await this.cluster.connect();
        console.log('Redis Cluster connected');
    }

    /**
     * Execute a write command (goes to master)
     */
    async write(command, ...args) {
        return await this.cluster[command](...args);
    }

    /**
     * Execute a read command (can go to replica)
     */
    async read(command, ...args) {
        return await this.cluster[command](...args);
    }

    /**
     * Get cluster nodes information
     */
    async getNodes() {
        const nodes = this.cluster.nodes('all');
        return nodes.map(node => ({
            host: node.options.host,
            port: node.options.port,
            status: node.status
        }));
    }

    /**
     * Get cluster slots information
     */
    async getSlots() {
        return await this.cluster.cluster('slots');
    }

    async close() {
        if (this.cluster) {
            await this.cluster.quit();
        }
    }
}

// Usage
async function clusterExample() {
    const cluster = new RedisClusterPool({
        nodes: [
            { host: '127.0.0.1', port: 7000 },
            { host: '127.0.0.1', port: 7001 },
            { host: '127.0.0.1', port: 7002 }
        ],
        scaleReads: 'slave'  // Send reads to replicas
    });

    await cluster.initialize();

    // Write goes to master
    await cluster.write('set', 'mykey', 'myvalue');

    // Read can go to replica
    const value = await cluster.read('get', 'mykey');
    console.log('Value:', value);

    // Get cluster info
    const nodes = await cluster.getNodes();
    console.log('Cluster nodes:', nodes);

    await cluster.close();
}
```

## Pool Sizing Strategies

### Calculate Optimal Pool Size

```python
def calculate_pool_size(
    concurrent_requests: int,
    avg_command_time_ms: float,
    target_utilization: float = 0.7,
    safety_margin: float = 1.2
) -> int:
    """
    Calculate optimal connection pool size.

    Args:
        concurrent_requests: Expected concurrent requests
        avg_command_time_ms: Average command execution time in ms
        target_utilization: Target pool utilization (0.0-1.0)
        safety_margin: Safety multiplier for peak loads

    Returns:
        Recommended pool size
    """
    # Little's Law: L = lambda * W
    # L = average number of connections in use
    # lambda = arrival rate (requests per second)
    # W = average time in system (command time)

    # Assuming requests arrive evenly distributed
    requests_per_second = concurrent_requests
    avg_time_seconds = avg_command_time_ms / 1000

    # Average connections in use
    avg_in_use = requests_per_second * avg_time_seconds

    # Account for target utilization
    base_pool_size = avg_in_use / target_utilization

    # Add safety margin for bursts
    recommended_size = int(base_pool_size * safety_margin)

    # Ensure minimum pool size
    return max(recommended_size, 10)


# Example calculations
print("Pool size recommendations:")
print(f"Low load (100 req/s, 5ms): {calculate_pool_size(100, 5)}")
print(f"Medium load (500 req/s, 5ms): {calculate_pool_size(500, 5)}")
print(f"High load (1000 req/s, 5ms): {calculate_pool_size(1000, 5)}")
print(f"High latency (500 req/s, 20ms): {calculate_pool_size(500, 20)}")
```

### Dynamic Pool Sizing

```python
import threading
import time
from collections import deque
from typing import Optional

class DynamicPoolManager:
    """
    Dynamically adjusts pool size based on load.
    """

    def __init__(
        self,
        min_size: int = 5,
        max_size: int = 100,
        scale_up_threshold: float = 0.8,
        scale_down_threshold: float = 0.3,
        scale_interval: int = 30,
        metrics_window: int = 300  # 5 minutes
    ):
        self.min_size = min_size
        self.max_size = max_size
        self.current_size = min_size
        self.scale_up_threshold = scale_up_threshold
        self.scale_down_threshold = scale_down_threshold
        self.scale_interval = scale_interval

        # Metrics tracking
        self.metrics_window = metrics_window
        self.utilization_history = deque(maxlen=metrics_window)
        self.latency_history = deque(maxlen=metrics_window)

        self._lock = threading.Lock()
        self._scaler_thread: Optional[threading.Thread] = None
        self._running = False

    def record_metrics(self, active_connections: int, pool_size: int, latency_ms: float):
        """Record current metrics for scaling decisions."""
        utilization = active_connections / pool_size if pool_size > 0 else 0

        with self._lock:
            self.utilization_history.append({
                'timestamp': time.time(),
                'utilization': utilization,
                'active': active_connections,
                'pool_size': pool_size
            })
            self.latency_history.append({
                'timestamp': time.time(),
                'latency': latency_ms
            })

    def start_auto_scaling(self):
        """Start the auto-scaling thread."""
        self._running = True
        self._scaler_thread = threading.Thread(
            target=self._scaling_loop,
            daemon=True
        )
        self._scaler_thread.start()

    def stop_auto_scaling(self):
        """Stop the auto-scaling thread."""
        self._running = False
        if self._scaler_thread:
            self._scaler_thread.join(timeout=5)

    def _scaling_loop(self):
        """Main scaling loop."""
        while self._running:
            try:
                self._evaluate_scaling()
            except Exception as e:
                print(f"Scaling error: {e}")
            time.sleep(self.scale_interval)

    def _evaluate_scaling(self):
        """Evaluate if pool should be scaled."""
        with self._lock:
            if len(self.utilization_history) < 10:
                return  # Not enough data

            # Calculate average utilization over recent window
            recent = list(self.utilization_history)[-30:]
            avg_utilization = sum(m['utilization'] for m in recent) / len(recent)

            # Calculate average latency
            recent_latency = list(self.latency_history)[-30:]
            avg_latency = sum(m['latency'] for m in recent_latency) / len(recent_latency)

        # Scaling decisions
        if avg_utilization > self.scale_up_threshold:
            self._scale_up(avg_utilization, avg_latency)
        elif avg_utilization < self.scale_down_threshold:
            self._scale_down(avg_utilization, avg_latency)

    def _scale_up(self, utilization: float, latency: float):
        """Scale up the pool."""
        if self.current_size >= self.max_size:
            print(f"Cannot scale up: already at max ({self.max_size})")
            return

        # Scale by 20% or at least 5 connections
        increase = max(int(self.current_size * 0.2), 5)
        new_size = min(self.current_size + increase, self.max_size)

        print(f"Scaling up: {self.current_size} -> {new_size} "
              f"(utilization: {utilization:.2%}, latency: {latency:.1f}ms)")

        self.current_size = new_size

    def _scale_down(self, utilization: float, latency: float):
        """Scale down the pool."""
        if self.current_size <= self.min_size:
            return

        # Scale down by 10% or at least 2 connections
        decrease = max(int(self.current_size * 0.1), 2)
        new_size = max(self.current_size - decrease, self.min_size)

        print(f"Scaling down: {self.current_size} -> {new_size} "
              f"(utilization: {utilization:.2%}, latency: {latency:.1f}ms)")

        self.current_size = new_size

    def get_recommended_size(self) -> int:
        """Get the current recommended pool size."""
        return self.current_size


# Usage
scaler = DynamicPoolManager(
    min_size=10,
    max_size=100,
    scale_up_threshold=0.8,
    scale_down_threshold=0.3
)

scaler.start_auto_scaling()

# Simulate metrics recording
for i in range(100):
    # Simulate varying load
    active = int(20 + 30 * abs(i % 20 - 10) / 10)
    pool_size = scaler.get_recommended_size()
    latency = 5 + (active / pool_size) * 10

    scaler.record_metrics(active, pool_size, latency)
    time.sleep(0.1)

print(f"Final recommended size: {scaler.get_recommended_size()}")
scaler.stop_auto_scaling()
```

## Health Checks and Monitoring

### Comprehensive Health Checker

```python
import redis
import time
import threading
from dataclasses import dataclass
from typing import Optional, Callable
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class HealthCheckResult:
    status: HealthStatus
    latency_ms: float
    error: Optional[str] = None
    details: dict = None

class RedisHealthChecker:
    """
    Comprehensive health checker for Redis connections.
    """

    def __init__(
        self,
        client: redis.Redis,
        latency_threshold_ms: float = 100,
        degraded_threshold_ms: float = 50,
        check_interval: int = 10,
        on_health_change: Optional[Callable[[HealthCheckResult], None]] = None
    ):
        self.client = client
        self.latency_threshold_ms = latency_threshold_ms
        self.degraded_threshold_ms = degraded_threshold_ms
        self.check_interval = check_interval
        self.on_health_change = on_health_change

        self._last_status = HealthStatus.HEALTHY
        self._consecutive_failures = 0
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start the health checker."""
        self._running = True
        self._thread = threading.Thread(target=self._check_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the health checker."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _check_loop(self):
        """Main health check loop."""
        while self._running:
            result = self.check()

            if result.status != self._last_status:
                self._last_status = result.status
                if self.on_health_change:
                    self.on_health_change(result)

            time.sleep(self.check_interval)

    def check(self) -> HealthCheckResult:
        """Perform a health check."""
        try:
            # Measure ping latency
            start = time.time()
            self.client.ping()
            latency_ms = (time.time() - start) * 1000

            # Get server info for detailed health
            info = self.client.info()

            details = {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', 'N/A'),
                'used_memory_peak_human': info.get('used_memory_peak_human', 'N/A'),
                'total_connections_received': info.get('total_connections_received', 0),
                'rejected_connections': info.get('rejected_connections', 0),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'replication_role': info.get('role', 'unknown'),
                'connected_slaves': info.get('connected_slaves', 0)
            }

            # Determine health status
            if latency_ms > self.latency_threshold_ms:
                status = HealthStatus.UNHEALTHY
            elif latency_ms > self.degraded_threshold_ms:
                status = HealthStatus.DEGRADED
            else:
                status = HealthStatus.HEALTHY

            # Check for warning signs
            if details['rejected_connections'] > 0:
                status = max(status, HealthStatus.DEGRADED, key=lambda x: x.value)

            self._consecutive_failures = 0

            return HealthCheckResult(
                status=status,
                latency_ms=latency_ms,
                details=details
            )

        except redis.ConnectionError as e:
            self._consecutive_failures += 1
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                latency_ms=-1,
                error=str(e),
                details={'consecutive_failures': self._consecutive_failures}
            )

        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                latency_ms=-1,
                error=str(e)
            )


# Usage
def on_health_change(result: HealthCheckResult):
    print(f"Health status changed: {result.status.value}")
    if result.error:
        print(f"  Error: {result.error}")
    if result.details:
        print(f"  Details: {result.details}")

client = redis.Redis(host='localhost', port=6379)
checker = RedisHealthChecker(
    client=client,
    latency_threshold_ms=100,
    on_health_change=on_health_change
)

checker.start()

# Run for a while
time.sleep(60)

checker.stop()
```

### Prometheus Metrics Exporter

```python
from prometheus_client import Gauge, Counter, Histogram, start_http_server
import redis
import time
import threading

# Define metrics
POOL_SIZE = Gauge(
    'redis_pool_size',
    'Current size of the connection pool'
)

POOL_ACTIVE = Gauge(
    'redis_pool_active_connections',
    'Number of active connections'
)

POOL_IDLE = Gauge(
    'redis_pool_idle_connections',
    'Number of idle connections'
)

POOL_WAITING = Gauge(
    'redis_pool_waiting_requests',
    'Number of requests waiting for a connection'
)

COMMAND_DURATION = Histogram(
    'redis_command_duration_seconds',
    'Redis command execution duration',
    ['command'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

CONNECTION_ERRORS = Counter(
    'redis_connection_errors_total',
    'Total number of connection errors'
)

COMMANDS_TOTAL = Counter(
    'redis_commands_total',
    'Total number of commands executed',
    ['command']
)

class MetricsExporter:
    """
    Exports Redis pool metrics to Prometheus.
    """

    def __init__(self, pool_manager, export_port: int = 9090):
        self.pool_manager = pool_manager
        self.export_port = export_port
        self._running = False
        self._thread = None

    def start(self):
        """Start the metrics exporter."""
        # Start Prometheus HTTP server
        start_http_server(self.export_port)

        # Start metrics collection thread
        self._running = True
        self._thread = threading.Thread(target=self._collect_loop, daemon=True)
        self._thread.start()

        print(f"Metrics exporter started on port {self.export_port}")

    def stop(self):
        """Stop the metrics exporter."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _collect_loop(self):
        """Collect metrics periodically."""
        while self._running:
            self._collect_metrics()
            time.sleep(5)

    def _collect_metrics(self):
        """Collect current metrics from pool."""
        try:
            stats = self.pool_manager.get_pool_stats()

            POOL_SIZE.set(stats.get('max_connections', 0))
            POOL_ACTIVE.set(stats.get('current_connections', 0))
            POOL_IDLE.set(stats.get('available_connections', 0))

        except Exception as e:
            print(f"Error collecting metrics: {e}")

    def record_command(self, command: str, duration: float, error: bool = False):
        """Record a command execution."""
        COMMAND_DURATION.labels(command=command).observe(duration)
        COMMANDS_TOTAL.labels(command=command).inc()

        if error:
            CONNECTION_ERRORS.inc()


# Instrumented client wrapper
class InstrumentedRedisClient:
    """
    Redis client wrapper with Prometheus instrumentation.
    """

    def __init__(self, client: redis.Redis, metrics: MetricsExporter):
        self._client = client
        self._metrics = metrics

    def __getattr__(self, name):
        attr = getattr(self._client, name)

        if callable(attr):
            def wrapper(*args, **kwargs):
                start = time.time()
                error = False
                try:
                    return attr(*args, **kwargs)
                except Exception as e:
                    error = True
                    raise
                finally:
                    duration = time.time() - start
                    self._metrics.record_command(name, duration, error)
            return wrapper
        return attr
```

## Best Practices

### Connection Pool Configuration Checklist

```python
"""
Redis Connection Pool Best Practices Configuration
"""

POOL_CONFIG = {
    # Pool sizing
    'max_connections': 50,        # Based on load calculation
    'min_idle_connections': 5,    # Keep warm connections ready

    # Timeouts
    'connect_timeout': 5.0,       # Connection establishment timeout
    'socket_timeout': 5.0,        # Operation timeout
    'socket_keepalive': True,     # Enable TCP keepalive

    # Keepalive options (Linux)
    'socket_keepalive_options': {
        'TCP_KEEPIDLE': 60,       # Seconds before sending probes
        'TCP_KEEPINTVL': 10,      # Interval between probes
        'TCP_KEEPCNT': 5          # Failed probes before disconnect
    },

    # Health checking
    'health_check_interval': 30,  # Seconds between health checks

    # Retry configuration
    'retry_on_timeout': True,
    'max_retries': 3,
    'retry_backoff': 'exponential',

    # Connection validation
    'test_on_borrow': True,       # Validate before use
    'test_on_return': True,       # Validate after use
    'test_while_idle': True,      # Validate idle connections

    # Eviction
    'eviction_interval': 30,      # How often to check for idle connections
    'max_idle_time': 300,         # Max time a connection can be idle
    'min_evictable_idle_time': 60 # Minimum idle time before eviction
}

# Environment-specific adjustments
DEVELOPMENT_OVERRIDES = {
    'max_connections': 10,
    'min_idle_connections': 2,
    'health_check_interval': 60
}

PRODUCTION_OVERRIDES = {
    'max_connections': 100,
    'min_idle_connections': 20,
    'health_check_interval': 15
}
```

### Common Anti-Patterns to Avoid

```python
# ANTI-PATTERN 1: Creating new connections per request
def bad_example_1():
    # DON'T DO THIS
    client = redis.Redis()  # New connection each time
    value = client.get('key')
    client.close()  # Connection overhead on every request
    return value

# CORRECT: Use connection pool
pool = redis.ConnectionPool(max_connections=50)
client = redis.Redis(connection_pool=pool)

def good_example_1():
    return client.get('key')  # Reuses pooled connection


# ANTI-PATTERN 2: Unbounded pool size
def bad_example_2():
    # DON'T DO THIS - can exhaust server connections
    pool = redis.ConnectionPool(max_connections=10000)

# CORRECT: Size pool appropriately
def good_example_2():
    pool = redis.ConnectionPool(max_connections=50)


# ANTI-PATTERN 3: Ignoring connection errors
def bad_example_3():
    try:
        client.set('key', 'value')
    except:
        pass  # Silently ignoring errors

# CORRECT: Handle errors appropriately
def good_example_3():
    try:
        client.set('key', 'value')
    except redis.ConnectionError:
        # Log, retry, or fail gracefully
        logger.error("Redis connection failed")
        raise


# ANTI-PATTERN 4: Not closing connections on shutdown
def bad_example_4():
    pool = redis.ConnectionPool()
    # Application exits without cleanup

# CORRECT: Clean shutdown
def good_example_4():
    pool = redis.ConnectionPool()
    try:
        # Application logic
        pass
    finally:
        pool.disconnect()  # Clean up connections
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection timeout | Pool exhausted | Increase pool size or check for leaks |
| High latency | Too many connections | Reduce pool size, use pipelining |
| Connection refused | Max clients reached | Increase Redis maxclients |
| Stale connections | Long idle time | Enable health checks, reduce idle timeout |
| Memory issues | Too many connections | Right-size pool, monitor memory |

### Debugging Connection Issues

```python
import redis
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
redis_logger = logging.getLogger('redis')
redis_logger.setLevel(logging.DEBUG)

# Check pool status
def debug_pool(pool: redis.ConnectionPool):
    """Print detailed pool debugging information."""
    print(f"Max connections: {pool.max_connections}")
    print(f"In use: {len(pool._in_use_connections)}")
    print(f"Available: {len(pool._available_connections)}")
    print(f"PID: {pool.pid}")

    # Check each connection
    for conn in pool._available_connections:
        print(f"  Available: {conn.host}:{conn.port} - {conn.pid}")

    for conn in pool._in_use_connections:
        print(f"  In use: {conn.host}:{conn.port} - {conn.pid}")


# Check Redis server connection info
def check_redis_connections(client: redis.Redis):
    """Check Redis server connection information."""
    info = client.info()

    print(f"Connected clients: {info['connected_clients']}")
    print(f"Max clients: {info['maxclients']}")
    print(f"Blocked clients: {info['blocked_clients']}")
    print(f"Total connections received: {info['total_connections_received']}")
    print(f"Rejected connections: {info['rejected_connections']}")

    # List all clients
    clients = client.client_list()
    print(f"\nActive clients ({len(clients)}):")
    for c in clients[:10]:  # Show first 10
        print(f"  {c['addr']} - age:{c['age']}s idle:{c['idle']}s cmd:{c['cmd']}")
```

## Summary

Effective Redis connection pooling involves:

1. **Right-sizing** - Calculate pool size based on load and latency
2. **Health checking** - Validate connections regularly
3. **Proper timeouts** - Set appropriate connection and command timeouts
4. **Error handling** - Implement retry logic with backoff
5. **Monitoring** - Track pool metrics and alert on issues
6. **Clean shutdown** - Release resources properly

Connection pooling is foundational for building high-performance Redis applications. Combined with proper monitoring and dynamic scaling, it ensures your application can handle varying loads while maintaining low latency and high reliability.
