# How to Fix "Redis unable to persist on disk" Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Troubleshooting, DevOps, Storage

Description: Learn how to diagnose and fix Redis persistence failures, understand the differences between RDB and AOF issues, and implement solutions for disk-related problems.

---

When Redis cannot write to disk, your data is at risk. The error "MISCONF Redis is configured to save RDB snapshots, but it is currently not able to persist on disk" stops write operations entirely. This is Redis protecting your data by refusing writes when persistence is broken.

## Understanding the Error

Redis can be configured to stop accepting writes when persistence fails. This behavior is controlled by these settings:

```bash
# Check current configuration
redis-cli CONFIG GET stop-writes-on-bgsave-error
# "stop-writes-on-bgsave-error" "yes"

redis-cli CONFIG GET stop-writes-on-bgsave-error
```

When `stop-writes-on-bgsave-error` is `yes` and a save fails, Redis rejects writes with:

```
MISCONF Redis is configured to save RDB snapshots, but it is currently not able to persist on disk.
```

## Quick Fix (Temporary)

To restore write operations immediately:

```bash
# Disable write blocking (temporary fix)
redis-cli CONFIG SET stop-writes-on-bgsave-error no

# This allows writes but your data is NOT being persisted
# Fix the underlying issue before relying on this
```

## Diagnosing the Root Cause

### Check Disk Space

```bash
# Check disk space for Redis data directory
redis-cli CONFIG GET dir
# Returns: "dir" "/var/lib/redis"

df -h /var/lib/redis

# If disk is full:
# - Delete old backup files
# - Move data to larger disk
# - Clean up old log files
```

### Check Permissions

```bash
# Check ownership and permissions
ls -la /var/lib/redis/

# Redis user must own the directory
chown -R redis:redis /var/lib/redis/

# Directory must be writable
chmod 750 /var/lib/redis/

# Check if Redis can create files
sudo -u redis touch /var/lib/redis/test.txt
rm /var/lib/redis/test.txt
```

### Check Memory (Fork Failure)

```bash
# Check available memory
free -h

# Check Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Check overcommit setting
cat /proc/sys/vm/overcommit_memory

# Fix: Enable overcommit
echo 1 > /proc/sys/vm/overcommit_memory
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
```

### Check for I/O Errors

```bash
# Check system logs for disk errors
dmesg | grep -i "error\|fail\|i/o"

# Check Redis logs
tail -100 /var/log/redis/redis-server.log | grep -i "error\|fail\|save"

# Check disk health
smartctl -a /dev/sda
```

## Common Solutions

### 1. Free Disk Space

```bash
# Find large files
du -sh /var/lib/redis/*

# Remove old RDB backups
ls -la /var/lib/redis/*.rdb
rm /var/lib/redis/dump.rdb.old

# Remove old AOF files
ls -la /var/lib/redis/*.aof*
rm /var/lib/redis/appendonly.aof.old

# Clean up temp files
rm /var/lib/redis/temp-*.rdb
rm /var/lib/redis/temp-rewriteaof-*.aof
```

### 2. Move Data Directory

```bash
# Stop Redis
systemctl stop redis

# Create new directory
mkdir -p /mnt/data/redis
chown redis:redis /mnt/data/redis

# Move data
mv /var/lib/redis/* /mnt/data/redis/

# Update configuration
sed -i 's|dir /var/lib/redis|dir /mnt/data/redis|' /etc/redis/redis.conf

# Start Redis
systemctl start redis

# Verify
redis-cli CONFIG GET dir
```

### 3. Fix Memory Issues

```bash
# Enable memory overcommit (required for fork)
sysctl vm.overcommit_memory=1

# Make permanent
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf

# Disable Transparent Huge Pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# Limit Redis memory to leave room for fork
redis-cli CONFIG SET maxmemory 6gb
```

### 4. Fix File System Issues

```bash
# Check file system
fsck -n /dev/sda1  # Dry run check

# If errors found, unmount and repair
# (requires downtime)
umount /mnt/data
fsck /dev/sda1
mount /mnt/data

# Check for read-only mount
mount | grep "var/lib/redis"
# If read-only, remount
mount -o remount,rw /var/lib/redis
```

## Monitoring Script

```python
import redis
import shutil
import psutil
import time

def check_persistence_health(redis_client):
    """Check if Redis can persist data."""
    issues = []

    # Get persistence info
    info = redis_client.info('persistence')
    config_dir = redis_client.config_get('dir')['dir']

    # Check RDB status
    if info.get('rdb_last_bgsave_status') != 'ok':
        issues.append("RDB save is failing")

    # Check AOF status (if enabled)
    if info.get('aof_enabled', 0):
        if info.get('aof_last_bgrewrite_status') != 'ok':
            issues.append("AOF rewrite is failing")

    # Check disk space
    disk = shutil.disk_usage(config_dir)
    free_gb = disk.free / (1024 ** 3)
    if free_gb < 5:
        issues.append(f"Low disk space: {free_gb:.1f}GB free")

    # Check memory for fork
    memory = psutil.virtual_memory()
    redis_mem = int(info.get('used_memory', 0))
    if memory.available < redis_mem:
        issues.append("Insufficient memory for fork")

    return issues

# Usage
r = redis.Redis()
issues = check_persistence_health(r)

if issues:
    print("PERSISTENCE ISSUES DETECTED:")
    for issue in issues:
        print(f"  - {issue}")
else:
    print("Persistence health: OK")
```

## Alerting Configuration

### Prometheus Alert Rules

```yaml
groups:
- name: redis_persistence
  rules:
  - alert: RedisPersistenceFailing
    expr: redis_rdb_last_bgsave_status != 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Redis RDB persistence failing"
      description: "Redis RDB save has been failing for 5 minutes"

  - alert: RedisLowDiskSpace
    expr: (node_filesystem_avail_bytes{mountpoint="/var/lib/redis"} / node_filesystem_size_bytes{mountpoint="/var/lib/redis"}) < 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Low disk space for Redis"
      description: "Less than 10% disk space remaining"
```

### Health Check Script

```bash
#!/bin/bash
# redis-persistence-check.sh

# Check if persistence is working
rdb_status=$(redis-cli INFO persistence | grep rdb_last_bgsave_status | cut -d: -f2 | tr -d '\r')

if [ "$rdb_status" != "ok" ]; then
    echo "CRITICAL: RDB persistence failing"

    # Try to diagnose
    dir=$(redis-cli CONFIG GET dir | tail -1)

    # Check disk space
    disk_free=$(df -h "$dir" | awk 'NR==2 {print $4}')
    echo "Disk free: $disk_free"

    # Check permissions
    if [ -w "$dir" ]; then
        echo "Directory is writable"
    else
        echo "Directory is NOT writable"
    fi

    exit 2
fi

echo "OK: Persistence healthy"
exit 0
```

## Preventing Future Issues

### Configure Appropriate Limits

```bash
# In redis.conf

# Set memory limit (leave room for fork overhead)
maxmemory 6gb

# Use appropriate eviction policy
maxmemory-policy allkeys-lru

# Configure RDB save points
save 900 1
save 300 10
save 60 10000

# Configure AOF
appendonly yes
appendfsync everysec

# Auto-rewrite AOF when it doubles in size
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Set Up Disk Monitoring

```python
def monitor_disk_for_redis(redis_client, warning_threshold_gb=10, critical_threshold_gb=5):
    """Monitor disk space for Redis data directory."""
    config_dir = redis_client.config_get('dir')['dir']
    disk = shutil.disk_usage(config_dir)
    free_gb = disk.free / (1024 ** 3)

    if free_gb < critical_threshold_gb:
        return ('CRITICAL', f"Only {free_gb:.1f}GB free disk space")
    elif free_gb < warning_threshold_gb:
        return ('WARNING', f"Only {free_gb:.1f}GB free disk space")
    else:
        return ('OK', f"{free_gb:.1f}GB free disk space")

# Run periodically
import schedule
import time

def check_and_alert():
    r = redis.Redis()
    status, message = monitor_disk_for_redis(r)
    if status != 'OK':
        send_alert(status, message)  # Implement your alerting

schedule.every(5).minutes.do(check_and_alert)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Recovery Steps

If persistence is completely broken:

```bash
# 1. Stop Redis
systemctl stop redis

# 2. Fix the underlying issue (disk, permissions, etc.)

# 3. Check data integrity
redis-check-rdb /var/lib/redis/dump.rdb
redis-check-aof /var/lib/redis/appendonly.aof

# 4. Start Redis
systemctl start redis

# 5. Verify persistence is working
redis-cli BGSAVE
sleep 5
redis-cli LASTSAVE

# 6. Re-enable write protection
redis-cli CONFIG SET stop-writes-on-bgsave-error yes
```

---

Persistence failures in Redis are serious because they put your data at risk. The immediate fix is to disable write blocking, but you must address the root cause quickly. Most issues come down to disk space, permissions, or memory for fork operations. Set up monitoring to catch these issues before they become critical, and always verify persistence is working after any infrastructure changes.
