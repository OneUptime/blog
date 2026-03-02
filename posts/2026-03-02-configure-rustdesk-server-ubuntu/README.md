# How to Configure RustDesk Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RustDesk, Remote Desktop, Self-Hosted, Rust

Description: Set up a self-hosted RustDesk relay and ID server on Ubuntu to enable private, secure remote desktop access without relying on third-party relay infrastructure.

---

RustDesk is an open-source remote desktop application written in Rust. Unlike TeamViewer or AnyDesk, you can run your own relay and ID server infrastructure. This means your remote desktop traffic stays within your own network or VPS - nothing passes through third-party servers. The server components are small, efficient, and straightforward to deploy on Ubuntu.

## RustDesk Server Architecture

The self-hosted RustDesk infrastructure consists of two daemons:

- **hbbs (ID/Rendezvous Server)**: Handles client registration and peer discovery. Clients register with their ID and public key. When client A wants to connect to client B, hbbs tells them each other's connection details.
- **hbbr (Relay Server)**: Handles the actual traffic relay when direct peer-to-peer connection isn't possible (e.g., behind strict NAT).

Both services are lightweight and can run on the same server.

## Installing RustDesk Server

### From Binary Release

```bash
# Create a dedicated user and directory
sudo useradd -r -s /usr/sbin/nologin rustdesk
sudo mkdir -p /opt/rustdesk
sudo chown rustdesk:rustdesk /opt/rustdesk

# Download the latest server binaries
# Check https://github.com/rustdesk/rustdesk-server/releases for latest version
RDVER="1.1.10-3"
ARCH=$(uname -m)

# Map arch names
case "$ARCH" in
    x86_64)  RDARCH="x86_64-unknown-linux-musl" ;;
    aarch64) RDARCH="aarch64-unknown-linux-musl" ;;
esac

cd /tmp
wget "https://github.com/rustdesk/rustdesk-server/releases/download/${RDVER}/rustdesk-server-linux-${RDARCH}.zip" \
    -O rustdesk-server.zip

unzip rustdesk-server.zip

# Install binaries
sudo install -o rustdesk -g rustdesk -m 0755 \
    hbbs hbbr /opt/rustdesk/
```

### Verify the Binaries

```bash
/opt/rustdesk/hbbs --version
/opt/rustdesk/hbbr --version
```

## Configuring Firewall Rules

RustDesk server requires several ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 21115 | TCP | hbbs (NAT type test) |
| 21116 | TCP/UDP | hbbs (ID registration and heartbeat) |
| 21117 | TCP | hbbr (relay) |
| 21118 | TCP | hbbs (WebSocket, optional) |
| 21119 | TCP | hbbr (WebSocket, optional) |

```bash
# UFW rules for RustDesk
sudo ufw allow 21115/tcp
sudo ufw allow 21116/tcp
sudo ufw allow 21116/udp
sudo ufw allow 21117/tcp
sudo ufw allow 21118/tcp
sudo ufw allow 21119/tcp

sudo ufw reload
sudo ufw status
```

## Creating systemd Service Units

### hbbs Service (ID/Rendezvous Server)

```bash
sudo nano /etc/systemd/system/rustdesk-hbbs.service
```

```ini
[Unit]
Description=RustDesk ID/Rendezvous Server (hbbs)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=rustdesk
Group=rustdesk
WorkingDirectory=/opt/rustdesk

# Start hbbs
# -r specifies the relay server address (can be same host)
ExecStart=/opt/rustdesk/hbbs -r your-server-ip:21117

# Restart on failure
Restart=on-failure
RestartSec=5s

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rustdesk-hbbs

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Replace `your-server-ip` with your server's public IP address or domain name.

### hbbr Service (Relay Server)

```bash
sudo nano /etc/systemd/system/rustdesk-hbbr.service
```

```ini
[Unit]
Description=RustDesk Relay Server (hbbr)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=rustdesk
Group=rustdesk
WorkingDirectory=/opt/rustdesk

# Start hbbr
ExecStart=/opt/rustdesk/hbbr

Restart=on-failure
RestartSec=5s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=rustdesk-hbbr

NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rustdesk-hbbr
sudo systemctl enable --now rustdesk-hbbs

# Check status
sudo systemctl status rustdesk-hbbs
sudo systemctl status rustdesk-hbbr
```

## Retrieving the Server Public Key

When hbbs starts, it generates a public/private key pair and stores it in `/opt/rustdesk/`. You need the public key to configure clients:

```bash
# The public key file is named after the server key
ls /opt/rustdesk/
cat /opt/rustdesk/id_ed25519.pub
```

The public key is a base64 string that looks like:

```
AAAA...yourpublickey...AAAA=
```

Copy this value - you'll need it when configuring RustDesk clients.

## Configuring RustDesk Clients

On each machine that needs remote access, configure the RustDesk client to use your self-hosted server:

1. Open RustDesk
2. Click the three-dot menu or Settings
3. Go to Network or ID/Relay Server settings
4. Enter:
   - **ID Server**: `your-server-ip` or `your-domain.com`
   - **Relay Server**: `your-server-ip` or `your-domain.com`
   - **API Server**: Leave empty unless using the pro version
   - **Key**: Paste the public key from `/opt/rustdesk/id_ed25519.pub`

Clients will now register with your self-hosted infrastructure.

## Using Docker Compose (Alternative Setup)

If you prefer containers:

```bash
sudo apt install docker.io docker-compose

sudo mkdir -p /opt/rustdesk
cd /opt/rustdesk

sudo nano docker-compose.yml
```

```yaml
version: "3"
services:
  hbbs:
    container_name: hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs -r your-server-ip:21117
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped
    depends_on:
      - hbbr

  hbbr:
    container_name: hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped
```

```bash
sudo docker-compose up -d

# View logs
sudo docker-compose logs -f
```

## Monitoring and Logs

```bash
# View hbbs logs
sudo journalctl -u rustdesk-hbbs -f

# View hbbr logs
sudo journalctl -u rustdesk-hbbr -f

# Check connections
sudo ss -tlnp | grep -E '21115|21116|21117'

# Count active relay connections
sudo journalctl -u rustdesk-hbbr --since "1 hour ago" | \
    grep -c "connected"
```

## Enabling Encrypted Relay

For additional security, enable TLS for relay connections. The pro version has built-in TLS, but the community version supports encryption through the key exchange mechanism when clients use the server key.

Ensure all clients are configured with the correct public key - this validates server identity and ensures end-to-end encryption of sessions.

## Setting Up Behind a Domain Name

For easier client configuration, put your server behind a domain name:

```bash
# Point your domain to the server IP in DNS
# A record: rustdesk.example.com -> your-server-ip

# Update hbbs start command to use domain
ExecStart=/opt/rustdesk/hbbs -r rustdesk.example.com:21117
```

Clients then use `rustdesk.example.com` instead of an IP address.

## Upgrading RustDesk Server

```bash
# Stop services
sudo systemctl stop rustdesk-hbbs rustdesk-hbbr

# Download new version and replace binaries
# (repeat the installation steps with the new version number)

# The key files are preserved in /opt/rustdesk/
# so clients don't need reconfiguration

sudo systemctl start rustdesk-hbbr rustdesk-hbbs
```

## Troubleshooting

**Clients can't connect:**

```bash
# Check that all ports are open
sudo ss -tulnp | grep -E '21115|21116|21117'

# Test from client machine
nc -zv your-server-ip 21116
nc -zvu your-server-ip 21116  # UDP test

# Check firewall is not blocking
sudo ufw status verbose
```

**Wrong key error on clients:**

```bash
# Regenerate and recopy the public key
cat /opt/rustdesk/id_ed25519.pub
```

**High CPU usage:**

RustDesk relay usage scales with the number of active sessions and their bandwidth. Monitor CPU and network:

```bash
# Monitor resource usage
top -p $(pgrep -d, hbbr)
iftop -i eth0
```

**Logs showing connection refused:**

Ensure hbbr is running before hbbs, or use the `depends_on` directive in Docker Compose. hbbs needs to reach hbbr to register relay address.

## Summary

Self-hosting RustDesk relay and ID server infrastructure on Ubuntu takes about 15 minutes and gives you complete control over your remote desktop traffic routing. The server components are minimal in resource usage, making them suitable for a small VPS or internal server. Clients configured with your server's public key benefit from encrypted sessions that never touch external relay infrastructure.
