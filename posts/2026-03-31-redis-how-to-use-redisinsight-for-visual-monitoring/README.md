# How to Use RedisInsight for Visual Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, Monitoring, Visualization, DevOps

Description: Learn how to install and use RedisInsight to visually monitor Redis instances, browse keys, analyze memory, and profile slow commands.

---

## What Is RedisInsight?

RedisInsight is a free GUI tool from Redis Ltd. that provides a visual interface for managing and monitoring Redis instances. It supports:

- Real-time performance metrics dashboards
- Key browser with filtering and editing
- Memory analysis and optimization suggestions
- Slow log viewer
- Pub/Sub messaging interface
- Profiler for live command tracing

## Installing RedisInsight

### On macOS

```bash
brew install --cask redisinsight
```

### On Ubuntu/Debian

```bash
# Download the latest .deb package from https://redis.io/insight/
wget https://download.redisinsight.redis.com/latest/RedisInsight-linux-amd64.deb
sudo apt install ./RedisInsight-linux-amd64.deb
```

### Using Docker

```bash
docker run -d \
  --name redisinsight \
  -p 5540:5540 \
  redis/redisinsight:latest
```

Then open `http://localhost:5540` in your browser.

## Connecting to a Redis Instance

1. Open RedisInsight
2. Click "Add Redis Database"
3. Enter connection details:
   - Host: `localhost` (or your Redis host)
   - Port: `6379`
   - Name: Give it a friendly name
   - Username/Password: if authentication is configured
4. Click "Add Redis Database"

For TLS connections:

```text
Host: redis.example.com
Port: 6380
TLS enabled: Yes
CA Certificate: /path/to/ca.crt
Client Certificate: /path/to/client.crt
Client Key: /path/to/client.key
```

## Performance Monitoring Dashboard

Once connected, navigate to the "Analysis" tab to see:

- Memory usage breakdown
- Key count by data type
- Top keys by memory usage
- Key expiry distribution

The "Overview" panel shows:

```text
Memory Used: 128.5 MB
Total Keys: 45,230
Connected Clients: 12
Operations/sec: 1,450
Hits/Misses: 95.3% hit rate
```

## Using the Key Browser

Navigate to "Browser" to explore keys:

- Filter by pattern: `user:*` or `session:*`
- Sort by memory, TTL, or key name
- View and edit key values in real time
- Delete keys individually or by pattern

```text
Key Pattern: user:*
Results: 12,430 keys
Type: Hash
Average size: 512 bytes
```

## Profiling Live Commands

The Profiler captures all commands processed by Redis in real time:

1. Go to "Profiler" tab
2. Click "Start Profiling"
3. Observe commands as they flow through Redis

Sample profiler output:

```text
1711900001.234 [0 10.0.0.5:54321] GET user:1001:session
1711900001.235 [0 10.0.0.5:54321] HGETALL user:1001:profile
1711900001.240 [0 10.0.0.6:43210] SET cache:product:42 "..."
```

This helps identify hot keys and unexpected command patterns.

## Viewing the Slow Log

Redis records commands that exceed the `slowlog-log-slower-than` threshold. In RedisInsight:

1. Go to "Slowlog" tab
2. Review commands sorted by execution time

Configure the slow log threshold:

```bash
# Commands slower than 10ms are logged
redis-cli CONFIG SET slowlog-log-slower-than 10000

# Keep last 128 slow commands
redis-cli CONFIG SET slowlog-max-len 128
```

## Memory Analysis

RedisInsight's memory analysis helps find memory hogs:

```text
Top keys by memory:
1. product:catalog:all - 24.5 MB (Hash)
2. user:activity:stream - 18.2 MB (Stream)
3. leaderboard:global - 5.1 MB (Sorted Set)
```

To run an analysis:

1. Go to "Analysis" tab
2. Click "Run Analysis"
3. Review recommendations such as:
   - "Key product:catalog:all is large, consider pagination"
   - "14,230 keys have no TTL set"

## Monitoring Redis Cluster with RedisInsight

RedisInsight supports Redis Cluster. When connecting:

1. Add Database - select "Cluster" type
2. Enter one node's host and port
3. RedisInsight auto-discovers all cluster nodes

It shows:
- Slot assignments per node
- Replication topology
- Per-node memory and ops metrics

## Summary

RedisInsight provides a comprehensive visual interface for Redis monitoring that complements CLI tools. By using its key browser, profiler, slow log viewer, and memory analysis features, you can quickly identify performance bottlenecks, memory waste, and configuration issues without writing scripts. It is a valuable addition to any Redis operator's toolkit.
