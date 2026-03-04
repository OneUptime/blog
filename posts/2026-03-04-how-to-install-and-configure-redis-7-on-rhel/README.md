# How to Install and Configure Redis 7 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redis, Cache, Database, In-Memory

Description: Learn how to install and configure Redis 7 on RHEL with persistence, security, and performance tuning for production use.

---

Redis is an in-memory data structure store used as a cache, database, and message broker. Redis 7 introduces Redis Functions, ACL improvements, and performance enhancements.

## Installing Redis 7

```bash
# Enable the Redis module from AppStream (if available)
sudo dnf module list redis

# Install Redis from the Remi repository for Redis 7
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
sudo dnf module enable redis:remi-7.2 -y
sudo dnf install -y redis
```

## Starting Redis

```bash
sudo systemctl enable --now redis

# Verify it is running
redis-cli ping
# Output: PONG
```

## Configuring Redis

```bash
# Edit /etc/redis/redis.conf (or /etc/redis.conf depending on installation)

# Key settings to modify:
```

```conf
# /etc/redis/redis.conf

# Bind to specific interfaces (default: 127.0.0.1)
bind 127.0.0.1

# Set a password
requirepass your-strong-password-here

# Set max memory and eviction policy
maxmemory 2gb
maxmemory-policy allkeys-lru

# Enable persistence with RDB snapshots
save 900 1
save 300 10
save 60 10000

# Enable AOF (Append-Only File) for durability
appendonly yes
appendfsync everysec

# Set log file
logfile /var/log/redis/redis.log
```

## Security Configuration

```bash
# Create ACL users (Redis 6+ ACL system)
redis-cli
> ACL SETUSER appuser on >apppassword ~app:* +@all -@dangerous
> ACL SETUSER readonly on >readpass ~* +@read
> ACL LIST
> ACL SAVE
```

## Memory Tuning

```bash
# Set the Linux kernel overcommit memory setting
sudo sysctl -w vm.overcommit_memory=1
echo "vm.overcommit_memory = 1" | sudo tee /etc/sysctl.d/99-redis.conf

# Disable Transparent Huge Pages (recommended by Redis)
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Make THP change persistent
cat << 'SERVICE' | sudo tee /etc/systemd/system/disable-thp.service
[Unit]
Description=Disable Transparent Huge Pages

[Service]
Type=simple
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/enabled"

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl enable disable-thp
```

## Firewall (if accepting remote connections)

```bash
sudo firewall-cmd --add-port=6379/tcp --permanent
sudo firewall-cmd --reload
```

## Testing Redis

```bash
# Connect with authentication
redis-cli -a your-strong-password-here

# Basic operations
redis-cli -a your-strong-password-here SET mykey "hello"
redis-cli -a your-strong-password-here GET mykey

# Check server info
redis-cli -a your-strong-password-here INFO server
redis-cli -a your-strong-password-here INFO memory
```

Always set a strong password with `requirepass` and use ACL users for applications. Never expose Redis to the internet without authentication and firewall rules.
