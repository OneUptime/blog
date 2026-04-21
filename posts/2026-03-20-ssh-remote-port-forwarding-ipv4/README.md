# How to Set Up SSH Remote Port Forwarding Over IPv4 (-R)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Remote Port Forwarding, IPv4, Tunneling, Reverse Tunnel, Networking

Description: Configure SSH remote port forwarding (-R) to expose local services on remote IPv4 addresses, enabling access to services behind NAT or firewalls from external hosts.

## Introduction

SSH remote port forwarding (`-R`) opens a port on the remote SSH server that tunnels back to a service on your local machine or network. This is the inverse of local forwarding and is commonly used to expose local development servers or access machines behind NAT.

## Basic Remote Port Forwarding

```text
Local Machine         SSH Server            Remote-side Client
     │                     │                      │
     │ SSH connection ──────│                      │
     │                      │ ←──── connects to ───│
     │ local:3000 ←─────────│ remote:8080          │
```

```bash
# Syntax: ssh -R [bind_address:]remote_port:local_host:local_port user@ssh_server

# Expose local web server (port 3000) on remote server's port 8080

ssh -R 8080:localhost:3000 user@203.0.113.10

# Expose local database on remote port 5432
ssh -R 5432:localhost:5432 user@203.0.113.10

# Force IPv4 for the SSH connection
ssh -4 -R 8080:localhost:3000 user@203.0.113.10
```

## Background Remote Tunnel

```bash
# -N: no shell, just the tunnel
# -f: fork to background
ssh -4 -fN -R 8080:localhost:3000 user@203.0.113.10

# Verify tunnel is running
ssh user@203.0.113.10 "ss -tlnp | grep 8080"
```

## Binding Remote Port to Specific IPv4

By default, the remote port binds only to the loopback interface on the server (for IPv4, `127.0.0.1`). To expose it on a specific IPv4:

```bash
# Bind remote port to specific IPv4 on server
# (Requires GatewayPorts clientspecified in server's sshd_config)
ssh -R 203.0.113.10:8080:localhost:3000 user@203.0.113.10

# Or bind to all interfaces on server:
# (Requires GatewayPorts yes or GatewayPorts clientspecified)
ssh -R 0.0.0.0:8080:localhost:3000 user@203.0.113.10
```

Enable `GatewayPorts` on the SSH server:

```bash
# /etc/ssh/sshd_config
GatewayPorts clientspecified  # Let client specify the bind address
# or
GatewayPorts yes    # Force remote forwards to bind to wildcard addresses

sudo systemctl restart sshd
```

## SSH Config for Persistent Remote Tunnels

```bash
# ~/.ssh/config

Host expose-dev
    HostName 203.0.113.10
    User deploy
    AddressFamily inet
    RemoteForward 8080 localhost:3000    # Expose local:3000 as remote:8080
    RemoteForward 8443 localhost:3443
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

```bash
# Start tunnel
ssh -fN expose-dev
```

## Multiple Remote Forwards in One Connection

```bash
# Expose multiple local services in a single SSH session
ssh -4 -fN \
  -R 8080:localhost:3000 \
  -R 3306:localhost:3306 \
  -R 6379:localhost:6379 \
  user@203.0.113.10
```

## Testing Remote Forward

```bash
# On the remote server, verify port is listening
ssh user@203.0.113.10 "ss -tlnp | grep :8080"

# From the remote server, test access to local service
ssh user@203.0.113.10 "curl -s http://127.0.0.1:8080/"

# If GatewayPorts is enabled, from external:
curl http://203.0.113.10:8080/
```

## Conclusion

SSH remote port forwarding (`-R`) exposes local IPv4 services on a remote SSH server's port. Enable `GatewayPorts clientspecified` in `sshd_config` when you need the remote port to be accessible on a specific IPv4 address rather than just the loopback interface; use `GatewayPorts yes` when you want remote forwards to bind to wildcard addresses. Use `autossh` or systemd service units for production reverse tunnels that must restart automatically after network interruptions.
