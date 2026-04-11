# How to Use INFO in Redis to Get Server Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, INFO, Monitoring, Server, Observability

Description: Learn how to use the INFO command to retrieve comprehensive Redis server statistics including memory usage, replication state, and keyspace data.

---

`INFO` is the primary operational visibility command for Redis. It returns a comprehensive report of server statistics organized into sections - from memory usage and CPU stats to replication state and connected clients. Understanding `INFO` output is essential for Redis performance tuning and monitoring.

## Syntax

```redis
INFO [section]
```

Available sections:
- `server` - Redis version, OS, TCP port, config file
- `clients` - connected clients, blocked clients
- `memory` - memory usage, fragmentation ratio
- `persistence` - RDB and AOF status
- `stats` - commands processed, connections, keyspace hits/misses
- `replication` - role, connected replicas, replication offset
- `cpu` - CPU usage statistics
- `keyspace` - per-database key counts and TTL stats
- `commandstats` - per-command call counts and CPU time
- `latencystats` - per-command latency percentiles
- `cluster` - cluster enabled flag, cluster state
- `modules` - loaded module information
- `all` - all standard sections (excludes module-generated sections)
- `everything` - all sections including module-generated ones
- `default` (no argument) - the most commonly used sections

## Examples

### Get All Default Sections

```redis
INFO
```

### Get a Specific Section

```redis
INFO memory
```

Output (excerpt):

```text
# Memory
used_memory:1234567
used_memory_human:1.18M
used_memory_rss:2345678
used_memory_rss_human:2.24M
used_memory_peak:1345678
used_memory_peak_human:1.28M
mem_fragmentation_ratio:1.90
```

### Memory Health Indicators

```redis
INFO memory
```

Key fields:
- `used_memory_human` - actual Redis data memory usage
- `used_memory_rss_human` - memory allocated by OS (includes fragmentation)
- `mem_fragmentation_ratio` - ratio of RSS to used; above 1.5 indicates fragmentation
- `maxmemory_human` - configured memory limit (0 = no limit)

### Replication Status

```redis
INFO replication
```

Output:

```text
# Replication
role:master
connected_slaves:2
slave0:ip=10.0.0.2,port=6380,state=online,offset=12345,lag=0
slave1:ip=10.0.0.3,port=6380,state=online,offset=12340,lag=1
master_replid:abc123def456...
master_repl_offset:12345
```

### Keyspace Statistics

```redis
INFO keyspace
```

Output:

```text
# Keyspace
db0:keys=15234,expires=8901,avg_ttl=45231
db1:keys=123,expires=0,avg_ttl=0
```

### Hit Rate Calculation

```redis
INFO stats
```

Look for:

```text
keyspace_hits:1000000
keyspace_misses:50000
```

Calculate hit rate:

```text
hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
         = 1000000 / 1050000
         = 95.2%
```

### Client Connections

```redis
INFO clients
```

Key fields:
- `connected_clients` - current connections
- `blocked_clients` - clients waiting on BLPOP or similar
- `maxclients` - configured maximum

### Persistence Status

```redis
INFO persistence
```

Key fields:
- `rdb_last_bgsave_status` - `ok` or `err`
- `aof_enabled` - 0 or 1
- `aof_last_write_status` - `ok` or `err`

## Monitoring Integration

Parse INFO output in a shell script:

```bash
redis-cli INFO memory | grep used_memory_human
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO replication | grep connected_slaves
```

Or use monitoring tools like Prometheus with `redis_exporter` which parses all INFO sections automatically.

## Use Cases

- **Performance dashboards** - export memory, hit rate, and connection metrics to Grafana
- **Replication health checks** - verify replica offset lag stays near zero
- **Memory leak detection** - track `used_memory` growth over time
- **Cache efficiency** - monitor `keyspace_hits` vs `keyspace_misses` ratio
- **Incident diagnosis** - `INFO all` gives a complete server snapshot for debugging

## Summary

`INFO` is the Swiss Army knife of Redis observability. Use section filters (`INFO memory`, `INFO replication`, `INFO keyspace`) to focus on specific areas during incident response or routine monitoring. For production systems, integrate `INFO` metrics into a time-series monitoring stack via `redis_exporter` or similar to track trends and set up alerting.
