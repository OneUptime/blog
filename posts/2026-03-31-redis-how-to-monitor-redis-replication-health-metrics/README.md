# How to Monitor Redis Replication Health Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Monitoring, High Availability, DevOps

Description: Learn how to monitor Redis replication health metrics including replication lag, replica status, and offset tracking to maintain high availability.

---

## Redis Replication Overview

Redis replication enables a primary node to replicate data to one or more replica nodes. Monitoring replication health is critical for high availability setups and read scaling.

Key concerns in replication monitoring:
- Replication lag (how far behind the replica is)
- Replica connectivity status
- Replication buffer usage
- Failover readiness

## Checking Replication Status

Use the `INFO replication` command:

```bash
redis-cli INFO replication
```

Sample output from a primary node:

```text
# Replication
role:master
connected_slaves:2
slave0:ip=10.0.0.2,port=6379,state=online,offset=1024000,lag=0
slave1:ip=10.0.0.3,port=6379,state=online,offset=1023990,lag=1
master_failover_state:no-failover
master_replid:abc123def456...
master_replid2:0000000000000000...
master_repl_offset:1024000
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:1024000
```

Sample output from a replica node:

```text
# Replication
role:slave
master_host:10.0.0.1
master_port:6379
master_link_status:up
master_last_io_seconds_ago:1
master_sync_in_progress:0
slave_read_repl_offset:1024000
slave_repl_offset:1024000
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
```

## Key Metrics to Monitor

### Primary Node Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `connected_slaves` | Number of replicas connected | < expected count |
| `slave{n}.lag` | Replication lag in seconds | > 10 |
| `slave{n}.state` | Replica connection state | != "online" |
| `master_repl_offset` | Primary's current offset | Flat line = stalled writes |
| `repl_backlog_size` | Backlog buffer size | Adjust if replicas lag |

### Replica Node Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `master_link_status` | Connection to primary | != "up" |
| `master_last_io_seconds_ago` | Seconds since last message | > 30 |
| `master_sync_in_progress` | Full resync in progress | Duration > expected |
| `slave_repl_offset` | Replica's current offset | Compare to master offset |

## Calculating Replication Lag

Lag in bytes can be calculated from the offset difference:

```bash
# Get primary offset
redis-cli -h primary-host INFO replication | grep master_repl_offset

# Get replica offset
redis-cli -h replica-host INFO replication | grep slave_repl_offset
```

Using Python to compute lag:

```python
import redis

def get_replication_lag(primary_host, replica_host, port=6379):
    primary = redis.Redis(host=primary_host, port=port, decode_responses=True)
    replica = redis.Redis(host=replica_host, port=port, decode_responses=True)

    primary_info = primary.info('replication')
    replica_info = replica.info('replication')

    primary_offset = primary_info.get('master_repl_offset', 0)
    replica_offset = replica_info.get('slave_repl_offset', 0)

    lag_bytes = primary_offset - replica_offset
    link_status = replica_info.get('master_link_status', 'unknown')
    last_io = replica_info.get('master_last_io_seconds_ago', -1)

    print(f"Primary offset: {primary_offset}")
    print(f"Replica offset: {replica_offset}")
    print(f"Lag (bytes): {lag_bytes}")
    print(f"Link status: {link_status}")
    print(f"Last IO: {last_io}s ago")

    if link_status != 'up':
        print("ALERT: Replica disconnected from primary!")
    if lag_bytes > 1_000_000:
        print(f"WARNING: Replication lag is {lag_bytes} bytes")
    if last_io > 30:
        print(f"WARNING: No IO from primary in {last_io} seconds")

get_replication_lag('10.0.0.1', '10.0.0.2')
```

## Monitoring All Replicas from Primary

```python
import redis

def check_all_replicas(primary_host, port=6379):
    r = redis.Redis(host=primary_host, port=port, decode_responses=True)
    info = r.info('replication')

    num_replicas = info.get('connected_slaves', 0)
    print(f"Connected replicas: {num_replicas}")

    for i in range(num_replicas):
        replica_info = info.get(f'slave{i}', {})
        ip = replica_info.get('ip', 'unknown')
        state = replica_info.get('state', 'unknown')
        offset = int(replica_info.get('offset', 0))
        lag = int(replica_info.get('lag', -1))

        master_offset = info.get('master_repl_offset', 0)
        byte_lag = master_offset - offset

        print(f"Replica {i}: {ip} | state={state} | lag={lag}s | byte_lag={byte_lag}")
        if state != 'online':
            print(f"  ALERT: Replica {ip} is not online!")
        if lag > 5:
            print(f"  WARNING: Replica {ip} has lag of {lag}s")

check_all_replicas('10.0.0.1')
```

## Configuring Replication

In `redis.conf` on the replica:

```text
replicaof 10.0.0.1 6379

# Optional: require replica to be read-only
replica-read-only yes
```

In `redis.conf` on the primary (to require minimum replicas before accepting writes):

```text
min-replicas-to-write 1
min-replicas-max-lag 10
```

## Summary

Redis replication health monitoring centers on tracking the `master_link_status`, replication offsets, and per-replica lag values from `INFO replication`. Setting up automated checks against these metrics - particularly connection status and byte lag - allows you to detect replication failures before they impact read availability or failover readiness. Combine these checks with alerting in tools like OneUptime or Grafana for production environments.
