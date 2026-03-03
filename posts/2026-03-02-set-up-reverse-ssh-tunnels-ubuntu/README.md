# How to Set Up Reverse SSH Tunnels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Networking, Tunneling

Description: Learn how to configure reverse SSH tunnels on Ubuntu to access servers behind firewalls and NAT without exposing ports, using both manual and persistent methods.

---

A reverse SSH tunnel lets you access a machine that you cannot reach directly - a server behind a NAT router, a machine on a corporate network, or a Raspberry Pi on a home connection with no port forwarding. The machine initiates an outbound SSH connection to a publicly accessible server, and that connection can then be used in reverse to reach the original machine.

## Understanding the Concept

In a normal SSH tunnel, you connect from your workstation to a remote server. In a reverse tunnel, the machine you want to reach (the "home" machine) connects out to a relay server. The relay server then acts as the bridge.

The typical setup:
- **Home machine** - the target, behind NAT or a firewall, cannot receive inbound connections
- **Relay server** - a publicly accessible VPS or server with a static IP
- **Your workstation** - where you want to connect from

The home machine creates a tunnel to the relay server. You connect to the relay server, and the relay forwards your connection through the tunnel to the home machine.

## Basic Reverse Tunnel

On the home machine (the one behind NAT):

```bash
# Create a reverse tunnel
# -R sets up remote port forwarding
# 2222 is the port on the relay server
# localhost:22 is the SSH service on the home machine
# relay-server.example.com is the publicly accessible relay
ssh -R 2222:localhost:22 relay-user@relay-server.example.com

# Keep the tunnel alive with keep-alive messages
ssh -R 2222:localhost:22 \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    relay-user@relay-server.example.com
```

This creates a port 2222 on the relay server that forwards through the tunnel to port 22 on the home machine.

Now, from your workstation:

```bash
# Connect to the relay server on the normal port
ssh relay-user@relay-server.example.com

# Then, from the relay server, connect through the tunnel to the home machine
# Port 2222 on localhost is the tunnel endpoint
ssh -p 2222 home-user@localhost
```

Or in a single command from your workstation:

```bash
# Connect directly through the relay using ProxyJump
ssh -J relay-user@relay-server.example.com -p 2222 home-user@localhost
```

## Configuring the Relay Server for Reverse Tunnels

By default, the port opened by `-R` only listens on the loopback interface of the relay server. To allow connections from outside localhost, configure the relay server's `sshd_config`:

```bash
# On the relay server
sudo nano /etc/ssh/sshd_config

# Add or change this setting:
GatewayPorts yes

# Or allow only specific IPs to access the remote-forwarded port:
GatewayPorts clientspecified
```

```bash
sudo systemctl restart ssh
```

With `GatewayPorts yes`, the reverse tunnel port is accessible from any IP:

```bash
# Now you can connect directly from your workstation
# without going through the relay server's shell
ssh -p 2222 home-user@relay-server.example.com
```

## Making the Tunnel Persistent with autossh

For a persistent, automatically-reconnecting tunnel, use `autossh`:

```bash
# Install autossh on the home machine
sudo apt update
sudo apt install autossh

# Create the persistent tunnel with autossh
# -M 0 disables autossh's monitoring port (use SSH keepalives instead)
autossh -M 0 \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -N \
    -R 2222:localhost:22 \
    relay-user@relay-server.example.com
```

The `-N` flag means no command is executed - just keep the tunnel open.

## Creating a systemd Service for the Reverse Tunnel

For a reverse tunnel that starts on boot and restarts on failure:

```bash
# Create the service file
sudo nano /etc/systemd/system/reverse-ssh-tunnel.service
```

```ini
[Unit]
Description=Reverse SSH Tunnel to relay server
After=network-online.target
Wants=network-online.target
# Restart indefinitely on failure
StartLimitIntervalSec=0

[Service]
Type=simple
User=tunnel-user
# The tunnel command
ExecStart=/usr/bin/autossh -M 0 \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -o "StrictHostKeyChecking=accept-new" \
    -N \
    -R 2222:localhost:22 \
    relay-user@relay-server.example.com
# Restart after 10 seconds on any failure
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Create a dedicated user for the tunnel (no login shell needed)
sudo useradd -r -s /bin/false tunnel-user

# Generate an SSH key for this service user
sudo -u tunnel-user ssh-keygen -t ed25519 -f /home/tunnel-user/.ssh/id_ed25519 -N ""

# Copy the key to the relay server
sudo cat /home/tunnel-user/.ssh/id_ed25519.pub
# Add this to relay-user's ~/.ssh/authorized_keys on the relay server

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable reverse-ssh-tunnel.service
sudo systemctl start reverse-ssh-tunnel.service

# Check status
sudo systemctl status reverse-ssh-tunnel.service
```

## Restricting the Tunnel Key on the Relay Server

The tunnel user's key should be restricted so it can only establish a tunnel, not open an interactive shell:

On the relay server, in `~/.ssh/authorized_keys`:

```text
# Restrict the tunnel key - no shell, no port forwarding beyond what's specified
restrict,port-forwarding ssh-ed25519 AAAA... tunnel-user@home-machine
```

Or more specifically:

```text
no-pty,no-agent-forwarding,no-X11-forwarding,permitopen="localhost:2222" ssh-ed25519 AAAA... tunnel-user@home-machine
```

## Forwarding a Web Service (Not Just SSH)

Reverse tunnels work for any TCP service, not just SSH:

```bash
# Forward a web server running on port 8080 on the home machine
# to port 8080 on the relay server
ssh -R 8080:localhost:8080 relay-user@relay-server.example.com

# Forward a local database to the relay server
ssh -R 5432:localhost:5432 relay-user@relay-server.example.com

# Multiple tunnels in one connection
ssh -R 2222:localhost:22 -R 8080:localhost:8080 relay-user@relay-server.example.com
```

## Accessing Services on the Home Network (Not Just Localhost)

The tunnel can forward traffic to other machines on the home network, not just the home machine itself:

```bash
# Forward the relay server's port 3389 to a Windows machine
# at 192.168.1.100 on the home network
ssh -R 3389:192.168.1.100:3389 relay-user@relay-server.example.com

# Access an internal web server at 192.168.1.50:80
ssh -R 8080:192.168.1.50:80 relay-user@relay-server.example.com
```

## Troubleshooting Reverse Tunnels

**Port already in use on relay server**

```bash
# On the relay server, check what's using the port
ss -tlnp | grep 2222
# Kill the old tunnel process if needed
```

**Tunnel disconnects frequently**

```bash
# Increase keepalive aggressiveness
autossh -M 0 \
    -o "ServerAliveInterval=15" \
    -o "ServerAliveCountMax=3" \
    -o "TCPKeepAlive=yes" \
    -N \
    -R 2222:localhost:22 \
    relay-user@relay-server.example.com
```

**"Warning: remote port forwarding failed for listen port 2222"**

The port is already in use on the relay server. Either another tunnel is using it, or a previous tunnel did not clean up:

```bash
# On the relay server
ss -tlnp | grep 2222
kill $(lsof -ti :2222)
```

**Cannot connect through tunnel**

Make sure `GatewayPorts` is configured if connecting from outside the relay server, and verify the tunnel is actually established:

```bash
# On the relay server, confirm the tunnel port is listening
ss -tlnp | grep 2222
# Should show the sshd process listening on 2222
```

## Summary

Reverse SSH tunnels solve the problem of reaching machines behind NAT or firewalls. The target machine initiates an outbound SSH connection to a relay server, creating a port the relay server listens on. You then connect to that port on the relay server to reach the target. Use `autossh` and a systemd service for persistent tunnels that survive reboots and network interruptions. Restrict the tunnel key's permissions on the relay server to prevent the tunnel account from being used for anything beyond maintaining the forward.
