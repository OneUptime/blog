# How to Install Redis on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Redis, Database, Caching, Performance

Description: Install and configure Redis on Ubuntu Server with proper security settings, persistence options, and system tuning for production use.

---

Redis is an in-memory data structure store used as a cache, message broker, and database. Installing it correctly on Ubuntu involves more than just `apt install redis` - you need to configure authentication, tune memory settings, decide on persistence, and secure it from network access. This guide walks through a production-ready Redis installation.

## Installing Redis

Ubuntu's default repositories include Redis, but may not have the latest version. For recent releases, use the official Redis repository:

```bash
# Option 1: Install from Ubuntu repositories (simpler, slightly older version)
sudo apt update
sudo apt install redis-server

# Check installed version
redis-server --version

# Option 2: Install from official Redis repository (newer version)
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/redis.list

sudo apt update
sudo apt install redis
```

## Initial Service Setup

```bash
# Enable Redis to start on boot
sudo systemctl enable redis-server

# Start the service
sudo systemctl start redis-server

# Check status
sudo systemctl status redis-server

# Verify Redis is responding
redis-cli ping
# Expected output: PONG

# Check which port Redis is listening on
sudo ss -tlnp | grep redis
```

## Core Configuration

The main configuration file is at `/etc/redis/redis.conf`. Open it to make changes:

```bash
sudo nano /etc/redis/redis.conf
```

### Network Configuration

```text
# By default Redis listens on all interfaces
# For a single application server, bind to localhost only
bind 127.0.0.1 ::1

# If other servers need to connect, bind to the server's IP
# bind 127.0.0.1 10.0.0.5

# Default port
port 6379

# Close connection after client has been idle for N seconds (0 to disable)
timeout 300

# TCP keepalive - sends keepalive probes every N seconds
tcp-keepalive 300
```

### Security

```text
# Set a strong password for authentication
# Generate a strong password: openssl rand -base64 32
requirepass "your_very_strong_password_here"

# Rename or disable dangerous commands
rename-command FLUSHDB ""        # Disable FLUSHDB
rename-command FLUSHALL ""       # Disable FLUSHALL
rename-command DEBUG ""          # Disable DEBUG
rename-command CONFIG "CONFIG_admin_only"  # Rename CONFIG
```

### Memory Configuration

```text
# Maximum memory Redis will use
# Without this limit, Redis will use all available RAM
maxmemory 1gb

# What to do when memory limit is reached
# allkeys-lru: Remove least recently used keys (good for caching)
# volatile-lru: Remove LRU keys with TTL set
# allkeys-random: Remove random keys
# volatile-random: Remove random keys with TTL
# volatile-ttl: Remove keys with shortest TTL
# noeviction: Return error when memory is full (default)
maxmemory-policy allkeys-lru

# LRU sample size - larger = more accurate but more CPU
maxmemory-samples 10
```

### Persistence Options

Redis offers three persistence approaches:

**RDB (snapshots)** - Saves the dataset to disk at intervals. Fast restarts, possible data loss:

```text
# Save every 900 seconds if at least 1 key changed
save 900 1
# Save every 300 seconds if at least 10 keys changed
save 300 10
# Save every 60 seconds if at least 10000 keys changed
save 60 10000

# Location of the RDB file
dir /var/lib/redis
dbfilename dump.rdb

# Compress the RDB file (uses CPU, saves disk space)
rdbcompression yes
```

**AOF (Append Only File)** - Logs every write operation. Near-zero data loss, slower:

```text
# Enable AOF
appendonly yes
appendfilename "appendonly.aof"

# How often to sync to disk:
# always - safest, slowest
# everysec - good balance (1 second data loss risk)
# no - fastest, OS decides when to flush
appendfsync everysec

# Rewrite the AOF file when it grows by this percentage
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**No persistence** - For pure caching where data loss is acceptable:

```text
save ""         # Disable RDB snapshots
appendonly no   # Disable AOF
```

## System Tuning

Redis needs some kernel parameters adjusted for best performance:

```bash
# Disable transparent huge pages (THP) - causes latency issues with Redis
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Make this persistent across reboots
sudo nano /etc/rc.local
```

Add before `exit 0`:

```bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
```

```bash
# Set vm.overcommit_memory to 1 to avoid background save issues
sudo sysctl -w vm.overcommit_memory=1
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf

# Increase the connection backlog limit
sudo sysctl -w net.core.somaxconn=65535
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf

sudo sysctl -p
```

## Applying Configuration Changes

```bash
# After editing /etc/redis/redis.conf
sudo systemctl restart redis-server

# Or reload for some settings (without interrupting connections)
sudo systemctl reload redis-server

# Verify configuration was applied
redis-cli -a "your_very_strong_password_here" CONFIG GET maxmemory
redis-cli -a "your_very_strong_password_here" CONFIG GET maxmemory-policy
```

## Basic Redis CLI Usage

```bash
# Connect with password
redis-cli -a "your_password"

# Or authenticate after connecting
redis-cli
127.0.0.1:6379> AUTH your_password
OK

# Basic key operations
127.0.0.1:6379> SET mykey "Hello Redis"
OK
127.0.0.1:6379> GET mykey
"Hello Redis"
127.0.0.1:6379> DEL mykey
(integer) 1

# Set a key with expiration (TTL in seconds)
127.0.0.1:6379> SET session:user123 "data" EX 3600
OK
127.0.0.1:6379> TTL session:user123
(integer) 3599

# Check info and stats
127.0.0.1:6379> INFO server
127.0.0.1:6379> INFO memory
127.0.0.1:6379> INFO stats
127.0.0.1:6379> INFO keyspace

# Count total keys
127.0.0.1:6379> DBSIZE
```

## Firewall Configuration

```bash
# If Redis is only for local applications
sudo ufw deny 6379/tcp

# If remote applications need access
sudo ufw allow from 10.0.0.0/24 to any port 6379 proto tcp comment "Redis access"

# Never expose Redis to the internet without TLS
```

## Setting Up Redis as a Systemd Service with Limits

The default systemd service file can be enhanced:

```bash
sudo systemctl edit redis-server
```

```ini
[Service]
# Increase open file limit for many connections
LimitNOFILE=65535

# Restart automatically if Redis crashes
Restart=always
RestartSec=5

# Set memory limit at the systemd level (backup to maxmemory)
MemoryLimit=2G
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart redis-server
```

## Monitoring Redis

```bash
# Real-time stats (like top, but for Redis)
redis-cli -a "password" --stat

# Monitor all commands as they execute (use briefly, high overhead)
redis-cli -a "password" MONITOR

# Check memory usage
redis-cli -a "password" INFO memory | grep -E "used_memory_human|maxmemory"

# Check hit rate (should be high for caching use case)
redis-cli -a "password" INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Check connected clients
redis-cli -a "password" INFO clients

# Slow query log (queries slower than N microseconds)
redis-cli -a "password" CONFIG SET slowlog-log-slower-than 10000
redis-cli -a "password" SLOWLOG GET 25
```

## Testing the Setup

```bash
# Run the built-in benchmark
redis-benchmark -a "your_password" -q -n 100000

# Test specific commands
redis-benchmark -a "your_password" -t set,get,incr,lpush,lpop -n 100000 -q

# Check the configuration is correctly applied
redis-cli -a "your_password" CONFIG GET bind
redis-cli -a "your_password" CONFIG GET requirepass
redis-cli -a "your_password" CONFIG GET maxmemory
```

Redis is fast and reliable when properly configured. The defaults are fine for development, but production use requires attention to memory limits, eviction policy, persistence settings, and network security. A Redis instance exposed to the internet without authentication has been the source of many security incidents - always bind to localhost or use a firewall.
