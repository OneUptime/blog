# How to Install Gitea (Self-Hosted GitHub Alternative) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Gitea, Self-Hosted, Git, DevOps

Description: Install and configure Gitea on Ubuntu with PostgreSQL, set up Nginx as a reverse proxy with HTTPS, configure SSH access, and explore key features like webhooks and repository mirroring.

---

Gitea is a lightweight self-hosted Git service written in Go. It runs well on a server with 1-2GB RAM, includes a GitHub-style web UI with pull requests, issue tracking, and a CI integration API, and ships as a single binary or Docker image. It's the go-to choice for teams that want GitHub-like functionality without the resource requirements of GitLab.

## Choosing a Database

Gitea supports SQLite, MySQL/MariaDB, and PostgreSQL. SQLite works fine for small instances (a few developers, dozens of repositories), but PostgreSQL is worth the small setup effort if you expect to grow.

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl enable --now postgresql

# Create database and user for Gitea
sudo -u postgres psql << 'EOF'
CREATE USER gitea WITH PASSWORD 'strong-password-here';
CREATE DATABASE gitea OWNER gitea;
GRANT ALL PRIVILEGES ON DATABASE gitea TO gitea;
\q
EOF
```

## Installing Gitea

Gitea releases single binaries for each platform. Check https://github.com/go-gitea/gitea/releases for the latest version.

```bash
# Create gitea user (no login shell for security)
sudo useradd -r -m -s /bin/bash -d /home/git git

# Create directories
sudo mkdir -p /var/lib/gitea/{custom,data,indexers,public,log}
sudo mkdir -p /etc/gitea

# Download Gitea binary (adjust version as needed)
GITEA_VERSION="1.23.1"
wget "https://github.com/go-gitea/gitea/releases/download/v${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64" \
  -O /tmp/gitea

# Install the binary
sudo install -m 755 /tmp/gitea /usr/local/bin/gitea

# Set ownership
sudo chown -R git:git /var/lib/gitea
sudo chown -R root:git /etc/gitea
sudo chmod 770 /etc/gitea

# Verify the binary works
gitea --version
```

## Creating the systemd Service

```bash
sudo nano /etc/systemd/system/gitea.service
```

```ini
[Unit]
Description=Gitea (Git with a cup of tea)
After=syslog.target
After=network.target
After=postgresql.service

[Service]
RestartSec=2s
Type=simple
User=git
Group=git
WorkingDirectory=/var/lib/gitea/

# Main Gitea configuration file location
Environment=GITEA_WORK_DIR=/var/lib/gitea
Environment=GITEA_CUSTOM=/var/lib/gitea/custom
Environment=USER=git
Environment=HOME=/home/git
Environment=GITEA_CONF=/etc/gitea/app.ini

ExecStart=/usr/local/bin/gitea web --config /etc/gitea/app.ini
Restart=always
PrivateTmp=true

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable gitea
```

## Initial Configuration

Create the Gitea configuration file. You can do this manually or through the web installer (accessible after starting Gitea).

### Using the Web Installer

```bash
# Start Gitea to access the web installer
sudo systemctl start gitea

# Check it started
sudo systemctl status gitea

# The installer is at: http://your-server:3000
# Configure database connection, admin account, etc.
```

After the web installer runs, it writes `/etc/gitea/app.ini`. Secure the file:

```bash
# Lock down the configuration after initial setup
sudo chmod 640 /etc/gitea/app.ini
```

### Manual Configuration

If you prefer manual setup:

```bash
sudo -u git nano /etc/gitea/app.ini
```

```ini
; Gitea configuration - app.ini
APP_NAME = My Gitea Instance
RUN_USER = git
RUN_MODE = prod
WORK_PATH = /var/lib/gitea

[server]
DOMAIN        = gitea.example.com
HTTP_PORT     = 3000
ROOT_URL      = https://gitea.example.com/
DISABLE_SSH   = false
SSH_PORT      = 22
SSH_DOMAIN    = gitea.example.com
LFS_START_SERVER = true
OFFLINE_MODE  = false

[database]
DB_TYPE  = postgres
HOST     = 127.0.0.1:5432
NAME     = gitea
USER     = gitea
PASSWD   = strong-password-here
SSL_MODE = disable

[indexer]
ISSUE_INDEXER_TYPE = bleve
REPO_INDEXER_ENABLED = true

[session]
PROVIDER = file

[log]
MODE      = file
LEVEL     = info
ROOT_PATH = /var/lib/gitea/log

[repository]
ROOT = /home/git/repositories

[picture]
DISABLE_GRAVATAR = false

[attachment]
ENABLED = true
PATH    = /var/lib/gitea/data/attachments

[mailer]
; Configure if you want email notifications
ENABLED = false
; SMTP_ADDR = smtp.example.com
; SMTP_PORT = 587
; FROM      = gitea@example.com
; USER      = gitea@example.com
; PASSWD    = email-password

[service]
REGISTER_EMAIL_CONFIRM  = false
DISABLE_REGISTRATION    = false
ALLOW_ONLY_EXTERNAL_REGISTRATION = false
ENABLE_CAPTCHA          = false
DEFAULT_KEEP_EMAIL_PRIVATE = true

[security]
INSTALL_LOCK           = true
SECRET_KEY             = generate-a-random-string-here
INTERNAL_TOKEN         = generate-another-random-string
```

Generate secret values:

```bash
# Generate SECRET_KEY
gitea generate secret SECRET_KEY

# Generate INTERNAL_TOKEN
gitea generate secret INTERNAL_TOKEN
```

```bash
sudo systemctl start gitea
sudo systemctl status gitea
```

## Setting Up Nginx with HTTPS

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/gitea
```

```nginx
# Gitea reverse proxy configuration
server {
    listen 80;
    server_name gitea.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gitea.example.com;

    ssl_certificate     /etc/letsencrypt/live/gitea.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gitea.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Allow large file uploads (Git LFS objects)
    client_max_body_size 512m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Long timeouts for large pushes
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gitea /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gitea.example.com
```

## Configuring SSH Access

Gitea uses SSH for git operations. By default it shares the system SSH port (22). The `git` user's shell is `bash`, and Gitea handles authentication via its own authorized keys mechanism.

```bash
# Gitea uses its own authorized_keys management
# When users add SSH keys in the Gitea UI, Gitea writes them to:
cat /home/git/.ssh/authorized_keys

# If you see entries like:
# no-port-forwarding,...,command="/usr/local/bin/gitea serv key-1 --config=/etc/gitea/app.ini"
# That's Gitea managing SSH access - this is correct

# Test SSH access (from developer workstation after adding key in Gitea UI)
# ssh -T git@gitea.example.com
# Expected: Hi username! You've successfully authenticated, but Gitea does not provide shell access.
```

## Enabling Git LFS

For repositories with large files (media, binaries), enable Git LFS:

```bash
# In app.ini, LFS_START_SERVER is already set to true
# Create the LFS storage directory
sudo mkdir -p /var/lib/gitea/data/lfs
sudo chown git:git /var/lib/gitea/data/lfs

# In app.ini add:
[lfs]
PATH = /var/lib/gitea/data/lfs
```

Developers enable LFS in their repositories:

```bash
# On developer workstation
git lfs install
git lfs track "*.psd"
git lfs track "*.zip"
git add .gitattributes
git commit -m "Track large files with LFS"
```

## Configuring Webhooks for CI/CD

Gitea webhooks fire on push, pull request, release, and other events. Connect to Woodpecker, Jenkins, or any HTTP endpoint:

1. Go to a repository > **Settings > Webhooks > Add Webhook**
2. Choose webhook type (Gitea, Slack, etc.)
3. Set the target URL (e.g., your CI server's webhook endpoint)
4. Select which events trigger the webhook
5. Save and test delivery

## Repository Mirroring

Gitea can mirror repositories from GitHub, GitLab, or other Git hosts - useful for keeping local copies of dependencies or backing up external repositories.

In Gitea UI: **+** > **New Migration** > choose the source (GitHub, GitLab, Gitea, etc.)

Or configure via API:

```bash
# Create a mirror via Gitea API
curl -X POST https://gitea.example.com/api/v1/repos/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: token your-api-token" \
  -d '{
    "clone_addr": "https://github.com/upstream/project.git",
    "uid": 1,
    "repo_name": "project-mirror",
    "mirror": true,
    "mirror_interval": "24h",
    "private": true
  }'
```

## Backup and Restore

```bash
# Backup Gitea (stop first for consistency, or use built-in backup)
sudo systemctl stop gitea

# Gitea provides a built-in backup command
sudo -u git gitea dump -c /etc/gitea/app.ini --work-path /var/lib/gitea

# This creates gitea-dump-TIMESTAMP.zip containing:
# - app.ini
# - All repository data
# - Database dump
# - Attachments and LFS objects

sudo systemctl start gitea

# Restore from backup
sudo -u git gitea restore-backup --work-path /var/lib/gitea \
  --config /etc/gitea/app.ini \
  gitea-dump-TIMESTAMP.zip
```

## Administration Tasks

```bash
# Access Gitea admin panel
# Web UI: https://gitea.example.com/-/admin

# Run admin commands via CLI
sudo -u git gitea admin user create \
  --username newuser \
  --email newuser@example.com \
  --password temporarypassword \
  --must-change-password \
  --config /etc/gitea/app.ini

# List all users
sudo -u git gitea admin user list --config /etc/gitea/app.ini

# Check Gitea logs
sudo journalctl -u gitea -f
sudo tail -f /var/lib/gitea/log/gitea.log
```

## Summary

Gitea on Ubuntu gives you a fully functional GitHub-like hosting service with low overhead. The single binary, PostgreSQL backend, and Nginx reverse proxy combination is stable in production and easy to maintain. With SSH and HTTPS both working, developers get the same workflow they're used to from GitHub, but hosted entirely within your own infrastructure. Add Woodpecker or Drone CI alongside Gitea and you have a complete self-hosted development platform.
