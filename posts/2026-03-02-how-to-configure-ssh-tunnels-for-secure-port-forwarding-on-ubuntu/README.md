# How to Configure SSH Tunnels for Secure Port Forwarding on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Networking, Security, Linux

Description: A practical guide to configuring SSH tunnels on Ubuntu for local, remote, and dynamic port forwarding to securely access services across networks and firewalls.

---

SSH tunnels let you forward network traffic through an encrypted SSH connection. This has several practical uses: accessing services on remote servers that aren't exposed publicly, bypassing restrictive firewalls, exposing local services through a remote server, or routing arbitrary traffic through a SOCKS proxy. You're using infrastructure you already have (SSH access) without needing to set up a separate VPN.

## Types of SSH Tunnels

There are three modes of SSH port forwarding:

- **Local forwarding** - forward a local port to a remote destination through the SSH server
- **Remote forwarding** - forward a port on the SSH server back to a local destination
- **Dynamic forwarding** - create a SOCKS proxy on a local port that routes traffic through the SSH server

## Local Port Forwarding

Local port forwarding makes a remote service accessible on a local port. The traffic flows: local port -> SSH server -> destination.

```bash
# Basic syntax
# ssh -L [bind_address:]local_port:destination_host:destination_port user@ssh_server

# Access a remote database that's only listening on localhost
# This makes the remote MySQL accessible at localhost:3306 locally
ssh -L 3306:localhost:3306 user@dbserver.example.com

# Use a different local port to avoid conflicts
ssh -L 13306:localhost:3306 user@dbserver.example.com

# Access a service on a third machine reachable only from the SSH server
# Traffic goes: local:8080 -> SSH server -> internal-server:80
ssh -L 8080:internal-server.private:80 user@jump-host.example.com

# Bind to a specific local address (0.0.0.0 makes it accessible to all local interfaces)
# This lets other machines on your local network use the tunnel
ssh -L 0.0.0.0:8080:internal-server.private:80 user@jump-host.example.com

# Run as a background process (no shell) with keep-alive
ssh -N -L 3306:localhost:3306 user@dbserver.example.com &
```

The `-N` flag tells SSH not to execute a remote command, and `-f` sends it to the background before command execution:

```bash
# Fork to background automatically
ssh -f -N -L 3306:localhost:3306 user@dbserver.example.com

# Find and kill the background tunnel later
ps aux | grep "ssh -f"
kill <PID>
```

## Remote Port Forwarding

Remote forwarding works in the opposite direction - it exposes a local service on a port of the remote SSH server. This is useful for exposing a local development server or service through a public server you have SSH access to.

```bash
# Basic syntax
# ssh -R [bind_address:]remote_port:local_host:local_port user@ssh_server

# Expose local port 3000 (a dev server) on the remote server's port 8080
ssh -R 8080:localhost:3000 user@public-server.example.com

# Now anyone who can reach public-server.example.com:8080 will reach your local :3000

# Expose with a specific bind address on the remote end
# By default, remote forwarding only binds to loopback (127.0.0.1)
# To bind to all interfaces on the remote server, you need:
# 1. GatewayPorts yes in the remote server's sshd_config
# 2. Then use:
ssh -R 0.0.0.0:8080:localhost:3000 user@public-server.example.com
```

To allow remote port forwarding to bind to external interfaces on the SSH server, edit `/etc/ssh/sshd_config`:

```bash
# On the SSH server
sudo nano /etc/ssh/sshd_config
```

```
# Allow remote forwarded ports to bind to non-loopback addresses
GatewayPorts yes
```

```bash
sudo systemctl reload sshd
```

## Dynamic Port Forwarding (SOCKS Proxy)

Dynamic forwarding creates a SOCKS5 proxy on a local port. Any application that supports SOCKS proxying can use it to route traffic through the SSH server.

```bash
# Create a SOCKS5 proxy on local port 1080
ssh -D 1080 user@proxy-server.example.com

# With -N to not open a shell, and -f to background it
ssh -f -N -D 1080 user@proxy-server.example.com

# Verify the proxy is listening
ss -tlnp | grep 1080
```

To use the SOCKS proxy:

```bash
# Use curl through the proxy
curl --socks5 localhost:1080 https://example.com

# Use wget
export http_proxy=socks5://localhost:1080
export https_proxy=socks5://localhost:1080
wget https://example.com

# Test DNS resolution through the proxy (SOCKS5 supports remote DNS)
curl --socks5-hostname localhost:1080 https://example.com
```

Configure Firefox or Chrome to use `localhost:1080` as a SOCKS5 proxy in the network settings to route all browser traffic through the SSH server.

## Keeping Tunnels Alive with SSH Config

Instead of long command-line flags, put tunnel configuration in `~/.ssh/config`:

```bash
nano ~/.ssh/config
```

```
# Jump host / SSH gateway
Host dbserver-tunnel
    HostName dbserver.example.com
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
    # Forward local 5432 to remote postgres
    LocalForward 5432 localhost:5432
    # Stay connected
    ServerAliveInterval 30
    ServerAliveCountMax 3
    # Don't execute a shell
    RequestTTY no
    ExitOnForwardFailure yes
```

Now just run:

```bash
ssh -f -N dbserver-tunnel
```

Multiple `LocalForward` directives work in one SSH connection:

```
Host multi-tunnel
    HostName bastion.example.com
    User ubuntu
    LocalForward 5432 db.internal:5432
    LocalForward 6379 redis.internal:6379
    LocalForward 9200 elasticsearch.internal:9200
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

## Making Tunnels Persistent with autossh

The `autossh` tool monitors an SSH tunnel and restarts it if it dies:

```bash
# Install autossh
sudo apt install autossh

# Start a persistent local tunnel
# -M 0 disables autossh's own monitoring port (relies on ServerAlive instead)
autossh -M 0 -f -N \
    -o "ServerAliveInterval 30" \
    -o "ServerAliveCountMax 3" \
    -L 3306:localhost:3306 \
    user@dbserver.example.com

# Verify it's running
ps aux | grep autossh
```

Create a systemd service for a persistent tunnel:

```bash
sudo tee /etc/systemd/system/ssh-tunnel-db.service << 'EOF'
[Unit]
Description=SSH Tunnel to Database Server
After=network.target

[Service]
Type=simple
# Run as a specific user (make sure they have the SSH key)
User=ubuntu
# Restart if the tunnel dies
Restart=always
RestartSec=10

Environment="AUTOSSH_GATETIME=0"
ExecStart=/usr/bin/autossh -M 0 \
    -o "ServerAliveInterval=30" \
    -o "ServerAliveCountMax=3" \
    -o "ExitOnForwardFailure=yes" \
    -o "StrictHostKeyChecking=accept-new" \
    -N \
    -L 127.0.0.1:3306:localhost:3306 \
    ubuntu@dbserver.example.com

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ssh-tunnel-db

# Check status
systemctl status ssh-tunnel-db
journalctl -u ssh-tunnel-db -f
```

## SSH Jump Hosts (ProxyJump)

When you need to reach a server through an intermediary bastion host:

```bash
# Connect to final-server.internal through bastion.example.com
ssh -J user@bastion.example.com user@final-server.internal

# Multiple hops
ssh -J user@hop1.example.com,user@hop2.internal user@final-target.internal

# In ~/.ssh/config
```

```
Host bastion
    HostName bastion.example.com
    User ubuntu

Host internal-server
    HostName final-server.internal
    User ubuntu
    ProxyJump bastion
```

Combine ProxyJump with port forwarding:

```bash
# Forward a port through two hops
ssh -J bastion.example.com \
    -L 5432:db.internal:5432 \
    user@jump2.internal
```

## Security Considerations

```bash
# Limit which users can create tunnels in sshd_config
# By default all users can create tunnels

# To disable tunnel forwarding for a specific user/group:
# Match User untrusted-user
#     AllowTcpForwarding no

# Disable all forwarding except for specific users
# AllowTcpForwarding no
# (and then enable selectively with Match blocks)

# Check current forwarding settings
sudo sshd -T | grep -i forward

# View active SSH connections with their forwarded ports
ss -tlnp | grep ssh
```

For production setups, always use key-based authentication, keep tunnel sessions limited in scope, and consider restricting the `AllowTcpForwarding` setting in `sshd_config` to users who actually need it. Combine these techniques with monitoring (such as [OneUptime](https://oneuptime.com/blog/post/set-up-ssh-check-receiver/view)) to track connectivity and get alerted when tunnels drop.
