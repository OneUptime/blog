# How to Troubleshoot Redis Replication Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Lag, Troubleshooting, Performance

Description: Diagnose and reduce Redis replication lag by measuring offset deltas, identifying slow consumers, and tuning replication buffer settings.

---

## What is Replication Lag

Redis replication lag is the delay between a write being applied on the primary and that write being visible on a replica. Under normal conditions replication is nearly synchronous (single-digit milliseconds). Elevated lag causes stale reads on replicas and can lead to data loss if a failover occurs while the replica is behind.

## Step 1 - Measure Current Replication Lag

```bash
redis-cli -h <primary-host> INFO replication
```

Key fields:

```text
role:master
connected_slaves:2
slave0:ip=192.168.1.11,port=6379,state=online,offset=123456789,lag=0
slave1:ip=192.168.1.12,port=6379,state=online,offset=123456780,lag=1
master_replid:abc123
master_repl_offset:123456789
```

`lag` is measured in seconds (integer). Compare each replica's `offset` against `master_repl_offset` to see the byte gap:

```bash
python3 -c "
primary_offset = 123456789
replica_offset = 123400000
print(f'Lag in bytes: {primary_offset - replica_offset}')
"
```

## Step 2 - Identify the Cause of Lag

### High write throughput on primary

```bash
redis-cli -h <primary-host> INFO stats | grep instantaneous_ops_per_sec
```

If the primary is processing thousands of ops/sec and replicas cannot keep up, the replication buffer will grow.

### Long-running commands blocking replication

```bash
redis-cli -h <primary-host> SLOWLOG GET 20
```

Commands taking hundreds of milliseconds block replication propagation for that duration.

### Network bandwidth saturation

```bash
redis-cli -h <primary-host> INFO stats | grep -E 'total_net_output_bytes|net_output_bytes'
```

If the replication connection is saturating available bandwidth, lag will accumulate.

### Full resync triggered

```bash
tail -50 /var/log/redis/redis-server.log | grep -i sync
```

If you see `FULLRESYNC`, the replica fell too far behind or reconnected and is doing a full RDB transfer, which causes significant lag during transfer.

## Step 3 - Tune Replication Buffer Size

If replicas disconnect and trigger full resyncs, increase the replication backlog:

```bash
# Check current setting
redis-cli CONFIG GET repl-backlog-size

# Set to 256MB
redis-cli CONFIG SET repl-backlog-size 268435456
```

The backlog allows replicas that briefly disconnect to catch up via partial resync instead of full resync.

## Step 4 - Tune client-output-buffer-limit for Replicas

Redis disconnects replicas if their output buffer exceeds a limit. Increase the limit for replication:

```bash
redis-cli CONFIG GET client-output-buffer-limit
```

Default:

```text
client-output-buffer-limit slave 256mb 64mb 60
```

Meaning: disconnect if over 256MB hard limit, or over 64MB for 60 seconds. Increase if replicas frequently reconnect:

```bash
redis-cli CONFIG SET client-output-buffer-limit "slave 512mb 128mb 120"
```

## Step 5 - Enable min-replicas-to-write for Write Guarantees

To prevent a primary from accepting writes when replicas are too far behind, configure minimum replica requirements:

```bash
# Require at least 1 connected replica
redis-cli CONFIG SET min-replicas-to-write 1

# Maximum allowed lag in seconds
redis-cli CONFIG SET min-replicas-max-lag 10
```

With these settings, if all replicas have lag greater than 10 seconds, the primary will refuse writes, preventing data from going further ahead.

## Step 6 - Monitor Replication Lag Continuously

```python
import redis
import time

primary = redis.Redis(host='redis-primary', port=6379)

while True:
    info = primary.info('replication')
    master_offset = info['master_repl_offset']

    for key, value in info.items():
        if key.startswith('slave'):
            replica_offset = int(value.get('offset', 0))
            lag_bytes = master_offset - replica_offset
            lag_sec = value.get('lag', 'N/A')
            print(f"{key}: lag={lag_sec}s, byte_gap={lag_bytes}")

    time.sleep(5)
```

## Step 7 - Consider Read-From-Replica Strategy

If lag is acceptable for your use case (e.g., analytics reads), route reads to replicas explicitly and handle stale data in your application logic. Avoid routing reads to replicas for data that requires strong consistency.

## Summary

Redis replication lag is measured by comparing the primary's `master_repl_offset` with each replica's reported offset. The most common causes are high write throughput exceeding replication bandwidth, slow commands blocking propagation, and undersized replication backlog causing frequent full resyncs. Increase `repl-backlog-size`, tune `client-output-buffer-limit`, and use `min-replicas-to-write` to enforce consistency guarantees when lag becomes unacceptable.
