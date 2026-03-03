# How to Set Up Outline VPN for Team Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Security, Networking, Privacy

Description: A complete guide to deploying Outline VPN server on Ubuntu for secure team access, including server setup, key management, and client distribution.

---

Outline VPN, developed by Jigsaw (an Alphabet subsidiary), is a Shadowsocks-based proxy system designed for team access rather than personal use. The architecture is clean: a management app generates access keys, and team members use the Outline Client app to connect. There is no user accounts database to manage, no certificates to renew, and no complex configuration files.

This guide covers deploying an Outline server on Ubuntu, distributing access to your team, and locking things down.

## How Outline Works

Outline runs as a Docker container. The Manager app (desktop application) communicates with the server API to create and revoke access keys. Each key is a shareable URL that the Outline Client uses to connect. When you remove a key, that user's access is immediately cut off.

The traffic is encrypted using Shadowsocks, which is specifically designed to be resistant to deep packet inspection - useful when team members are in restrictive network environments.

## Prerequisites

- Ubuntu 20.04 or 22.04 server with a public IP
- Docker installed
- Ports 443 and a random management port open
- Root or sudo access

## Installing Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## Running the Outline Server

Outline provides an install script that sets up everything:

```bash
# Download and run the install script
sudo bash -c "$(wget -qO- https://raw.githubusercontent.com/Jigsaw-Code/outline-server/master/src/server_manager/install_scripts/install_server.sh)"
```

The script will:
1. Pull the Outline Docker image
2. Generate a unique API URL and certificate fingerprint
3. Start the server

At the end, you see output like:

```text
CONGRATULATIONS! Your Outline server is up and running.

To manage your Outline server, copy the following line (including curly
brackets) into Step 2 of the Outline Manager interface:

{"apiUrl":"https://203.0.113.42:12345/AbCdEfGhIjKlMnOp","certSha256":"ABC123..."}
```

Copy that JSON string - you need it for the Manager app.

## Configuring Firewall Rules

Outline uses two ports: the management port (random, shown in the API URL) and the access key port (default 443):

```bash
# Allow the management API port (replace 12345 with your actual port)
sudo ufw allow 12345/tcp

# Allow the Shadowsocks traffic port
sudo ufw allow 443/tcp
sudo ufw allow 443/udp

# Enable the firewall if not already active
sudo ufw enable
sudo ufw status
```

## Installing the Outline Manager

Download the Outline Manager desktop app from [https://getoutline.org/get-started/](https://getoutline.org/get-started/) for your OS (Linux AppImage, macOS, or Windows).

1. Open the Manager and click "Add server"
2. Paste the JSON string from the install output
3. The Manager connects to your server

## Creating Access Keys for Team Members

In the Outline Manager, each row is an access key. By default, one key is created. To add team members:

1. Click the "+" button to add a key
2. Give it a meaningful name (e.g., the team member's name)
3. Optionally set a data transfer limit
4. Click the share button to get the access key URL

The access key URL looks like:

```text
ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@203.0.113.42:443/?outline=1
```

Send this URL to the team member. They paste it into the Outline Client app on their device.

## Setting Data Transfer Limits

Data limits prevent any single user from monopolizing bandwidth. In the Manager, click the menu next to a key and set a GB limit per month. This is enforced per-key, so different users can have different quotas.

Alternatively, set limits via the management API:

```bash
# Get the list of access keys
curl --insecure "https://203.0.113.42:12345/AbCdEfGhIjKlMnOp/access-keys"

# Set a 10 GB limit on key ID 1
curl --insecure -X PUT \
  "https://203.0.113.42:12345/AbCdEfGhIjKlMnOp/access-keys/1/data-limit" \
  -H "Content-Type: application/json" \
  -d '{"limit": {"bytes": 10737418240}}'
```

## Using a Custom Port

By default, all access keys share port 443 (to blend in with HTTPS traffic). You can change this during install:

```bash
# Set environment variable before running install script
export SB_API_PORT=8080
sudo bash -c "$(wget -qO- https://raw.githubusercontent.com/Jigsaw-Code/outline-server/master/src/server_manager/install_scripts/install_server.sh)"
```

## Hardening the Server

Beyond basic firewall rules, a few additional steps improve security:

```bash
# Disable root SSH login
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# Keep the system updated
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Restrict Docker container capabilities:

```bash
# Check the running Outline container
docker ps

# The install script already runs with --network=host
# Verify no extra capabilities are set
docker inspect outline-shadowbox | grep -A 10 CapAdd
```

## Monitoring the Server

Check server status and active connections:

```bash
# View server logs
docker logs outline-shadowbox

# Follow logs in real time
docker logs -f outline-shadowbox

# Check resource usage
docker stats outline-shadowbox
```

The management API exposes server metrics:

```bash
# Get per-key data transfer usage
curl --insecure "https://203.0.113.42:12345/AbCdEfGhIjKlMnOp/metrics/transfer"
```

This returns a JSON object with bytes transferred per access key ID. You can script this to send alerts when users are approaching their limit.

## Backing Up Configuration

The Outline configuration is stored in `/opt/outline`:

```bash
# Backup the persisted state directory
sudo tar czf outline-backup-$(date +%Y%m%d).tar.gz /opt/outline

# Store the backup securely
sudo mv outline-backup-*.tar.gz /backup/
```

To restore on a new server, extract this archive to `/opt/outline` before running the install script with `--skip-config-gen`.

## Revoking Access

Revoking a team member's access is immediate. In the Manager app, click the delete button on their key. The key becomes invalid instantly - the client will show "connection failed" on next attempt.

Via API:

```bash
# Delete access key with ID 3
curl --insecure -X DELETE \
  "https://203.0.113.42:12345/AbCdEfGhIjKlMnOp/access-keys/3"
```

## Troubleshooting

**Cannot connect to management API:**
```bash
# Check if the shadowbox container is running
docker ps | grep outline

# Check container logs for errors
docker logs outline-shadowbox --tail 50

# Verify the port is listening
sudo ss -tlnp | grep 12345
```

**Clients cannot connect:**
```bash
# Test UDP is accessible (Shadowsocks uses UDP)
nc -u -z -v your-server-ip 443

# Check firewall is not blocking UDP
sudo ufw status verbose
```

**Server rebooted and Outline is not running:**
```bash
# The container should auto-restart, verify restart policy
docker inspect outline-shadowbox | grep RestartPolicy

# Start manually if needed
docker start outline-shadowbox
```

Outline hits the right balance for team VPN access - there is no identity provider to configure, no certificates to renew, and distributing access is as simple as sharing a URL. For teams that need occasional secure tunnel access, it is significantly simpler to operate than a full WireGuard or OpenVPN setup.
