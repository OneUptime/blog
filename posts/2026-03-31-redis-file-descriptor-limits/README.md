# How to Configure Redis File Descriptor Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, File Descriptor, Linux, Configuration, Performance

Description: Configure Linux file descriptor limits for Redis to support high connection counts, covering ulimit, systemd LimitNOFILE, and kernel parameter tuning.

---

Each Redis client connection consumes one file descriptor. On a default Linux system, the per-process file descriptor limit is 1024, which means Redis can handle fewer than 1000 concurrent connections before failing with "Too many open files" errors. In production, you need to raise this limit.

## Check the Current Limits

```bash
# Check the system-wide limit
cat /proc/sys/fs/file-max

# Check the current Redis process limit
PID=$(redis-cli info server | grep process_id | awk -F: '{print $2}' | tr -d '[:space:]')
cat /proc/$PID/limits | grep "open files"
```

Redis also reports its configured limit:

```bash
redis-cli info clients | grep maxclients
redis-cli CONFIG GET maxclients
```

## Why Redis Needs Many File Descriptors

Each Redis connection uses:
- 1 fd for the client socket
- 1 fd per open file for persistence (RDB, AOF)
- Internal fds for logging, replication

A safe formula: `maxclients + 32` (for internal use). If `maxclients` is 10000, set `LimitNOFILE` to at least 10032.

## Option 1: Set Limits via systemd (Recommended)

Edit the Redis systemd unit override:

```bash
sudo systemctl edit redis
```

```text
[Service]
LimitNOFILE=65535
```

Apply and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart redis
```

Verify:

```bash
PID=$(redis-cli info server | grep process_id | awk -F: '{print $2}' | tr -d '[:space:]')
cat /proc/$PID/limits | grep "open files"
# Max open files     65535     65535     files
```

## Option 2: Set System-Wide Limits in /etc/security/limits.conf

```bash
sudo tee -a /etc/security/limits.conf > /dev/null <<'EOF'
redis soft nofile 65535
redis hard nofile 65535
* soft nofile 65535
* hard nofile 65535
EOF
```

This takes effect for new login sessions. It does not affect running services managed by systemd.

## Option 3: Increase the System-Wide File Descriptor Limit

For systems running many high-connection services:

```bash
# Check current system-wide limit
sysctl fs.file-max

# Increase temporarily
sudo sysctl -w fs.file-max=1000000

# Persist across reboots
echo "fs.file-max = 1000000" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Configure maxclients in redis.conf

Match `maxclients` to your fd limit:

```bash
sudo nano /etc/redis/redis.conf
```

```text
maxclients 10000
```

If Redis cannot set the required fds at startup, it reduces `maxclients` automatically and logs a warning:

```text
WARNING: You requested maxclients of 10000 requiring at least 10032 max file descriptors.
Redis can't set maximum open files to 10032 because of OS error: Operation not permitted.
Current maximum open files is 1024. maxclients has been reduced to 992 to compensate for low ulimit.
```

Resolve the warning by setting `LimitNOFILE` high enough via systemd.

## Verifying the Effective Limit

After applying changes:

```bash
# Force Redis to report the limit
redis-cli CONFIG GET maxclients

# Check the OS-level limit for the Redis process
PID=$(pgrep redis-server)
cat /proc/$PID/limits | grep "Max open files"
```

## Summary

Redis file descriptor limits are best set via `LimitNOFILE` in the systemd unit file, which takes effect immediately on service restart without requiring a system reboot or session re-login. Set `LimitNOFILE` to at least `maxclients + 32`, and check for startup warnings in `journalctl -u redis` that indicate the OS is silently reducing your configured `maxclients` value.
