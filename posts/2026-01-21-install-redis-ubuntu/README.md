# How to Install and Configure Redis on Ubuntu/Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ubuntu, Debian, Installation, Database, Caching, Configuration

Description: A comprehensive guide to installing Redis on Ubuntu and Debian systems, covering installation methods, basic configuration, systemd setup, and security best practices for production deployments.

---

Redis is an open-source, in-memory data structure store that serves as a database, cache, message broker, and streaming engine. Known for its exceptional performance and versatility, Redis supports various data structures including strings, hashes, lists, sets, sorted sets, bitmaps, hyperloglogs, geospatial indexes, and streams.

In this guide, we will walk through installing and configuring Redis on Ubuntu and Debian systems, covering everything from basic installation to production-ready configuration.

## Prerequisites

Before installing Redis, ensure you have:

- Ubuntu 20.04/22.04/24.04 or Debian 10/11/12
- A user account with sudo privileges
- At least 1 GB of RAM (more recommended for production)
- Basic familiarity with the Linux command line

## Installation Methods

### Method 1: Install from Official Ubuntu/Debian Repositories

The simplest way to install Redis is from the default package repositories:

```bash
# Update package index
sudo apt update

# Install Redis server
sudo apt install redis-server -y

# Verify installation
redis-server --version
```

This method is straightforward but may not provide the latest Redis version.

### Method 2: Install from Official Redis Repository (Recommended)

For the latest stable version, use the official Redis repository:

```bash
# Install prerequisites
sudo apt update
sudo apt install curl gpg lsb-release -y

# Add Redis GPG key
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

# Add Redis repository
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Update and install Redis
sudo apt update
sudo apt install redis -y

# Verify installation
redis-server --version
```

### Method 3: Build from Source

For maximum control over Redis features and version:

```bash
# Install build dependencies
sudo apt update
sudo apt install build-essential tcl -y

# Download Redis source
cd /tmp
curl -O https://download.redis.io/redis-stable.tar.gz
tar xzf redis-stable.tar.gz
cd redis-stable

# Compile Redis
make
make test  # Optional but recommended

# Install Redis
sudo make install

# Create Redis user and directories
sudo adduser --system --group --no-create-home redis
sudo mkdir -p /var/lib/redis /var/log/redis
sudo chown redis:redis /var/lib/redis /var/log/redis
```

## Basic Configuration

Redis configuration is stored in `/etc/redis/redis.conf`. Let's explore the essential settings.

### Understanding the Configuration File

```bash
# View the configuration file
sudo nano /etc/redis/redis.conf
```

### Essential Configuration Options

Here are the key settings you should configure:

```conf
# Network binding - default only accepts localhost connections
# For local development (secure):
bind 127.0.0.1 ::1

# For production with specific IPs (change to your server IP):
# bind 192.168.1.100 127.0.0.1

# Port - default is 6379
port 6379

# Protected mode - keeps Redis secure when no password is set
protected-mode yes

# Daemonize - run Redis in the background
daemonize yes

# PID file location
pidfile /var/run/redis/redis-server.pid

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Database directory
dir /var/lib/redis

# Maximum memory (set based on your system)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1      # Save after 900 seconds if at least 1 key changed
save 300 10     # Save after 300 seconds if at least 10 keys changed
save 60 10000   # Save after 60 seconds if at least 10000 keys changed
```

### Setting Up Authentication

Always configure a strong password for production:

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Find and uncomment the requirepass directive, set a strong password
# requirepass your_very_strong_password_here
```

Generate a strong password:

```bash
openssl rand -base64 32
```

Update the configuration:

```conf
requirepass Kj8mN2pQ5vX9yB4cT7eH1iL6oU3rA0wD
```

## Systemd Service Setup

If you installed from repositories, Redis is already configured as a systemd service. For source installations, create a service file:

```bash
sudo nano /etc/systemd/system/redis.service
```

Add the following content:

```ini
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/local/bin/redis-cli shutdown
Restart=always
RestartSec=3
Type=notify
RuntimeDirectory=redis
RuntimeDirectoryMode=0755

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable Redis to start on boot
sudo systemctl enable redis

# Start Redis
sudo systemctl start redis

# Check status
sudo systemctl status redis
```

## Managing Redis Service

Common service management commands:

```bash
# Start Redis
sudo systemctl start redis

# Stop Redis
sudo systemctl stop redis

# Restart Redis
sudo systemctl restart redis

# Check status
sudo systemctl status redis

# View logs
sudo journalctl -u redis -f
```

## Verifying Installation

### Test Redis Connection

```bash
# Connect to Redis CLI
redis-cli

# If password is set:
redis-cli -a your_password

# Test basic operations
127.0.0.1:6379> ping
PONG

127.0.0.1:6379> set test_key "Hello, Redis!"
OK

127.0.0.1:6379> get test_key
"Hello, Redis!"

127.0.0.1:6379> del test_key
(integer) 1

127.0.0.1:6379> quit
```

### Check Server Information

```bash
redis-cli INFO server
```

This displays version, mode, port, and other server details.

## Connecting from Applications

### Python Example

```python
import redis

# Connect to Redis
client = redis.Redis(
    host='localhost',
    port=6379,
    password='your_password',  # Remove if no password
    decode_responses=True
)

# Test connection
print(client.ping())  # True

# Basic operations
client.set('user:1:name', 'Alice')
name = client.get('user:1:name')
print(f"Name: {name}")

# Set with expiration (TTL in seconds)
client.setex('session:abc123', 3600, 'user_data_here')

# Check TTL
ttl = client.ttl('session:abc123')
print(f"TTL: {ttl} seconds")
```

Install the Python client:

```bash
pip install redis
```

### Node.js Example

```javascript
const Redis = require('ioredis');

// Connect to Redis
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your_password', // Remove if no password
});

async function main() {
  // Test connection
  const pong = await redis.ping();
  console.log('Ping:', pong);

  // Basic operations
  await redis.set('user:1:name', 'Alice');
  const name = await redis.get('user:1:name');
  console.log('Name:', name);

  // Set with expiration
  await redis.setex('session:abc123', 3600, 'user_data_here');

  // Check TTL
  const ttl = await redis.ttl('session:abc123');
  console.log('TTL:', ttl, 'seconds');

  // Close connection
  redis.disconnect();
}

main().catch(console.error);
```

Install the Node.js client:

```bash
npm install ioredis
```

### Go Example

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Connect to Redis
    client := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "your_password", // Empty string if no password
        DB:       0,
    })
    defer client.Close()

    // Test connection
    pong, err := client.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Ping:", pong)

    // Basic operations
    err = client.Set(ctx, "user:1:name", "Alice", 0).Err()
    if err != nil {
        panic(err)
    }

    name, err := client.Get(ctx, "user:1:name").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Name:", name)

    // Set with expiration
    err = client.SetEx(ctx, "session:abc123", "user_data_here", time.Hour).Err()
    if err != nil {
        panic(err)
    }

    // Check TTL
    ttl, err := client.TTL(ctx, "session:abc123").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("TTL:", ttl)
}
```

Install the Go client:

```bash
go get github.com/redis/go-redis/v9
```

## Security Best Practices

### 1. Bind to Specific Interfaces

Never bind Redis to all interfaces (0.0.0.0) in production:

```conf
# Good - localhost only
bind 127.0.0.1 ::1

# Good - specific private IP
bind 192.168.1.100 127.0.0.1
```

### 2. Use Strong Passwords

Generate and use a strong password:

```bash
# Generate a 32-character password
openssl rand -base64 32
```

### 3. Disable Dangerous Commands

Rename or disable commands that could be misused:

```conf
# In redis.conf
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN "SHUTDOWN_SECUREKEY"
```

### 4. Configure Firewall Rules

Use UFW to restrict access:

```bash
# Allow only from specific IP
sudo ufw allow from 192.168.1.0/24 to any port 6379

# Or allow from localhost only
sudo ufw allow from 127.0.0.1 to any port 6379
```

### 5. Set Memory Limits

Prevent Redis from consuming all system memory:

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Performance Tuning

### System Configuration

Optimize system settings for Redis:

```bash
# Disable Transparent Huge Pages (THP)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make persistent across reboots
echo 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' >> /etc/rc.local
echo 'echo never > /sys/kernel/mm/transparent_hugepage/defrag' >> /etc/rc.local

# Increase max connections
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
sysctl -p

# Set vm.overcommit_memory
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
sysctl -p
```

### Redis Configuration for Performance

```conf
# TCP keepalive
tcp-keepalive 300

# Maximum clients
maxclients 10000

# Disable saving for pure caching use cases
# save ""

# Enable lazy freeing for better performance
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes

# IO threads for better performance on multi-core systems (Redis 6+)
io-threads 4
io-threads-do-reads yes
```

## Monitoring Redis

### Using Redis CLI

```bash
# Real-time statistics
redis-cli --stat

# Monitor all commands in real-time
redis-cli monitor

# Get server information
redis-cli INFO

# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli CLIENT LIST
```

### Key Metrics to Monitor

```bash
# Memory usage
redis-cli INFO memory | grep used_memory_human

# Connected clients
redis-cli INFO clients | grep connected_clients

# Operations per second
redis-cli INFO stats | grep instantaneous_ops_per_sec

# Cache hit ratio
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

## Troubleshooting Common Issues

### Redis Won't Start

Check logs for errors:

```bash
sudo journalctl -u redis -n 50
cat /var/log/redis/redis-server.log
```

Common causes:
- Configuration syntax errors
- Port already in use
- Insufficient permissions

### Connection Refused

```bash
# Check if Redis is running
sudo systemctl status redis

# Check if Redis is listening
sudo netstat -tlnp | grep 6379

# Test local connection
redis-cli ping
```

### Memory Issues

```bash
# Check memory usage
redis-cli INFO memory

# Get memory breakdown
redis-cli MEMORY STATS

# Find large keys
redis-cli --bigkeys
```

## Uninstalling Redis

If you need to remove Redis:

```bash
# Stop the service
sudo systemctl stop redis

# Remove Redis packages
sudo apt remove --purge redis-server redis-tools -y

# Remove data and configuration (careful!)
sudo rm -rf /var/lib/redis /etc/redis

# Remove user
sudo userdel redis
```

## Conclusion

You now have a fully functional Redis installation on Ubuntu or Debian. Redis is configured with basic security measures and ready for development or production use. Key takeaways:

- Use the official Redis repository for the latest version
- Always configure authentication for production
- Bind to specific interfaces and use firewall rules
- Monitor memory usage and set appropriate limits
- Tune system settings for optimal performance

For production deployments, consider setting up Redis replication for high availability and implementing proper backup strategies.
