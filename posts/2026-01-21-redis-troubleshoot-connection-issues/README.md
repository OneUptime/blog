# How to Troubleshoot Redis Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Connections, Networking, Timeout, Debugging

Description: A comprehensive guide to troubleshooting Redis connection issues, covering timeout debugging, connection limits, network problems, and client-side tuning for reliable Redis connectivity.

---

Connection issues are among the most common Redis problems in production. They can manifest as timeouts, connection refused errors, or intermittent failures. This guide provides systematic approaches to diagnose and resolve Redis connection issues.

## Common Connection Error Types

### 1. Connection Refused

```
redis.exceptions.ConnectionError: Error 111 connecting to redis:6379. Connection refused.
```

**Causes**:
- Redis not running
- Firewall blocking connections
- Wrong host/port
- Redis binding to wrong interface

### 2. Connection Timeout

```
redis.exceptions.TimeoutError: Timeout reading from socket
```

**Causes**:
- Network latency
- Redis overloaded
- Slow commands blocking
- TCP keepalive issues

### 3. Connection Reset

```
redis.exceptions.ConnectionError: Connection reset by peer
```

**Causes**:
- Redis crashed
- maxclients exceeded
- Client timeout on server
- Network interruption

### 4. Authentication Failed

```
redis.exceptions.AuthenticationError: NOAUTH Authentication required
```

**Causes**:
- Password required but not provided
- Wrong password
- ACL user doesn't exist

## Diagnostic Commands

### Check Redis Status

```bash
# Is Redis running?
systemctl status redis
# or
docker ps | grep redis

# Can we connect locally?
redis-cli ping

# Check Redis info
redis-cli INFO server
redis-cli INFO clients
redis-cli INFO stats
```

### Check Network Connectivity

```bash
# Test TCP connectivity
nc -zv redis-host 6379

# Check if port is listening
netstat -tlnp | grep 6379
# or
ss -tlnp | grep 6379

# Test from application server
telnet redis-host 6379

# DNS resolution
nslookup redis-host
dig redis-host
```

### Check Client Connections

```bash
# List all connected clients
redis-cli CLIENT LIST

# Count connections
redis-cli INFO clients | grep connected_clients

# Check connection limits
redis-cli CONFIG GET maxclients
```

## Troubleshooting by Error Type

### Connection Refused

```python
def troubleshoot_connection_refused():
    """Diagnose 'Connection Refused' errors."""

    print("=== Connection Refused Troubleshooting ===\n")

    # Step 1: Check if Redis is running
    print("1. Check if Redis is running:")
    print("   systemctl status redis")
    print("   docker ps | grep redis")
    print()

    # Step 2: Check binding configuration
    print("2. Check Redis binding configuration:")
    print("   redis-cli CONFIG GET bind")
    print("   # If returns '127.0.0.1', Redis only accepts local connections")
    print("   # To allow remote: CONFIG SET bind '0.0.0.0' (restart required)")
    print()

    # Step 3: Check protected mode
    print("3. Check protected mode:")
    print("   redis-cli CONFIG GET protected-mode")
    print("   # If 'yes' and no password, remote connections blocked")
    print()

    # Step 4: Check firewall
    print("4. Check firewall rules:")
    print("   iptables -L -n | grep 6379")
    print("   ufw status")
    print()

    # Step 5: Verify port
    print("5. Verify Redis is listening on expected port:")
    print("   redis-cli CONFIG GET port")
    print("   ss -tlnp | grep redis")

troubleshoot_connection_refused()
```

### Connection Timeout

```python
import redis
import time
import socket

def diagnose_timeout(host, port=6379, timeout=5):
    """Diagnose connection timeout issues."""

    print(f"=== Timeout Diagnosis for {host}:{port} ===\n")

    # Step 1: Measure TCP connection time
    print("1. TCP Connection Time:")
    try:
        start = time.time()
        sock = socket.create_connection((host, port), timeout=timeout)
        tcp_time = (time.time() - start) * 1000
        sock.close()
        print(f"   TCP connect: {tcp_time:.2f}ms")
        if tcp_time > 100:
            print("   WARNING: High TCP latency - check network")
    except socket.timeout:
        print("   FAILED: TCP connection timeout")
        print("   Check: Network connectivity, firewall, DNS")
        return
    except Exception as e:
        print(f"   FAILED: {e}")
        return

    # Step 2: Measure Redis PING time
    print("\n2. Redis PING Time:")
    try:
        r = redis.Redis(host=host, port=port, socket_timeout=timeout)
        start = time.time()
        r.ping()
        ping_time = (time.time() - start) * 1000
        print(f"   PING: {ping_time:.2f}ms")
        if ping_time > 10:
            print("   WARNING: High PING latency - check Redis load")
    except redis.TimeoutError:
        print("   FAILED: Redis command timeout")
        print("   Check: Redis is overloaded, slow commands")
        return

    # Step 3: Check for slow commands
    print("\n3. Checking for slow commands:")
    try:
        slowlog = r.slowlog_get(10)
        if slowlog:
            print(f"   Found {len(slowlog)} slow commands:")
            for entry in slowlog[:5]:
                duration_ms = entry['duration'] / 1000
                cmd = ' '.join(str(arg) for arg in entry['command'][:3])
                print(f"   - {cmd}... ({duration_ms:.2f}ms)")
        else:
            print("   No slow commands found")
    except:
        pass

    # Step 4: Check connected clients
    print("\n4. Connected clients:")
    try:
        info = r.info('clients')
        print(f"   Connected: {info['connected_clients']}")
        print(f"   Blocked: {info['blocked_clients']}")

        maxclients = int(r.config_get('maxclients')['maxclients'])
        usage = info['connected_clients'] / maxclients * 100
        print(f"   Max clients: {maxclients} ({usage:.1f}% used)")

        if usage > 80:
            print("   WARNING: High connection usage")
    except:
        pass

    # Step 5: Check memory pressure
    print("\n5. Memory status:")
    try:
        info = r.info('memory')
        used = info['used_memory']
        maxmem = info.get('maxmemory', 0)
        if maxmem > 0:
            usage = used / maxmem * 100
            print(f"   Memory: {usage:.1f}% used")
            if usage > 90:
                print("   WARNING: High memory usage may cause slowdown")
    except:
        pass

# Run diagnosis
diagnose_timeout('redis.example.com')
```

### Too Many Connections

```python
def diagnose_too_many_connections(host, port=6379):
    """Diagnose 'too many connections' issues."""

    r = redis.Redis(host=host, port=port, decode_responses=True)

    print("=== Connection Limit Diagnosis ===\n")

    # Get current state
    info = r.info('clients')
    config = r.config_get('maxclients')

    connected = info['connected_clients']
    maxclients = int(config['maxclients'])

    print(f"Connected clients: {connected}")
    print(f"Max clients: {maxclients}")
    print(f"Available: {maxclients - connected}")

    # Analyze client list
    clients = r.client_list()

    # Group by source
    sources = {}
    for client in clients:
        addr = client.get('addr', 'unknown').split(':')[0]
        sources[addr] = sources.get(addr, 0) + 1

    print(f"\nConnections by source IP:")
    for addr, count in sorted(sources.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {addr}: {count}")

    # Check for idle connections
    idle_connections = [c for c in clients if int(c.get('idle', 0)) > 300]
    print(f"\nIdle connections (> 5min): {len(idle_connections)}")

    # Check for connections without names
    unnamed = [c for c in clients if not c.get('name')]
    print(f"Unnamed connections: {len(unnamed)}")

    # Recommendations
    print("\n=== Recommendations ===")

    if connected > maxclients * 0.8:
        print("- Increase maxclients or reduce connection usage")
        print(f"  CONFIG SET maxclients {int(maxclients * 1.5)}")

    if idle_connections:
        print("- Set client timeout to close idle connections")
        print("  CONFIG SET timeout 300")

    if any(sources.get(addr, 0) > 100 for addr in sources):
        print("- Some clients have too many connections")
        print("  Consider connection pooling")

diagnose_too_many_connections('localhost')
```

## Connection Pooling Best Practices

### Python Connection Pool

```python
import redis
from redis import ConnectionPool

# Create a connection pool
pool = ConnectionPool(
    host='redis.example.com',
    port=6379,
    password='your-password',
    max_connections=50,          # Maximum pool size
    socket_timeout=5,            # Command timeout
    socket_connect_timeout=5,    # Connection timeout
    socket_keepalive=True,       # Enable TCP keepalive
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 120,   # Start keepalive after 120s idle
        socket.TCP_KEEPINTVL: 30,   # Keepalive interval
        socket.TCP_KEEPCNT: 3,      # Number of retries
    },
    health_check_interval=30,    # Check connection health
    retry_on_timeout=True,       # Retry on timeout
)

# Use the pool
r = redis.Redis(connection_pool=pool)

# Check pool status
def check_pool_status(pool):
    """Check connection pool health."""
    print(f"Pool: {pool}")
    print(f"Max connections: {pool.max_connections}")
    print(f"Current connections: {len(pool._available_connections) + len(pool._in_use_connections)}")
    print(f"Available: {len(pool._available_connections)}")
    print(f"In use: {len(pool._in_use_connections)}")
```

### Node.js Connection Pool

```javascript
const Redis = require('ioredis');

// Create client with proper settings
const redis = new Redis({
    host: 'redis.example.com',
    port: 6379,
    password: 'your-password',

    // Connection settings
    connectTimeout: 10000,       // 10s connection timeout
    commandTimeout: 5000,        // 5s command timeout

    // Retry settings
    retryStrategy: (times) => {
        if (times > 3) {
            return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
    },

    // Reconnect settings
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
    },

    // Keep-alive
    keepAlive: 30000,

    // Connection pool (for cluster)
    maxRetriesPerRequest: 3,
});

// Event handlers
redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

redis.on('close', () => {
    console.log('Connection closed');
});

// Health check
async function healthCheck() {
    try {
        const start = Date.now();
        await redis.ping();
        const latency = Date.now() - start;
        console.log(`Redis healthy, latency: ${latency}ms`);
        return true;
    } catch (err) {
        console.error('Redis health check failed:', err);
        return false;
    }
}

setInterval(healthCheck, 30000);
```

## Network-Level Troubleshooting

### TCP Connection Analysis

```bash
# Check for connection states
ss -tan state established | grep 6379

# Count connections by state
ss -tan | grep 6379 | awk '{print $1}' | sort | uniq -c

# Check for TIME_WAIT connections
ss -tan state time-wait | grep 6379 | wc -l

# Monitor connections in real-time
watch -n 1 'ss -tan | grep 6379 | wc -l'
```

### Network Latency Analysis

```bash
# Measure latency to Redis
redis-cli --latency -h redis.example.com

# Measure latency with histogram
redis-cli --latency-history -h redis.example.com

# Intrinsic latency test (run on Redis server)
redis-cli --intrinsic-latency 10

# TCP traceroute
traceroute -T -p 6379 redis.example.com

# MTR for continuous monitoring
mtr redis.example.com
```

### Packet Capture

```bash
# Capture Redis traffic
tcpdump -i eth0 port 6379 -w redis_traffic.pcap

# Quick analysis
tcpdump -i eth0 port 6379 -c 100 -nn

# Filter specific host
tcpdump -i eth0 host redis.example.com and port 6379
```

## Redis Server-Side Configuration

### Optimize for High Connections

```bash
# Increase max clients
CONFIG SET maxclients 10000

# Set client timeout (close idle connections)
CONFIG SET timeout 300

# Enable TCP keepalive
CONFIG SET tcp-keepalive 60

# Adjust TCP backlog for high connection rate
CONFIG SET tcp-backlog 511

# Make changes persistent
CONFIG REWRITE
```

### Client Output Buffer Limits

```bash
# Check current limits
CONFIG GET client-output-buffer-limit

# Set limits for normal clients (hard limit, soft limit, soft seconds)
CONFIG SET client-output-buffer-limit "normal 256mb 64mb 60"

# Set limits for replica clients
CONFIG SET client-output-buffer-limit "replica 512mb 128mb 60"

# Set limits for pubsub clients
CONFIG SET client-output-buffer-limit "pubsub 32mb 8mb 60"
```

## Python Comprehensive Connection Handler

```python
import redis
import time
import logging
from contextlib import contextmanager
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RobustRedisClient:
    """Redis client with comprehensive connection handling."""

    def __init__(self, host: str, port: int = 6379, password: str = None,
                 max_connections: int = 50, retry_attempts: int = 3,
                 retry_delay: float = 0.5):
        self.host = host
        self.port = port
        self.max_connections = max_connections
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay

        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            password=password,
            max_connections=max_connections,
            socket_timeout=5,
            socket_connect_timeout=5,
            socket_keepalive=True,
            health_check_interval=30,
            retry_on_timeout=True,
        )
        self.client = redis.Redis(connection_pool=self.pool)
        self._connected = False

    def connect(self) -> bool:
        """Verify connection to Redis."""
        try:
            self.client.ping()
            self._connected = True
            logger.info(f"Connected to Redis at {self.host}:{self.port}")
            return True
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._connected = False
            return False

    def _execute_with_retry(self, operation, *args, **kwargs):
        """Execute operation with retry logic."""
        last_error = None

        for attempt in range(self.retry_attempts):
            try:
                return operation(*args, **kwargs)
            except redis.ConnectionError as e:
                last_error = e
                logger.warning(f"Connection error (attempt {attempt + 1}): {e}")
                self._reconnect()
                time.sleep(self.retry_delay * (attempt + 1))
            except redis.TimeoutError as e:
                last_error = e
                logger.warning(f"Timeout error (attempt {attempt + 1}): {e}")
                time.sleep(self.retry_delay * (attempt + 1))

        raise last_error

    def _reconnect(self):
        """Attempt to reconnect."""
        logger.info("Attempting to reconnect...")
        self.pool.disconnect()
        time.sleep(0.5)
        self.connect()

    def get(self, key: str) -> Optional[str]:
        """Get value with retry."""
        return self._execute_with_retry(self.client.get, key)

    def set(self, key: str, value: str, ex: int = None) -> bool:
        """Set value with retry."""
        return self._execute_with_retry(self.client.set, key, value, ex=ex)

    def health_check(self) -> dict:
        """Perform health check."""
        result = {
            'connected': False,
            'latency_ms': None,
            'pool_available': 0,
            'pool_in_use': 0,
        }

        try:
            start = time.time()
            self.client.ping()
            result['latency_ms'] = (time.time() - start) * 1000
            result['connected'] = True
            result['pool_available'] = len(self.pool._available_connections)
            result['pool_in_use'] = len(self.pool._in_use_connections)
        except Exception as e:
            logger.error(f"Health check failed: {e}")

        return result

    def get_diagnostics(self) -> dict:
        """Get connection diagnostics."""
        diagnostics = {
            'host': self.host,
            'port': self.port,
            'max_connections': self.max_connections,
            'connected': self._connected,
        }

        try:
            info = self.client.info('clients')
            diagnostics['server_connected_clients'] = info['connected_clients']
            diagnostics['server_blocked_clients'] = info['blocked_clients']

            config = self.client.config_get('maxclients')
            diagnostics['server_max_clients'] = config['maxclients']
        except:
            pass

        return diagnostics

    @contextmanager
    def pipeline(self):
        """Get a pipeline with error handling."""
        pipe = self.client.pipeline()
        try:
            yield pipe
            pipe.execute()
        except redis.ConnectionError:
            self._reconnect()
            raise
        finally:
            pipe.reset()

    def close(self):
        """Close all connections."""
        self.pool.disconnect()
        self._connected = False


# Usage
client = RobustRedisClient(
    host='redis.example.com',
    port=6379,
    password='your-password',
    max_connections=50
)

if client.connect():
    # Normal operations
    client.set('key', 'value')
    value = client.get('key')

    # Health check
    health = client.health_check()
    print(f"Latency: {health['latency_ms']:.2f}ms")

    # Diagnostics
    diag = client.get_diagnostics()
    print(f"Server connections: {diag.get('server_connected_clients')}")

client.close()
```

## Troubleshooting Checklist

```markdown
## Redis Connection Troubleshooting Checklist

### 1. Basic Connectivity
- [ ] Is Redis process running? (`systemctl status redis`)
- [ ] Can connect locally? (`redis-cli ping`)
- [ ] Is port open? (`ss -tlnp | grep 6379`)
- [ ] Is firewall allowing traffic? (`iptables -L -n | grep 6379`)

### 2. Network Issues
- [ ] DNS resolving correctly? (`nslookup redis-host`)
- [ ] TCP connection works? (`nc -zv redis-host 6379`)
- [ ] Network latency acceptable? (`redis-cli --latency`)
- [ ] No packet loss? (`ping redis-host`)

### 3. Redis Configuration
- [ ] Binding correct interface? (`CONFIG GET bind`)
- [ ] Protected mode appropriate? (`CONFIG GET protected-mode`)
- [ ] Max clients not exceeded? (`INFO clients`)
- [ ] Timeout configured? (`CONFIG GET timeout`)

### 4. Client Configuration
- [ ] Connection pool sized correctly?
- [ ] Timeout values reasonable?
- [ ] Retry logic implemented?
- [ ] Keepalive enabled?

### 5. Performance Issues
- [ ] Memory usage acceptable? (`INFO memory`)
- [ ] No slow commands? (`SLOWLOG GET 10`)
- [ ] No blocking commands? (`CLIENT LIST`)
- [ ] Keyspace operations normal? (`INFO keyspace`)
```

## Conclusion

Troubleshooting Redis connection issues requires:

1. **Systematic diagnosis**: Check server, network, and client in order
2. **Proper configuration**: Set appropriate timeouts, keepalives, and limits
3. **Connection pooling**: Use pools to manage connections efficiently
4. **Retry logic**: Implement robust retry mechanisms
5. **Monitoring**: Track connection metrics continuously

With these techniques, you can quickly identify and resolve Redis connection issues while building resilient applications.
