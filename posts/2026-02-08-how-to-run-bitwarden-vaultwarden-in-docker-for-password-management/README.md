# How to Run Bitwarden (Vaultwarden) in Docker for Password Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, vaultwarden, bitwarden, password-manager, security, self-hosted

Description: Deploy Vaultwarden in Docker as a lightweight, self-hosted Bitwarden-compatible password manager for individuals and families.

---

Vaultwarden (formerly known as bitwarden_rs) is a lightweight, self-hosted implementation of the Bitwarden password manager API. It is compatible with all official Bitwarden client apps, browser extensions, and CLI tools, but runs on a fraction of the resources that the official Bitwarden server requires. If you want full control over your password vault without paying for Bitwarden's hosted service, Vaultwarden in Docker is the way to go.

## Why Vaultwarden Instead of Official Bitwarden?

The official Bitwarden server is designed for enterprise deployments. It requires multiple containers, a heavy Microsoft SQL Server database, and significant RAM. Vaultwarden, written in Rust, runs as a single container with an embedded SQLite database. It uses about 50 MB of RAM compared to the official server's 2+ GB. Despite being lightweight, it supports nearly all Bitwarden features including organizations, attachments, and two-factor authentication.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- A domain name (strongly recommended for SSL)
- At least 256 MB of free RAM
- HTTPS access (Bitwarden clients refuse to connect over plain HTTP)

HTTPS is not optional here. The Bitwarden browser extensions and mobile apps enforce encrypted connections. You need either a reverse proxy with a valid SSL certificate or a tunnel service.

## Project Setup

```bash
# Create the Vaultwarden project directory
mkdir -p ~/vaultwarden/data
cd ~/vaultwarden
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Vaultwarden Password Manager
version: "3.8"

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    ports:
      # Web vault UI and API
      - "8080:80"
      # WebSocket notifications (for real-time sync)
      - "3012:3012"
    environment:
      # Domain where Vaultwarden is accessible (must be HTTPS)
      DOMAIN: "https://vault.your-domain.com"
      # Enable WebSocket notifications for live sync
      WEBSOCKET_ENABLED: "true"
      # Disable new user signups after you create your account
      # SIGNUPS_ALLOWED: "false"
      # Enable the admin panel (set a strong token)
      ADMIN_TOKEN: "a_very_long_random_string_change_this"
      # Invitation organization name
      INVITATION_ORG_NAME: "My Vault"
      # SMTP settings for email notifications and invitations
      SMTP_HOST: "smtp.gmail.com"
      SMTP_FROM: "vault@your-domain.com"
      SMTP_PORT: 587
      SMTP_SECURITY: "starttls"
      SMTP_USERNAME: "your-email@gmail.com"
      SMTP_PASSWORD: "your-app-password"
      # Log level
      LOG_LEVEL: "warn"
    volumes:
      # Persist the database, attachments, and encryption keys
      - ./data:/data
```

## Starting Vaultwarden

```bash
# Start Vaultwarden in detached mode
docker compose up -d
```

Check the logs:

```bash
# Verify clean startup
docker compose logs -f vaultwarden
```

At this point, Vaultwarden is running on port 8080, but you cannot use it until you set up HTTPS.

## Setting Up HTTPS with Nginx

Install Nginx and Certbot on your host, then create a site configuration:

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Obtain an SSL certificate
sudo certbot --nginx -d vault.your-domain.com
```

Create the Nginx configuration for Vaultwarden:

```nginx
# /etc/nginx/sites-available/vaultwarden
server {
    listen 443 ssl http2;
    server_name vault.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/vault.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.your-domain.com/privkey.pem;

    # Allow large attachment uploads
    client_max_body_size 500M;

    # Main Vaultwarden proxy
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy for real-time notifications
    location /notifications/hub {
        proxy_pass http://127.0.0.1:3012;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket negotiation endpoint
    location /notifications/hub/negotiate {
        proxy_pass http://127.0.0.1:8080;
    }
}

server {
    listen 80;
    server_name vault.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable the site and reload Nginx:

```bash
# Enable the Vaultwarden site and reload Nginx
sudo ln -s /etc/nginx/sites-available/vaultwarden /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Creating Your Account

Open `https://vault.your-domain.com` in your browser. Click "Create Account" and fill in your email, master password, and password hint. Choose a strong master password - this is the only password you need to remember.

After creating your account, immediately disable new signups to prevent unauthorized users from creating accounts on your server:

Update the environment variable in docker-compose.yml:

```yaml
# Disable signups after creating your account
SIGNUPS_ALLOWED: "false"
```

Then restart the container:

```bash
# Apply the configuration change
docker compose up -d
```

## Installing Client Apps

Bitwarden has clients for every platform. Install them and point them to your self-hosted server:

1. Open any Bitwarden client (browser extension, desktop app, or mobile app)
2. Before logging in, click the gear/settings icon
3. Enter your server URL: `https://vault.your-domain.com`
4. Save and log in with your credentials

The browser extension is especially useful because it auto-fills login forms. Install it for Chrome, Firefox, Safari, or Edge.

## Admin Panel

The admin panel provides server management capabilities. Access it at `https://vault.your-domain.com/admin` and enter the `ADMIN_TOKEN` you set in the Compose file.

From the admin panel you can:

- View and manage all users
- Invite new users via email
- View organization details
- Check diagnostics and server health
- Delete accounts if needed

## Two-Factor Authentication

Vaultwarden supports multiple 2FA methods:

- **TOTP (Authenticator app)** - Works with any authenticator app like Google Authenticator or Authy
- **Email** - Sends a code to your email (requires SMTP configuration)
- **WebAuthn/FIDO2** - Hardware security keys like YubiKey

Enable 2FA in your account settings. TOTP is the easiest to set up and recommended for everyone.

## Organizations and Sharing

Create an organization to share passwords with family or team members:

1. Log into the web vault
2. Go to Organizations and create a new one
3. Invite members by email
4. Create collections to organize shared credentials
5. Assign items to collections that members can access

## Backup Strategy

Your vault data is the most critical data to protect. Back it up regularly:

```bash
# Create a backup of the Vaultwarden data directory
# This includes the SQLite database, attachments, and RSA keys
tar czf ~/vaultwarden-backup-$(date +%Y%m%d).tar.gz ~/vaultwarden/data/

# For extra safety, also export your vault from the web UI
# Go to Tools > Export Vault (use encrypted JSON format)
```

The SQLite database at `data/db.sqlite3` contains all encrypted vault data. The `data/rsa_key*` files are the server's encryption keys. Both are essential for restoring a backup.

## Automating Backups

Set up a cron job for regular backups:

```bash
# Add an automated daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * tar czf /home/user/backups/vaultwarden-\$(date +\%Y\%m\%d).tar.gz /home/user/vaultwarden/data/") | crontab -
```

## Updating Vaultwarden

```bash
# Pull the latest image and restart
docker compose pull
docker compose up -d
```

Vaultwarden handles database migrations automatically. Always back up before updating, just in case.

## Monitoring with OneUptime

Your password manager is critical infrastructure. If it goes down, you and your family cannot access credentials. Set up an HTTPS monitor in OneUptime pointing to `https://vault.your-domain.com` with a 30-second check interval. Configure alerts for immediate notification so you can restore service quickly.

## Wrapping Up

Vaultwarden gives you all the features of Bitwarden's premium service on your own hardware. It runs on minimal resources, supports all official Bitwarden clients, and keeps your passwords entirely under your control. With proper HTTPS, two-factor authentication, and regular backups, you have a secure, self-hosted password management solution that rivals any commercial offering.
