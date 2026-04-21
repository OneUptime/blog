# How to Set Up Persistent SSH Tunnels on IPv4 with autossh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Autossh, IPv4, Persistent Tunnels, High Availability, Networking

Description: Use autossh to create self-healing SSH tunnels on IPv4 that automatically restart after network interruptions, connection drops, or system reboots.

## Introduction

Regular SSH tunnels die silently when the network drops. `autossh` monitors tunnel health and restarts it automatically, making it suitable for production use cases like database access tunnels, monitoring tunnels, or site-to-site connectivity.

## Installing autossh

```bash
# Ubuntu/Debian

sudo apt install autossh

# RHEL/CentOS (with EPEL enabled)
sudo yum install autossh

# Verify
autossh -V
```

## Basic autossh Tunnel

```bash
# autossh syntax: same as ssh but with monitoring enabled
# -M 0: disable autossh's own monitoring (use ServerAlive instead)
# Other flags: same as regular ssh

# IPv4-forced local port forward that auto-restarts
autossh -M 0 -4 -fN \
  -o "ServerAliveInterval 30" \
  -o "ServerAliveCountMax 3" \
  -o "ExitOnForwardFailure yes" \
  -L 5432:db.internal:5432 \
  user@203.0.113.10

# The tunnel restarts automatically if the SSH connection drops
```

## autossh with ~/.ssh/config

```bash
# ~/.ssh/config
Host db-tunnel
    HostName 203.0.113.10
    User tunnel
    AddressFamily inet
    LocalForward 5432 db.internal:5432
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
    StrictHostKeyChecking yes
    IdentityFile ~/.ssh/tunnel_key
```

```bash
# Start the persistent tunnel
autossh -M 0 -fN db-tunnel
```

## systemd Service for Persistent Tunnels

Create a systemd service that starts at boot and restarts on failure:

```ini
# /etc/systemd/system/ssh-tunnel-db.service

[Unit]
Description=SSH Tunnel to Database
After=network.target
# Disable start rate limiting so systemd keeps retrying
StartLimitIntervalSec=0

[Service]
User=tunnel-user
# Use autossh with IPv4 forced
ExecStart=/usr/bin/autossh -M 0 -4 -N \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -o "StrictHostKeyChecking=yes" \
    -i /home/tunnel-user/.ssh/tunnel_key \
    -L 127.0.0.1:5432:db.internal:5432 \
    tunnel@203.0.113.10

# Restart autossh if it exits
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ssh-tunnel-db
sudo systemctl start ssh-tunnel-db

# Check status
sudo systemctl status ssh-tunnel-db

# View logs
sudo journalctl -u ssh-tunnel-db -f
```

## Monitoring autossh Tunnels

```bash
# List running autossh processes
ps aux | grep autossh

# Check local tunnel ports are listening
ss -tlnp | grep :5432

# Test tunnel connectivity
nc -zv 127.0.0.1 5432

# Check autossh log level (set AUTOSSH_DEBUG=1 for verbose)
AUTOSSH_DEBUG=1 autossh -M 0 -N -L 5432:db.internal:5432 user@203.0.113.10
```

## Multiple Tunnel Services

```bash
# Create multiple tunnel service files from a template
for tunnel in db-primary db-replica cache; do
  sudo tee /etc/systemd/system/ssh-tunnel-${tunnel}.service > /dev/null << EOF
[Unit]
Description=SSH Tunnel - ${tunnel}
After=network.target

[Service]
User=tunnel-user
ExecStart=/usr/bin/autossh -M 0 -4 -N ssh-${tunnel}-config
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
done

sudo systemctl daemon-reload
sudo systemctl enable ssh-tunnel-{db-primary,db-replica,cache}
```

## Conclusion

`autossh` with systemd creates production-grade persistent IPv4 SSH tunnels. Use `-M 0` with SSH `ServerAliveInterval`/`ServerAliveCountMax` for reliable keep-alive monitoring, `ExitOnForwardFailure yes` to exit promptly when tunnels fail (triggering systemd restart), and separate service files per tunnel for independent management and monitoring.
