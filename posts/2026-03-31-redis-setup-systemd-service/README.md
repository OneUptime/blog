# How to Set Up Redis as a systemd Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Systemd, Linux, Service, Production

Description: Configure Redis as a systemd service for automatic startup, restart on failure, and proper resource management on Linux production servers.

---

Running Redis as a managed systemd service ensures it starts automatically on boot, restarts after crashes, and runs under a dedicated user with appropriate resource limits. Most Redis packages install a systemd unit file, but understanding it lets you customize behavior for your production environment.

## Check If a Unit File Already Exists

```bash
systemctl status redis
# or
systemctl status redis-server
```

If it exists, skip to the configuration section. If you installed from source or the unit file is missing, create it.

## Create the redis System User

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin redis
sudo mkdir -p /var/lib/redis /var/log/redis
sudo chown redis:redis /var/lib/redis /var/log/redis
sudo chmod 750 /var/lib/redis
```

## Create the systemd Unit File

```bash
sudo tee /etc/systemd/system/redis.service > /dev/null <<'EOF'
[Unit]
Description=Redis In-Memory Data Store
Documentation=https://redis.io/docs/
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf --supervised systemd
ExecStop=/usr/local/bin/redis-cli shutdown
TimeoutStopSec=30
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/redis /var/log/redis

[Install]
WantedBy=multi-user.target
EOF
```

Key options explained:
- `Type=notify` - Redis signals systemd when it is ready (requires `supervised systemd` in redis.conf).
- `Restart=on-failure` - restarts only on non-zero exit, not on clean stops.
- `LimitNOFILE=65535` - increases the file descriptor limit for high-connection workloads.
- `PrivateTmp=true` - isolates /tmp from other services.

## Update redis.conf

```bash
sudo nano /etc/redis/redis.conf
```

Set:

```text
supervised systemd
daemonize no
logfile /var/log/redis/redis-server.log
dir /var/lib/redis
```

`supervised systemd` makes Redis send the `READY=1` notification to systemd, enabling `Type=notify`.

## Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable redis
sudo systemctl start redis
sudo systemctl status redis
```

## Verify Redis is Running

```bash
redis-cli ping
# PONG

journalctl -u redis -n 20
```

## Customizing Restart Policy

For a high-availability deployment, use aggressive restart settings:

```text
[Unit]
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Restart=always
RestartSec=3
```

This allows up to 5 restart attempts within 60 seconds before systemd stops trying.

## Override Settings Without Editing the Unit File

Use a drop-in file to override settings without modifying the base unit:

```bash
sudo systemctl edit redis
```

This opens an editor for `/etc/systemd/system/redis.service.d/override.conf`:

```text
[Service]
LimitNOFILE=131072
Environment="REDIS_LOG_LEVEL=verbose"
```

## Summary

Register Redis as a systemd service with `Type=notify` and `supervised systemd` for clean startup signaling, set `Restart=on-failure` to recover from crashes automatically, and use `LimitNOFILE=65535` for high-connection environments. Use `systemctl edit` to customize settings without editing the base unit file, keeping your changes safe across package upgrades.
