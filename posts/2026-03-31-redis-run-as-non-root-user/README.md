# How to Run Redis as a Non-Root User

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Linux, Systemd, Hardening

Description: Run Redis under a dedicated non-root system user to reduce the attack surface, limit privilege escalation risk, and follow Linux security best practices.

---

Running Redis as root is a significant security risk. If an attacker exploits a Redis vulnerability or gains access through a misconfiguration, root-level access gives them full control of the system. Running Redis under a dedicated non-root user limits the blast radius.

## Creating a Dedicated Redis User

```bash
# Create a system user with no login shell and no home directory
sudo useradd --system --no-create-home --shell /bin/false redis

# Create necessary directories and set ownership
sudo mkdir -p /var/lib/redis /var/log/redis /run/redis
sudo chown -R redis:redis /var/lib/redis /var/log/redis /run/redis
sudo chmod 750 /var/lib/redis /var/log/redis
```

## Configuring Redis to Run as the Non-Root User

Edit `/etc/redis/redis.conf`:

```text
# Run as the redis user
# (used when started as root; Redis drops privileges to this user)
# If started directly as the redis user, this is ignored.
# Best practice: always start as the dedicated user via systemd

supervised systemd

dir /var/lib/redis
logfile /var/log/redis/redis-server.log
pidfile /run/redis/redis-server.pid

# Disable dangerous commands
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
```

## Systemd Service File

Create `/etc/systemd/system/redis.service`:

```text
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
Type=notify
User=redis
Group=redis
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
TimeoutStopSec=0
Restart=always
RestartSec=2

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/redis /var/log/redis /run/redis
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable redis
sudo systemctl start redis
```

## Verifying the Process Runs as Non-Root

```bash
ps aux | grep redis-server
# Output should show "redis" in the USER column, not "root"

sudo systemctl status redis
# Check User= and Group= in the service status

# Verify the process user
cat /proc/$(pgrep redis-server)/status | grep -E "^(Name|Uid|Gid):"
```

## Running Redis in Docker as Non-Root

The official Redis Docker image already runs `redis-server` as the `redis` user (UID 999). The entrypoint script uses `gosu` to drop privileges from root to the `redis` user when starting `redis-server`. Verify the running process user:

```bash
docker run -d --name redis-test redis:7
docker top redis-test
# The USER column should show "redis" or UID 999 for the redis-server process
docker rm -f redis-test
```

For Docker Compose:

```text
services:
  redis:
    image: redis:7-alpine
    user: "999:999"
    volumes:
      - redis-data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

## File Permission Checklist

```bash
ls -la /var/lib/redis   # Should be owned by redis:redis, mode 750
ls -la /var/log/redis   # Should be owned by redis:redis, mode 750
ls -la /etc/redis/redis.conf  # Should be readable by redis user
```

## Summary

Running Redis as a dedicated non-root system user is a foundational security measure. Use `useradd --system` to create the user, set strict directory permissions, and configure systemd with `NoNewPrivileges=yes` and `ProtectSystem=strict` for defense-in-depth. Always verify the running process UID to confirm the configuration took effect.
