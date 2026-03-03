# How to Monitor Redis with redis-stat on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Redis, Monitoring, Performance

Description: Use redis-stat on Ubuntu to monitor Redis performance metrics in real time from the terminal, with web dashboard access and historical data tracking.

---

Redis is fast enough that performance problems often show up suddenly rather than gradually. Hit rate dropping, memory climbing toward the limit, client connections piling up - these issues need to be caught early. redis-stat is a lightweight monitoring tool that gives you a real-time view of the most important Redis metrics without requiring a full monitoring stack.

## What redis-stat Shows

redis-stat samples Redis's INFO output at regular intervals and displays the deltas in a readable table. Key metrics include:

- Commands per second
- Hit rate and miss rate
- Memory usage and fragmentation ratio
- Connected clients
- Blocked clients
- Expired and evicted keys
- Network I/O in bytes per second

It can display this data in the terminal or serve it through a built-in web dashboard.

## Prerequisites

redis-stat is written in Ruby, so you need Ruby installed along with the Redis gem dependencies.

```bash
# Update package lists
sudo apt update

# Install Ruby and build dependencies
sudo apt install -y ruby ruby-dev build-essential

# Verify Ruby is installed
ruby --version
```

## Installing redis-stat

```bash
# Install redis-stat as a Ruby gem
sudo gem install redis-stat

# Verify installation
redis-stat --version
```

If the gem install fails with compilation errors, you may need additional development libraries:

```bash
sudo apt install -y libssl-dev libffi-dev
sudo gem install redis-stat
```

## Basic Usage

The simplest way to run redis-stat is against your local Redis instance:

```bash
# Monitor local Redis, updating every 2 seconds
redis-stat

# Specify a custom update interval (in seconds)
redis-stat 1

# Monitor a remote Redis server
redis-stat redis-host:6379 2
```

The output appears as a scrolling table in your terminal. The first column shows elapsed time, followed by columns for each metric. The deltas between samples are calculated automatically, so "ops/s" shows commands per second rather than cumulative totals.

### Monitoring Redis with Authentication

If your Redis instance requires a password:

```bash
# Use the --auth flag for password authentication
redis-stat --auth=your_redis_password 2

# For a remote authenticated Redis
redis-stat redis-host:6379 --auth=your_redis_password 1
```

### Monitoring Multiple Redis Instances

redis-stat supports monitoring several Redis servers simultaneously:

```bash
# Monitor two Redis instances side by side
redis-stat redis-host-1:6379 redis-host-2:6379 2
```

Each server gets its own column set in the output table.

## Running the Web Dashboard

The web dashboard is useful when you want persistent access or need to share the view with others without giving terminal access.

```bash
# Start redis-stat with the web server enabled
redis-stat --server 2

# Start on a custom port (default is 63790)
redis-stat --server=8080 2

# Web server with authentication
redis-stat --auth=redis_password --server=8080 1
```

Once running, open a browser and navigate to `http://your-server-ip:63790`. The dashboard shows time-series graphs for the monitored metrics, making it easy to spot trends.

### Running redis-stat as a Background Service

For continuous monitoring, run redis-stat as a systemd service:

```bash
sudo nano /etc/systemd/system/redis-stat.service
```

```ini
[Unit]
Description=redis-stat monitoring service
After=network.target redis-server.service

[Service]
Type=simple
# Replace with your actual Redis auth password if needed
ExecStart=/usr/local/bin/redis-stat --server=63790 2
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable redis-stat
sudo systemctl start redis-stat

# Check it is running
sudo systemctl status redis-stat
```

Open port 63790 if UFW is active:

```bash
sudo ufw allow 63790/tcp
```

## Interpreting the Output

Understanding what the numbers mean helps you act on what redis-stat shows.

### Hit Rate

The hit rate is the ratio of cache hits to total lookups. A healthy cache hit rate depends on your use case, but anything below 90% for a pure caching workload suggests your keyspace is too large for available memory, or keys are expiring too aggressively.

```bash
# Check current hit/miss stats directly in Redis
redis-cli INFO stats | grep -E "keyspace_(hits|misses)"
```

### Memory Fragmentation Ratio

A fragmentation ratio between 1.0 and 1.5 is normal. Values above 1.5 mean Redis is holding significantly more memory than it is actually using - this often happens after large delete operations. Values below 1.0 indicate Redis is using virtual memory (swap), which will severely hurt performance.

### Evicted Keys

Evictions happen when Redis runs out of memory and must remove keys according to the configured eviction policy. Seeing non-zero evictions means your Redis instance is memory-constrained. Check the current eviction policy:

```bash
redis-cli CONFIG GET maxmemory-policy
```

Common policies include `allkeys-lru`, `volatile-lru`, and `noeviction`. If evictions are causing problems, either increase `maxmemory` or reduce the data stored.

### Blocked Clients

Blocked clients are waiting on commands like BLPOP or BRPOP. A steadily growing blocked client count can indicate that producers are not keeping up with consumers, or that a consumer has crashed without releasing the block.

## Combining redis-stat with Shell Scripting

You can capture redis-stat output for logging:

```bash
# Run redis-stat for 60 iterations and save output to a log file
redis-stat 1 60 >> /var/log/redis-stat.log

# Rotate logs with logrotate
sudo nano /etc/logrotate.d/redis-stat
```

```text
/var/log/redis-stat.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

## Checking Redis Health Directly

While redis-stat covers the most useful metrics, sometimes you need more detail. The Redis CLI provides raw access:

```bash
# Full server info
redis-cli INFO all

# Memory details
redis-cli INFO memory

# Client connection details
redis-cli CLIENT LIST

# Slowlog - queries taking longer than the threshold
redis-cli SLOWLOG GET 10

# Check the slowlog threshold (microseconds)
redis-cli CONFIG GET slowlog-log-slower-than
```

## Alternatives to redis-stat

For environments already running Prometheus, the redis_exporter is worth considering. It exposes Redis metrics as Prometheus-compatible endpoints and integrates with Grafana dashboards. redis-stat is better suited for quick, terminal-based investigation without the overhead of a full metrics stack.

```bash
# Install redis_exporter if moving to Prometheus
wget https://github.com/oliver006/redis_exporter/releases/latest/download/redis_exporter-v1.x.x.linux-amd64.tar.gz
```

For most operational use cases, redis-stat provides enough visibility to identify problems quickly. Keep it running as a background service with the web dashboard enabled and you will always have a real-time view of your Redis instance health.
