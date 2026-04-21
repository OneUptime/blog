# How to Configure GatewayPorts in sshd_config for IPv4 Remote Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, GatewayPorts, IPv4, Sshd_config, Remote Port Forwarding, Server

Description: Configure the GatewayPorts directive in sshd_config to allow SSH remote port forwards to bind to specific IPv4 addresses instead of only localhost.

## Introduction

By default, SSH remote port forwards (`-R`) bind only to loopback addresses on the server (`127.0.0.1` for IPv4). The `GatewayPorts` directive in `sshd_config` controls whether remote forwards can bind to all interfaces (`yes`) or a client-specified IPv4 address (`clientspecified`).

## Understanding GatewayPorts Options

| Value | Behavior |
|---|---|
| `no` (default) | Remote forwards bind to loopback only (`127.0.0.1` for IPv4) |
| `yes` | Remote forwards bind to `0.0.0.0` (all interfaces) |
| `clientspecified` | Client can specify the bind address |

## Configuring sshd_config

```bash
# /etc/ssh/sshd_config

# Choose one GatewayPorts option:

# Option 1: Allow all remote forwards on all interfaces
#GatewayPorts yes

# Option 2: Let clients choose the bind address (recommended)
GatewayPorts clientspecified

# Related settings for port forwarding
AllowTcpForwarding yes    # Enable TCP port forwarding
PermitListen any          # Allow remote forwards to listen on any address/port
```

Apply changes:

```bash
# Test sshd config
sudo sshd -t

# Restart sshd
sudo systemctl restart sshd

# Verify GatewayPorts is set
sudo sshd -T | grep gatewayports
```

## Client-Side: Using GatewayPorts clientspecified

With `GatewayPorts clientspecified`, the client specifies the bind address:

```bash
# Bind remote forward to specific IPv4 (server must have clientspecified)
ssh -R 203.0.113.10:8080:localhost:3000 user@203.0.113.10
# Port 8080 is now accessible at 203.0.113.10:8080 externally

# Bind to all server interfaces
ssh -R 0.0.0.0:8080:localhost:3000 user@203.0.113.10

# With no address specified, defaults to loopback even with clientspecified
ssh -R 8080:localhost:3000 user@203.0.113.10  # Still only loopback/127.0.0.1 for IPv4
```

## Security Considerations

```bash
# Restrict which users can use GatewayPorts
# Use Match blocks in sshd_config for granular control:

# Global: no gateway ports for most users
GatewayPorts no

# Exception: allow for tunnel user only
Match User tunnel-user
    GatewayPorts yes
    AllowTcpForwarding yes
    PermitTTY no           # No pseudo-TTY allocation
    X11Forwarding no
```

## Firewall Rules for Remote-Forwarded Ports

When GatewayPorts is enabled, opened ports may need firewall rules:

```bash
# Open the forwarded port in iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT

# Or restrict to specific source IPs
sudo iptables -A INPUT -p tcp --dport 8080 -s 198.51.100.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j DROP
```

## Verifying GatewayPorts Behavior

```bash
# Client: start remote forward with specific IPv4 bind
ssh -R 203.0.113.10:8080:localhost:3000 -N user@203.0.113.10 &

# Server: verify the port is listening on the correct IP
ssh user@203.0.113.10 "ss -tlnp | grep 8080"
# With GatewayPorts yes:       0.0.0.0:8080
# With clientspecified + IP:   203.0.113.10:8080
# Without GatewayPorts:        loopback/127.0.0.1:8080

# External test (if firewall allows)
curl http://203.0.113.10:8080/
```

## Conclusion

`GatewayPorts clientspecified` is the recommended setting: it gives flexibility without automatically exposing all remote forwards on public interfaces. The client controls the bind address per-connection. Combine with `Match User` blocks to restrict gateway port capabilities to specific tunnel accounts, and ensure firewall rules allow only the intended sources for any ports made externally accessible.
