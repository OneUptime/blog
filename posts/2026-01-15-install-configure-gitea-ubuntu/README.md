# How to Install and Configure Gitea on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Gitea, Git, DevOps, Self-hosted, Tutorial

Description: Complete guide to installing Gitea self-hosted Git service on Ubuntu for private code repositories.

---

Gitea is a lightweight, self-hosted Git service written in Go. It provides GitHub-like functionality including repository management, issue tracking, pull requests, and CI/CD integration. This guide covers Gitea installation on Ubuntu.

## Features

- Git repository hosting
- Issue tracking
- Pull requests
- Code review
- CI/CD (Gitea Actions)
- Wiki
- Lightweight and fast

## Prerequisites

- Ubuntu 20.04 or later
- At least 1GB RAM
- Git installed
- Root or sudo access

## Installation

### Install Dependencies

```bash
# Update system
sudo apt update

# Install Git
sudo apt install git -y

# Verify Git
git --version
```

### Create Gitea User

```bash
# Create user
sudo adduser --system --shell /bin/bash --gecos 'Git Version Control' --group --disabled-password --home /home/git git
```

### Download Gitea

```bash
# Download latest Gitea
GITEA_VERSION=$(curl -s https://api.github.com/repos/go-gitea/gitea/releases/latest | grep tag_name | cut -d '"' -f 4 | sed 's/v//')

wget -O gitea https://dl.gitea.com/gitea/${GITEA_VERSION}/gitea-${GITEA_VERSION}-linux-amd64

# Make executable
chmod +x gitea

# Move to bin
sudo mv gitea /usr/local/bin/
```

### Create Directory Structure

```bash
# Create directories
sudo mkdir -p /var/lib/gitea/{custom,data,log}
sudo chown -R git:git /var/lib/gitea/
sudo chmod -R 750 /var/lib/gitea/

# Create config directory
sudo mkdir -p /etc/gitea
sudo chown root:git /etc/gitea
sudo chmod 770 /etc/gitea
```

## Database Setup

### Option 1: SQLite (Simple)

No additional setup needed. SQLite is suitable for small teams.

### Option 2: MySQL/MariaDB

```bash
# Install MariaDB
sudo apt install mariadb-server -y

# Secure installation
sudo mysql_secure_installation

# Create database
sudo mysql -u root -p
```

```sql
CREATE DATABASE gitea CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gitea'@'localhost' IDENTIFIED BY 'YourPassword';
GRANT ALL PRIVILEGES ON gitea.* TO 'gitea'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Option 3: PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create user and database
sudo -u postgres psql
```

```sql
CREATE USER gitea WITH PASSWORD 'YourPassword';
CREATE DATABASE gitea OWNER gitea;
\q
```

## Systemd Service

```bash
sudo nano /etc/systemd/system/gitea.service
```

```ini
[Unit]
Description=Gitea (Git with a cup of tea)
After=syslog.target
After=network.target
After=mariadb.service
# After=postgresql.service

[Service]
RestartSec=2s
Type=simple
User=git
Group=git
WorkingDirectory=/var/lib/gitea/
ExecStart=/usr/local/bin/gitea web --config /etc/gitea/app.ini
Restart=always
Environment=USER=git HOME=/home/git GITEA_WORK_DIR=/var/lib/gitea

[Install]
WantedBy=multi-user.target
```

```bash
# Start Gitea
sudo systemctl daemon-reload
sudo systemctl enable gitea
sudo systemctl start gitea
```

## Initial Configuration

Access the web installer at: `http://your_server_ip:3000`

### Configure via UI

1. Database Settings:
   - Database Type: SQLite3 / MySQL / PostgreSQL
   - Path (SQLite): /var/lib/gitea/data/gitea.db
   - Host (MySQL/PG): localhost:3306 / localhost:5432
   - Database Name: gitea
   - User: gitea
   - Password: YourPassword

2. General Settings:
   - Site Title: My Gitea
   - Repository Root Path: /var/lib/gitea/data/gitea-repositories
   - LFS Root Path: /var/lib/gitea/data/lfs

3. Server Settings:
   - SSH Server Domain: git.example.com
   - HTTP Port: 3000
   - Gitea Base URL: http://git.example.com:3000/

4. Admin Account:
   - Create administrator account

### Manual Configuration

```bash
sudo nano /etc/gitea/app.ini
```

```ini
[server]
DOMAIN           = git.example.com
HTTP_PORT        = 3000
ROOT_URL         = http://git.example.com:3000/
DISABLE_SSH      = false
SSH_DOMAIN       = git.example.com
SSH_PORT         = 22
LFS_START_SERVER = true
LFS_CONTENT_PATH = /var/lib/gitea/data/lfs
OFFLINE_MODE     = false

[database]
DB_TYPE  = mysql
HOST     = localhost:3306
NAME     = gitea
USER     = gitea
PASSWD   = YourPassword
SSL_MODE = disable

[repository]
ROOT = /var/lib/gitea/data/gitea-repositories

[security]
INSTALL_LOCK   = true
SECRET_KEY     = your-secret-key
INTERNAL_TOKEN = your-internal-token

[service]
DISABLE_REGISTRATION       = false
REQUIRE_SIGNIN_VIEW        = false
REGISTER_EMAIL_CONFIRM     = false
ENABLE_NOTIFY_MAIL         = false
ALLOW_ONLY_EXTERNAL_REGISTRATION = false
DEFAULT_ALLOW_CREATE_ORGANIZATION = true

[mailer]
ENABLED = false

[log]
MODE      = console
LEVEL     = info
ROOT_PATH = /var/lib/gitea/log
```

## Reverse Proxy Configuration

### Nginx

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/gitea
```

```nginx
server {
    listen 80;
    server_name git.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        client_max_body_size 100M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gitea /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Enable HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d git.example.com
```

Update app.ini:

```ini
[server]
ROOT_URL = https://git.example.com/
```

## SSH Configuration

### Use Built-in SSH

```ini
[server]
SSH_PORT        = 22
START_SSH_SERVER = true
BUILTIN_SSH_SERVER_USER = git
```

### Use System SSH

```bash
# Add git user to SSH
sudo nano /etc/ssh/sshd_config

# Ensure git user can use SSH
AllowUsers git
```

## Actions (CI/CD)

### Enable Gitea Actions

```ini
[actions]
ENABLED = true
DEFAULT_ACTIONS_URL = https://gitea.com
```

### Register Runner

```bash
# Download runner
wget https://dl.gitea.com/act_runner/0.2.6/act_runner-0.2.6-linux-amd64
chmod +x act_runner-0.2.6-linux-amd64
sudo mv act_runner-0.2.6-linux-amd64 /usr/local/bin/act_runner

# Register runner
act_runner register --instance https://git.example.com --token YOUR_TOKEN

# Run as daemon
act_runner daemon
```

### Sample Workflow

```yaml
# .gitea/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          echo "Running tests..."
          npm test
```

## User Management

### Create Organization

```bash
# Via Web UI: Settings → Organizations → New Organization
```

### Manage Users via CLI

```bash
# Create user
sudo -u git gitea admin user create --username admin --password password --email admin@example.com --admin

# List users
sudo -u git gitea admin user list

# Change password
sudo -u git gitea admin user change-password --username admin --password newpassword
```

## Webhooks

### Configure Webhook

1. Go to Repository → Settings → Webhooks
2. Add Webhook
3. Configure:
   - Target URL: http://your-ci-server/webhook
   - Events: Push, Pull Request
   - Active: Yes

## Email Configuration

```ini
[mailer]
ENABLED        = true
SMTP_ADDR      = smtp.example.com
SMTP_PORT      = 587
FROM           = gitea@example.com
USER           = gitea@example.com
PASSWD         = email-password
FORCE_TRUST_SERVER_CERT = false
```

## Backup and Restore

### Backup

```bash
# Stop Gitea
sudo systemctl stop gitea

# Backup data
sudo tar -czf gitea-backup-$(date +%Y%m%d).tar.gz \
    /var/lib/gitea/ \
    /etc/gitea/app.ini

# Or use built-in dump
sudo -u git gitea dump -c /etc/gitea/app.ini

# Start Gitea
sudo systemctl start gitea
```

### Restore

```bash
# Stop Gitea
sudo systemctl stop gitea

# Restore from backup
sudo tar -xzf gitea-backup-*.tar.gz -C /

# Or restore from dump
unzip gitea-dump-*.zip
# Restore database, repositories, etc.

# Start Gitea
sudo systemctl start gitea
```

## Migrate from GitHub/GitLab

### Via Web Interface

1. New Migration → GitHub/GitLab
2. Enter repository URL
3. Authenticate with token
4. Select options (issues, PRs, wiki)
5. Start migration

### Bulk Migration

```bash
# Use migration API
curl -X POST "http://localhost:3000/api/v1/repos/migrate" \
    -H "Authorization: token YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clone_addr": "https://github.com/user/repo.git",
        "repo_name": "repo",
        "service": "github"
    }'
```

## Monitoring

### Health Check

```bash
# Check service status
sudo systemctl status gitea

# Check logs
sudo journalctl -u gitea -f

# Health endpoint
curl http://localhost:3000/api/healthz
```

### Prometheus Metrics

```ini
[metrics]
ENABLED = true
```

Access metrics at: `/metrics`

## Troubleshooting

### Check Logs

```bash
# System logs
sudo journalctl -u gitea -f

# Application logs
sudo tail -f /var/lib/gitea/log/gitea.log
```

### Permission Issues

```bash
# Fix permissions
sudo chown -R git:git /var/lib/gitea/
sudo chown root:git /etc/gitea/
sudo chmod -R 750 /var/lib/gitea/
```

### Database Issues

```bash
# Check database connection
sudo -u git gitea doctor --config /etc/gitea/app.ini
```

---

Gitea provides a lightweight yet feature-rich Git hosting solution. It's perfect for teams wanting self-hosted version control with familiar GitHub-like features. For monitoring your Gitea instance, consider using OneUptime for uptime and performance tracking.
