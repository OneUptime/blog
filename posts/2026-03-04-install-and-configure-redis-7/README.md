# How to Install and Configure Redis 7 on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redis, Caching, Linux

Description: Learn how to install and Configure Redis 7 on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Redis 7 is an in-memory data store used for caching, session storage, real-time analytics, and message brokering. It provides sub-millisecond response times and supports various data structures.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install Redis

```bash
sudo dnf install -y redis
```

Or for the latest version:

```bash
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm
sudo dnf module enable redis:remi-7.2 -y
sudo dnf install -y redis
```

## Step 2: Configure Redis

```bash
sudo vi /etc/redis/redis.conf
```

Key settings:

```ini
bind 127.0.0.1
port 6379
requirepass your_strong_password
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

## Step 3: Start and Enable

```bash
sudo systemctl enable --now redis
sudo systemctl status redis
```

## Step 4: Test Connection

```bash
redis-cli
AUTH your_strong_password
PING
SET test "Hello Redis"
GET test
```

## Step 5: Configure Firewall (if needed)

```bash
sudo firewall-cmd --permanent --add-port=6379/tcp
sudo firewall-cmd --reload
```

## Step 6: Basic Monitoring

```bash
redis-cli -a your_strong_password INFO
redis-cli -a your_strong_password INFO memory
redis-cli -a your_strong_password MONITOR
```

## Step 7: Performance Tuning

Set kernel parameters:

```bash
echo "vm.overcommit_memory=1" | sudo tee /etc/sysctl.d/99-redis.conf
echo "net.core.somaxconn=65535" | sudo tee -a /etc/sysctl.d/99-redis.conf
sudo sysctl --system
```

Disable Transparent Hugepages:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Conclusion

Redis 7 on RHEL 9 provides a fast, versatile in-memory data store suitable for caching, session management, and real-time applications. Proper configuration of persistence, memory limits, and kernel parameters ensures reliable production operation.
