# How to Plan Redis Network Bandwidth Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Network Bandwidth, Capacity Planning, Performance, Architecture

Description: Calculate Redis network bandwidth requirements based on command throughput, value sizes, and replication traffic to properly size your network infrastructure.

---

## Why Network Bandwidth Matters for Redis

Redis is a network-intensive service. Every command involves at least one network round trip. At high throughput, network bandwidth can become a bottleneck before CPU or memory. Proper capacity planning ensures your network infrastructure can handle:

- Client command traffic (requests and responses)
- Replication traffic (primary to replicas)
- Cluster gossip traffic
- Snapshot transfer during replica sync

## Step 1 - Measure Current Network Usage

```bash
# Check Redis network I/O from INFO stats
redis-cli INFO stats | grep -E "(total_net|instantaneous_input|instantaneous_output)"
```

Key metrics:

```text
total_net_input_bytes:1073741824    # Total bytes received since start
total_net_output_bytes:2147483648   # Total bytes sent since start
instantaneous_input_kbps:1024.5     # Current incoming bandwidth (KB/s)
instantaneous_output_kbps:4096.2    # Current outgoing bandwidth (KB/s)
```

Monitor bandwidth usage over time:

```bash
watch -n 1 "redis-cli INFO stats | grep instantaneous"
```

## Step 2 - Calculate Expected Bandwidth per Command

The bandwidth consumed per command depends on:

1. Command overhead (protocol framing): ~10-30 bytes
2. Key size: varies
3. Value size: varies

### Redis Protocol (RESP) Overhead

Redis uses the RESP (Redis Serialization Protocol) format. A `SET key value` command:

```text
Request:  *3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n  = ~30 bytes
Response: +OK\r\n                                            = 5 bytes
```

A `GET key` with a 1KB value:

```text
Request:  *2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n  = ~20 bytes
Response: $1024\r\n[1024 bytes]\r\n          = ~1033 bytes
```

### Bandwidth Calculation Formula

```python
def calculate_bandwidth_mbps(
    ops_per_second: int,
    avg_key_size_bytes: int = 20,
    avg_value_size_bytes: int = 512,
    read_write_ratio: float = 0.8,  # 80% reads, 20% writes
    protocol_overhead_bytes: int = 40
) -> dict:
    """
    Calculate expected network bandwidth for a Redis workload.
    """
    # Per-operation bandwidth
    read_request_bytes = protocol_overhead_bytes + avg_key_size_bytes
    read_response_bytes = protocol_overhead_bytes + avg_value_size_bytes
    write_request_bytes = protocol_overhead_bytes + avg_key_size_bytes + avg_value_size_bytes
    write_response_bytes = 10  # +OK\r\n

    reads_per_sec = ops_per_second * read_write_ratio
    writes_per_sec = ops_per_second * (1 - read_write_ratio)

    # Total bandwidth
    inbound_bytes_per_sec = (
        reads_per_sec * read_request_bytes +
        writes_per_sec * write_request_bytes
    )
    outbound_bytes_per_sec = (
        reads_per_sec * read_response_bytes +
        writes_per_sec * write_response_bytes
    )

    total_bytes_per_sec = inbound_bytes_per_sec + outbound_bytes_per_sec
    total_mbps = total_bytes_per_sec * 8 / 1_000_000

    return {
        'ops_per_second': ops_per_second,
        'reads_per_second': int(reads_per_sec),
        'writes_per_second': int(writes_per_sec),
        'inbound_mbps': round(inbound_bytes_per_sec * 8 / 1_000_000, 2),
        'outbound_mbps': round(outbound_bytes_per_sec * 8 / 1_000_000, 2),
        'total_mbps': round(total_mbps, 2),
        'recommended_nic_gbps': max(1, round(total_mbps / 1000 * 3, 0))  # 3x headroom
    }

# Example: 100,000 ops/sec, 512-byte values, 80% reads
result = calculate_bandwidth_mbps(
    ops_per_second=100_000,
    avg_key_size_bytes=20,
    avg_value_size_bytes=512
)
for k, v in result.items():
    print(f"{k}: {v}")
```

## Step 3 - Account for Replication Bandwidth

Replication bandwidth is the write throughput replicated to each replica:

```text
Replication bandwidth per replica = Write throughput (bytes/sec)

If writes = 20,000 ops/sec at 512 bytes = ~10 MB/s
With 3 replicas = 30 MB/s replication overhead = 240 Mbps additional
```

Check current replication bandwidth:

```bash
redis-cli INFO replication | grep -E "(repl_backlog_size|slave)"
redis-cli INFO stats | grep -E "total_net"
```

## Step 4 - Cluster Gossip Traffic

In Redis Cluster, nodes exchange gossip messages on the cluster bus port (base port + 10000). Gossip adds a small but measurable overhead:

```text
Cluster gossip per node ≈ 1-10 KB/s for small clusters
For a 30-node cluster ≈ 30-300 KB/s
```

This is negligible for most deployments but worth accounting for in very large clusters.

## Bandwidth Estimates by Workload Type

| Workload | Ops/sec | Avg Value | Read/Write | Total Bandwidth |
|----------|---------|-----------|------------|-----------------|
| Session cache | 50,000 | 256B | 90/10 | ~150 Mbps |
| Product catalog | 20,000 | 4KB | 95/5 | ~700 Mbps |
| Rate limiting | 200,000 | 8B | 50/50 | ~150 Mbps |
| Pub/Sub messaging | 100,000 | 1KB | 0/100* | ~800 Mbps |

*Pub/Sub subscribers multiply outbound traffic by subscriber count.

## Network Interface Sizing Recommendations

```text
Rule of thumb: Size NIC at 3-4x expected peak traffic

Expected peak traffic: 500 Mbps
Recommended NIC: 2 Gbps (4x headroom)

Expected peak traffic: 2 Gbps
Recommended NIC: 10 Gbps
```

AWS/Azure network bandwidth by instance type:
- `cache.t4g.micro` - Up to 5 Gbps
- `cache.r6g.large` - Up to 10 Gbps
- `cache.r6g.16xlarge` - 25 Gbps

Check actual throughput:

```bash
# On the Redis host
nload -u M -m eth0  # Monitor network interface
```

## Reducing Bandwidth Usage

### 1. Use Pipelining

Pipelining batches multiple commands in one network round trip:

```python
import redis

r = redis.Redis()

# Without pipelining: N round trips
for key, value in data.items():
    r.set(key, value)

# With pipelining: 1 round trip for all
pipe = r.pipeline()
for key, value in data.items():
    pipe.set(key, value)
pipe.execute()
```

### 2. Compress Large Values

```python
import zlib

# Compress value before storing
compressed = zlib.compress(large_json.encode())
r.set('large-key', compressed)

# Decompress on read
raw = r.get('large-key')
data = zlib.decompress(raw).decode()
```

Compression ratios of 4:1 to 10:1 for JSON reduce bandwidth by 75-90%.

### 3. Use RESP3 Protocol

Redis 6+ with RESP3 protocol reduces some metadata overhead. Enable in client:

```python
r = redis.Redis(protocol=3)  # RESP3
```

## Monitoring Bandwidth in Prometheus

```text
# Inbound bandwidth in Mbps
rate(redis_net_input_bytes_total[5m]) * 8 / 1000000

# Outbound bandwidth in Mbps
rate(redis_net_output_bytes_total[5m]) * 8 / 1000000
```

Alert when bandwidth exceeds 80% of NIC capacity:

```yaml
- alert: RedisHighNetworkUsage
  expr: (rate(redis_net_output_bytes_total[5m]) * 8 / 1000000) > 8000  # 8 Gbps
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis network output exceeds 8 Gbps"
```

## Summary

Plan Redis network bandwidth by calculating per-command bytes (key + value + RESP overhead) multiplied by operations per second, adding replication overhead (write bandwidth times replica count), and sizing your network interface at 3-4x expected peak traffic. Use pipelining to reduce round trips, compress large values to cut bandwidth, and monitor `instantaneous_input_kbps` and `instantaneous_output_kbps` in Prometheus to detect bandwidth saturation before it impacts latency.
