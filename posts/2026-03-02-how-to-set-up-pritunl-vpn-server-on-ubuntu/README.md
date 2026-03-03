# How to Set Up Pritunl VPN Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Networking, Security, OpenVPN

Description: Learn how to install and configure Pritunl VPN server on Ubuntu, a web-based OpenVPN management solution with user management, multi-factor authentication, and easy client deployment.

---

Pritunl is a web-based interface for managing OpenVPN servers. It handles the complexity of certificate management, user provisioning, and server configuration through a clean web UI, while OpenVPN does the actual tunneling. This is a solid choice when you need VPN access for a team and don't want to manage raw OpenVPN configuration files for each user.

Pritunl supports multiple servers, organizations, users, and MFA - all manageable through the browser. The client profiles can be downloaded directly and work with the standard OpenVPN client or Pritunl's own client app.

## Prerequisites

- Ubuntu 20.04 or 22.04 server with a public IP
- At least 1 vCPU and 1 GB RAM (2 GB recommended for teams)
- Root access
- Port 443 or another available UDP port for VPN traffic
- Port 443 or 80 for the web management interface (can use separate ports)

## Installing Dependencies

Pritunl requires MongoDB:

```bash
# Add MongoDB repository
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl enable --now mongod

# Verify MongoDB is running
systemctl status mongod
```

## Installing Pritunl

```bash
# Add Pritunl repository
sudo tee /etc/apt/sources.list.d/pritunl.list << 'EOF'
deb https://repo.pritunl.com/stable/apt $(lsb_release -cs) main
EOF

# Import the Pritunl signing key
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv 7568D9BB55FF9E5287D586017AE645C0CF8E292A

# Alternative if keyserver is unreachable:
# curl -fsSL https://raw.githubusercontent.com/pritunl/pgp/master/pritunl_repo_pub.asc | sudo apt-key add -

sudo apt update
sudo apt install -y pritunl

# Enable and start Pritunl
sudo systemctl enable --now pritunl

# Check status
systemctl status pritunl
```

## Initial Web Setup

Get the setup key and default admin password:

```bash
# Get the setup key for initial configuration
sudo pritunl setup-key

# Get the default MongoDB URI (usually just the default localhost URI)
# The setup key is what you need for the first login
```

Now access the web interface at `https://YOUR_SERVER_IP/` (accept the self-signed certificate warning for now).

The setup wizard asks for:
1. The setup key (from the command above)
2. MongoDB URI (default `mongodb://localhost:27017/pritunl` should work)

After initial setup, log in with:
- Username: `pritunl`
- Password: from `sudo pritunl default-password`

**Change the default password immediately** after first login.

## Creating the VPN Infrastructure

Pritunl organizes the VPN into three levels: Organizations, Users, and Servers.

### Create an Organization

In the web UI, go to Users tab, click "Add Organization". Name it after your team or company. Organizations group users together and can be attached to VPN servers.

### Create Users

Within an organization, add users:

1. Click "Add User"
2. Enter a name and email
3. Optionally add a PIN for additional authentication
4. Click "Add"

Each user gets a profile that they download and import into the OpenVPN client.

### Create and Configure a Server

Go to Servers tab, click "Add Server":

- **Name**: Give it a descriptive name (e.g., "Production VPN")
- **Port**: Choose a UDP port (1194 is the OpenVPN default; 443 works through most firewalls)
- **Protocol**: UDP is preferred for performance; TCP if UDP is blocked
- **Network**: The VPN subnet (e.g., `10.30.0.0/24`) - clients will get IPs from this range
- **DNS Server**: Point to your internal DNS or use `8.8.8.8`

After creating the server, attach your organization to it by clicking "Attach Organization" in the server's settings.

Start the server by clicking the start button. The first startup takes a moment as Pritunl generates certificates.

## Configuring the Server via CLI

Pritunl also exposes configuration through the command line:

```bash
# Set the public server address (important if behind a NAT/EIP)
sudo pritunl set-server-ip 203.0.113.5

# View current settings
sudo pritunl settings

# Configure settings (key=value format)
sudo pritunl set app.server_ssl true
sudo pritunl set app.server_port 443
```

## Firewall Configuration

```bash
# Allow the VPN port (use the port you configured in the server settings)
sudo ufw allow 1194/udp

# Allow the web management interface
sudo ufw allow 443/tcp

# If you're using a different port for the web UI
sudo ufw allow 9700/tcp

# Enable IP forwarding - Pritunl typically handles this, but verify
cat /proc/sys/net/ipv4/ip_forward
# Should be 1; if not:
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Setting Up SSL for the Web Interface

The initial setup uses a self-signed certificate. For production, use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Stop Pritunl temporarily (it uses port 443)
sudo systemctl stop pritunl

# Get a certificate
sudo certbot certonly --standalone -d vpn.example.com

# Configure Pritunl to use the certificate
sudo pritunl set app.server_ssl true
sudo pritunl set app.server_cert "$(sudo cat /etc/letsencrypt/live/vpn.example.com/fullchain.pem)"
sudo pritunl set app.server_key "$(sudo cat /etc/letsencrypt/live/vpn.example.com/privkey.pem)"

# Restart Pritunl
sudo systemctl start pritunl
```

Alternatively, put Nginx in front of Pritunl and have Nginx handle TLS:

```bash
# Pritunl serves on a non-standard port
sudo pritunl set app.server_port 9700
sudo pritunl set app.server_ssl false
sudo systemctl restart pritunl
```

Then configure Nginx to proxy to port 9700 with Certbot-managed certificates.

## Enabling Multi-Factor Authentication

Pritunl supports TOTP-based MFA through Google Authenticator or similar apps:

1. In the web UI, go to Settings
2. Under Security, enable "Authenticator Two-Factor Authentication"
3. Save settings

When users download their profile, they'll also receive a QR code to scan with their authenticator app. The TOTP code is then required when connecting.

For Google Workspace or other SSO, Pritunl supports SAML authentication in the enterprise version.

## Distributing Client Profiles

Users download their connection profile from the web UI:

1. Log in to the Pritunl web interface with a user-specific link
2. Download the `.tar` or `.ovpn` profile
3. Import it into the OpenVPN client

Provide users with the URL to access the user interface (different from the admin interface):

```text
https://vpn.example.com/
```

With their username and PIN/password to log in and download their own profile.

Using the Pritunl client app (available for macOS, Windows, and Linux):

```bash
# On Ubuntu client, install the Pritunl client
sudo tee /etc/apt/sources.list.d/pritunl.list << 'EOF'
deb https://repo.pritunl.com/stable/apt $(lsb_release -cs) main
EOF

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv 7568D9BB55FF9E5287D586017AE645C0CF8E292A
sudo apt update
sudo apt install pritunl-client-electron
```

## Monitoring and Maintenance

```bash
# Check Pritunl logs
sudo journalctl -u pritunl -f

# Check MongoDB logs
sudo journalctl -u mongod -f

# View connected users from CLI
sudo pritunl users

# Backup MongoDB (for disaster recovery)
sudo mongodump --db pritunl --out /var/backups/pritunl-$(date +%Y%m%d)

# Update Pritunl
sudo apt update && sudo apt upgrade pritunl

# Check version
sudo pritunl version
```

## Troubleshooting Common Issues

```bash
# If the web UI is unreachable after changes
sudo systemctl restart pritunl

# If VPN clients can't connect
# Check that the server is started in the web UI
# Check firewall allows the VPN port
sudo ufw status

# Check Pritunl server logs for connection errors
sudo journalctl -u pritunl -n 100

# Verify OpenVPN is running for your server
ps aux | grep openvpn

# Reset admin password if locked out
sudo pritunl reset-password
```

Pritunl strikes a reasonable balance between ease of use and flexibility. The web UI handles the operational complexity of OpenVPN - certificate generation, user management, profile distribution - while keeping you on a proven and well-understood VPN protocol underneath.
