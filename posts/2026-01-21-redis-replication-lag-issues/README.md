# How to Debug Redis Replication Lag Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Troubleshooting, High Availability, Master-Replica

Description: A comprehensive guide to diagnosing and resolving Redis replication lag issues, including network problems, configuration tuning, and monitoring strategies for master-replica setups.

---

Redis replication lag occurs when replicas fall behind the master in processing updates. While some lag is normal, excessive lag can lead to stale reads, data inconsistency, and failover problems. This guide covers how to identify, diagnose, and resolve replication lag issues in Redis.

## Understanding Replication Lag

Redis replication works by:
1. Master writes commands to a replication buffer
2. Master sends commands to connected replicas
3. Replicas execute commands and acknowledge receipt
4. Master tracks replica offsets for monitoring

Lag occurs when replicas cannot keep up with the master's write rate.

## Step 1: Measure Current Replication Lag

### On the Master

```bash
redis-cli INFO replication
```

Key fields:

```
role:master
connected_slaves:2
slave0:ip=192.168.1.101,port=6379,state=online,offset=1234567890,lag=0
slave1:ip=192.168.1.102,port=6379,state=online,offset=1234567880,lag=1
master_repl_offset:1234567890
repl_backlog_active:1
repl_backlog_size:104857600
repl_backlog_first_byte_offset:1134567890
repl_backlog_histlen:100000000
```

The `lag` field shows seconds since last ACK from each replica.

### On a Replica

```bash
redis-cli INFO replication
```

```
role:slave
master_host:192.168.1.100
master_port:6379
master_link_status:up
master_last_io_seconds_ago:0
master_sync_in_progress:0
slave_repl_offset:1234567890
slave_priority:100
slave_read_only:1
```

### Calculate Offset Lag

```python
import redis

def check_replication_lag(master_host, replica_hosts):
    """Check replication lag across all replicas"""

    # Connect to master
    master = redis.Redis(host=master_host, port=6379)
    master_info = master.info('replication')
    master_offset = master_info['master_repl_offset']

    print(f"Master offset: {master_offset}")
    print("-" * 50)

    # Check each replica
    for replica_host in replica_hosts:
        try:
            replica = redis.Redis(host=replica_host, port=6379)
            replica_info = replica.info('replication')
            replica_offset = replica_info['slave_repl_offset']

            lag_bytes = master_offset - replica_offset
            lag_status = "OK" if lag_bytes < 10000 else "WARNING" if lag_bytes < 1000000 else "CRITICAL"

            print(f"Replica {replica_host}:")
            print(f"  Offset: {replica_offset}")
            print(f"  Lag: {lag_bytes} bytes ({lag_status})")
            print(f"  Link status: {replica_info['master_link_status']}")
            print(f"  Last IO: {replica_info['master_last_io_seconds_ago']}s ago")

        except Exception as e:
            print(f"Replica {replica_host}: ERROR - {e}")

check_replication_lag('192.168.1.100', ['192.168.1.101', '192.168.1.102'])
```

## Step 2: Identify Root Causes

### Check Network Latency

```bash
# Ping from master to replica
ping -c 10 192.168.1.101

# Check TCP connection quality
redis-cli -h 192.168.1.101 DEBUG SLEEP 0 && echo "Connection OK"

# Test bandwidth
iperf3 -c 192.168.1.101 -t 10

# Check for packet loss
mtr -r -c 100 192.168.1.101
```

### Check Replica Resources

```bash
# On the replica, check system resources
top -p $(pgrep redis)

# Check memory
free -h

# Check disk I/O (important if AOF is enabled)
iostat -x 1 5

# Check network interface stats
ip -s link show eth0
```

### Check Redis Slow Log

```bash
# On master - find slow commands that might be blocking replication
redis-cli SLOWLOG GET 20

# Check client output buffer limits
redis-cli CONFIG GET client-output-buffer-limit
```

## Step 3: Network-Related Fixes

### Increase TCP Backlog

```bash
# On both master and replica
echo 511 > /proc/sys/net/core/somaxconn
echo "net.core.somaxconn = 511" >> /etc/sysctl.conf

# Also increase in Redis config
redis-cli CONFIG SET tcp-backlog 511
```

### Optimize TCP Settings

```bash
# /etc/sysctl.conf additions for Redis replication
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 3

# Apply changes
sysctl -p
```

### Configure Redis Keep-Alive

```bash
# Enable TCP keep-alive (seconds)
redis-cli CONFIG SET tcp-keepalive 60
```

## Step 4: Buffer Configuration

### Replication Backlog

The backlog allows replicas to resync without full resync:

```bash
# Check current backlog size
redis-cli INFO replication | grep backlog

# Increase backlog (default is 1MB, recommend 100MB+ for busy systems)
redis-cli CONFIG SET repl-backlog-size 104857600  # 100MB

# Persist change
redis-cli CONFIG REWRITE
```

Calculate appropriate backlog size:

```python
def calculate_backlog_size(write_rate_mbps, max_disconnect_seconds):
    """
    Calculate replication backlog size

    write_rate_mbps: Average write throughput in MB/s
    max_disconnect_seconds: Max time replica might be disconnected
    """
    recommended_size = write_rate_mbps * max_disconnect_seconds * 1.5  # 50% safety margin
    return int(recommended_size * 1024 * 1024)

# Example: 10 MB/s writes, replicas might disconnect for 60 seconds
size = calculate_backlog_size(10, 60)
print(f"Recommended backlog: {size / (1024*1024):.0f} MB")
# Output: Recommended backlog: 900 MB
```

### Client Output Buffer for Replicas

```bash
# Check current limits
redis-cli CONFIG GET client-output-buffer-limit

# Increase buffer for slaves (format: class hard-limit soft-limit soft-seconds)
redis-cli CONFIG SET client-output-buffer-limit "slave 512mb 128mb 60"

# This means:
# - Disconnect if buffer exceeds 512MB
# - Disconnect if buffer exceeds 128MB for 60 seconds
```

## Step 5: Optimize Replica Performance

### Disable Persistence on Replicas

If you have multiple replicas and can afford to lose one:

```bash
# On replica - disable RDB saves
redis-cli CONFIG SET save ""

# Disable AOF on replica (master has it)
redis-cli CONFIG SET appendonly no
```

### Enable Diskless Replication

Diskless replication sends RDB directly over socket:

```bash
# On master
redis-cli CONFIG SET repl-diskless-sync yes
redis-cli CONFIG SET repl-diskless-sync-delay 5

# On replica
redis-cli CONFIG SET repl-diskless-load on-empty-db
```

### Tune Replica Read Performance

```bash
# Allow replica to serve stale data during sync
redis-cli CONFIG SET slave-serve-stale-data yes

# On replica, set lower priority for failover
redis-cli CONFIG SET slave-priority 100
```

## Step 6: Handle Full Resync Issues

Full resyncs cause significant lag. Identify and prevent them:

```bash
# Check for full resync events
grep -i "full resync" /var/log/redis/redis-server.log

# Monitor sync status
redis-cli INFO replication | grep sync
```

### Prevent Unnecessary Full Resyncs

```bash
# Increase backlog TTL (keep backlog even without replicas)
redis-cli CONFIG SET repl-backlog-ttl 3600  # 1 hour

# On replica, configure timeout
redis-cli CONFIG SET repl-timeout 60
```

## Step 7: Monitor Replication Continuously

### Prometheus Metrics Script

```python
import redis
import time
from prometheus_client import Gauge, start_http_server

# Define metrics
replication_lag_bytes = Gauge(
    'redis_replication_lag_bytes',
    'Replication lag in bytes',
    ['replica_host']
)

replication_lag_seconds = Gauge(
    'redis_replication_lag_seconds',
    'Seconds since last replica ACK',
    ['replica_host']
)

master_offset = Gauge(
    'redis_master_repl_offset',
    'Master replication offset'
)

def collect_replication_metrics(master_host, interval=10):
    """Collect and expose replication metrics"""

    master = redis.Redis(host=master_host, port=6379)

    while True:
        try:
            info = master.info('replication')

            if info['role'] == 'master':
                master_offset.set(info['master_repl_offset'])

                # Parse slave info
                for i in range(info.get('connected_slaves', 0)):
                    slave_info = info.get(f'slave{i}')
                    if slave_info:
                        # Parse: ip=x,port=y,state=z,offset=n,lag=m
                        parts = dict(p.split('=') for p in slave_info.split(','))

                        replica_host = parts['ip']
                        offset = int(parts['offset'])
                        lag = int(parts['lag'])

                        lag_bytes = info['master_repl_offset'] - offset

                        replication_lag_bytes.labels(replica_host=replica_host).set(lag_bytes)
                        replication_lag_seconds.labels(replica_host=replica_host).set(lag)

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        time.sleep(interval)

if __name__ == '__main__':
    start_http_server(9090)
    collect_replication_metrics('192.168.1.100')
```

### Alerting Rules (Prometheus)

```yaml
groups:
  - name: redis-replication
    rules:
      - alert: RedisReplicationLagHigh
        expr: redis_replication_lag_bytes > 1000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis replication lag is high"
          description: "Replica {{ $labels.replica_host }} is {{ $value }} bytes behind master"

      - alert: RedisReplicationLagCritical
        expr: redis_replication_lag_bytes > 100000000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Redis replication lag is critical"
          description: "Replica {{ $labels.replica_host }} is {{ $value }} bytes behind master"

      - alert: RedisReplicaDisconnected
        expr: redis_replication_lag_seconds > 30
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis replica appears disconnected"
          description: "No ACK from {{ $labels.replica_host }} for {{ $value }} seconds"
```

## Step 8: Handle High Write Load

### Identify Write Patterns

```bash
# Check commands per second
redis-cli INFO stats | grep instantaneous_ops_per_sec

# Monitor command types
redis-cli INFO commandstats

# Watch real-time commands
redis-cli MONITOR | head -1000
```

### Optimize Write Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Use pipelining to reduce round trips
def bulk_write_optimized(data_dict):
    """Write multiple keys efficiently"""
    pipe = r.pipeline()

    for key, value in data_dict.items():
        pipe.set(key, value)

    # Execute all commands in one round trip
    pipe.execute()

# Use MSET for multiple keys
def multi_set(data_dict):
    """Set multiple keys atomically"""
    r.mset(data_dict)

# Batch operations in chunks
def chunked_write(items, chunk_size=1000):
    """Write large datasets in chunks"""
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        pipe = r.pipeline()
        for key, value in chunk:
            pipe.set(key, value)
        pipe.execute()
```

## Step 9: Configure WAIT for Synchronous Replication

For critical writes that must be replicated:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def write_with_replication_guarantee(key, value, min_replicas=1, timeout_ms=1000):
    """
    Write and wait for replication confirmation

    Returns number of replicas that acknowledged
    """
    pipe = r.pipeline()
    pipe.set(key, value)
    pipe.wait(min_replicas, timeout_ms)

    results = pipe.execute()
    acknowledged_replicas = results[1]

    if acknowledged_replicas < min_replicas:
        raise Exception(f"Only {acknowledged_replicas} replicas acknowledged, needed {min_replicas}")

    return acknowledged_replicas

# Usage
try:
    replicas = write_with_replication_guarantee('important:key', 'value', min_replicas=2)
    print(f"Write confirmed by {replicas} replicas")
except Exception as e:
    print(f"Replication guarantee failed: {e}")
```

## Step 10: Troubleshooting Checklist

Use this checklist when debugging replication lag:

```bash
#!/bin/bash
# replication-diagnosis.sh

MASTER_HOST=${1:-localhost}
MASTER_PORT=${2:-6379}

echo "=== Redis Replication Diagnosis ==="
echo "Master: $MASTER_HOST:$MASTER_PORT"
echo ""

echo "1. Master Replication Info:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT INFO replication
echo ""

echo "2. Master Memory Usage:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT INFO memory | grep -E "used_memory_human|maxmemory_human"
echo ""

echo "3. Client Output Buffers:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT CONFIG GET client-output-buffer-limit
echo ""

echo "4. Replication Backlog:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT INFO replication | grep backlog
echo ""

echo "5. Connected Clients:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT CLIENT LIST | grep -c "flags=S"
echo "replica connections found"
echo ""

echo "6. Slow Log (last 10):"
redis-cli -h $MASTER_HOST -p $MASTER_PORT SLOWLOG GET 10
echo ""

echo "7. Ops Per Second:"
redis-cli -h $MASTER_HOST -p $MASTER_PORT INFO stats | grep ops_per_sec
```

## Common Issues and Solutions Summary

| Issue | Symptom | Solution |
|-------|---------|----------|
| Network latency | High lag seconds, low lag bytes | Optimize network, use closer replicas |
| Slow replica disk | High lag during syncs | Enable diskless replication |
| Small backlog | Frequent full resyncs | Increase repl-backlog-size |
| Output buffer full | Replica disconnections | Increase client-output-buffer-limit |
| High write rate | Steadily increasing lag | Add replicas, optimize writes |
| Slow commands on master | Lag spikes | Identify and optimize slow commands |

## Conclusion

Replication lag in Redis can stem from various causes including network issues, resource constraints, configuration problems, or simply high write loads. The key to managing replication lag is:

1. **Monitor continuously** with proper metrics and alerting
2. **Size buffers appropriately** for your write volume
3. **Optimize network** between master and replicas
4. **Use diskless replication** when replicas have slow disks
5. **Consider WAIT** for critical writes that need replication guarantees

By following this guide and implementing proper monitoring, you can maintain healthy replication with minimal lag, ensuring your Redis replicas are ready for both read scaling and failover scenarios.
