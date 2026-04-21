# How to Set Up SSH Local Port Forwarding Over IPv4 (-L)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Local Port Forwarding, IPv4, Tunneling, Security, Networking

Description: Configure SSH local port forwarding (-L) to securely access remote IPv4 services through an encrypted tunnel, enabling access to databases, web UIs, and internal services.

## Introduction

SSH local port forwarding creates a tunnel from a local port to a remote service through an SSH server. Traffic arrives at your local port and is forwarded by the SSH server to the destination IP:port-enabling secure access to services that are not directly exposed to the internet.

## Basic Local Port Forwarding

```text
Client                   SSH Server              Target Service
  │                          │                        │
  │──── SSH tunnel ──────────│                        │
  │   localhost:8080 ────────→ 192.168.1.100:80       │
```

```bash
# Syntax: ssh -L [bind_address:]local_port:destination_host:destination_port user@ssh_server

# Access remote web server through SSH tunnel

ssh -L 8080:192.168.1.100:80 user@jump.example.com
# Now: curl http://localhost:8080 reaches 192.168.1.100:80

# Access remote MySQL database
ssh -L 3307:192.168.1.50:3306 user@jump.example.com
# Now: mysql -h 127.0.0.1 -P 3307 reaches DB on 192.168.1.50:3306

# Force IPv4 for the SSH connection itself
ssh -4 -L 8080:192.168.1.100:80 user@jump.example.com
```

## Background Tunnel with No Shell

```bash
# -N: don't execute remote commands (no shell, just the tunnel)
# -f: go to background before executing
# -4: force IPv4
ssh -4 -fN -L 5432:db.internal:5432 user@bastion.example.com

# The tunnel runs in the background
# Connect to remote PostgreSQL locally
psql -h 127.0.0.1 -p 5432 -U dbuser mydb
```

## Bind to Specific Local IPv4 Address

```bash
# Bind the local end to a specific IPv4 (default: local loopback)
ssh -L 10.0.0.1:8080:192.168.1.100:80 user@jump.example.com
# Now machines that can reach 10.0.0.1 can use 10.0.0.1:8080 as a tunnel

# To allow all local interfaces (use -g or client-side GatewayPorts):
ssh -g -L 0.0.0.0:8080:192.168.1.100:80 user@jump.example.com
```

## SSH Config File for Permanent Tunnels

```bash
# ~/.ssh/config

Host db-tunnel
    HostName bastion.example.com
    User admin
    AddressFamily inet
    LocalForward 5432 db-primary.internal:5432
    LocalForward 5433 db-replica.internal:5432
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes

Host web-tunnel
    HostName bastion.example.com
    User admin
    AddressFamily inet
    LocalForward 8080 internal-web.example.com:80
    LocalForward 8443 internal-web.example.com:443
```

Usage:

```bash
# Start both tunnels
ssh -fN db-tunnel
ssh -fN web-tunnel

# Connect to database
psql -h 127.0.0.1 -p 5432 -U dbuser mydb
```

## Keeping Tunnels Alive

```bash
# Use autossh to restart tunnels on failure
autossh -M 0 -4 -fN \
  -o "ServerAliveInterval 30" \
  -o "ServerAliveCountMax 3" \
  -L 5432:db.internal:5432 \
  user@bastion.example.com
```

## Conclusion

SSH local port forwarding (`-L`) creates secure encrypted tunnels to remote IPv4 services without exposing them to the internet. Use `-fN` to run the tunnel in the background without a shell, configure `~/.ssh/config` for reusable named tunnels, and use `autossh` for production tunnels that must survive network interruptions. The remote SSH server needs `AllowTcpForwarding yes` in `sshd_config` (enabled by default on most distributions).
