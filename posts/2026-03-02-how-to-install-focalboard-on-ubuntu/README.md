# How to Install Focalboard on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Project Management, Kanban, Linux, DevOps

Description: Learn how to install and configure Focalboard on Ubuntu, an open-source project management tool from Mattermost that supports Kanban, boards, calendars, and gallery views.

---

Focalboard is an open-source project management tool that Mattermost built and released as a standalone application. It lets you organize work using different views - board (Kanban), table, calendar, and gallery - all operating on the same underlying data. Cards have customizable properties, and you can switch between views based on what you're currently focused on.

The standalone version stores data in a local SQLite database by default, which makes it very easy to get running. For team use, it supports PostgreSQL and can be deployed as a server that multiple users access through the browser.

## Installation Options

Focalboard offers three deployment modes:
1. **Desktop app** - local application, stores data locally
2. **Personal server** - single-user server mode
3. **Server mode** - multi-user with PostgreSQL, Teams support

This guide covers the server mode for team use on Ubuntu.

## Downloading Focalboard

```bash
# Download the latest Focalboard server package
# Check https://github.com/mattermost/focalboard/releases for latest version
cd /tmp
curl -LO https://github.com/mattermost/focalboard/releases/download/v7.11.4/focalboard-server-linux-amd64.tar.gz

# Extract the archive
tar xzf focalboard-server-linux-amd64.tar.gz

# Move to a permanent location
sudo mv focalboard /opt/focalboard

# Set permissions
sudo chown -R root:root /opt/focalboard
sudo chmod -R 755 /opt/focalboard
```

## Configuring Focalboard

Focalboard uses a JSON configuration file:

```bash
sudo tee /opt/focalboard/config.json << 'EOF'
{
    "serverRoot": "https://focalboard.example.com",
    "port": 8000,
    "dbtype": "postgres",
    "dbconfig": "postgres://focalboard:your-db-password@localhost/focalboard?sslmode=disable",
    "postgres_dbconfig": "postgres://focalboard:your-db-password@localhost/focalboard?sslmode=disable",
    "useSSL": false,
    "webpath": "/opt/focalboard/webapp",
    "filespath": "/opt/focalboard/files",
    "telemetry": false,
    "session_expire_time": 2592000,
    "session_refresh_time": 18000,
    "localOnly": false,
    "enableLocalMode": true,
    "localModeSocketLocation": "/var/tmp/focalboard_local.socket"
}
EOF
```

For SQLite (simpler, single-server setup):

```bash
sudo tee /opt/focalboard/config.json << 'EOF'
{
    "serverRoot": "https://focalboard.example.com",
    "port": 8000,
    "dbtype": "sqlite3",
    "dbconfig": "/opt/focalboard/focalboard.db",
    "useSSL": false,
    "webpath": "/opt/focalboard/webapp",
    "filespath": "/opt/focalboard/files",
    "telemetry": false,
    "session_expire_time": 2592000,
    "session_refresh_time": 18000,
    "localOnly": false,
    "enableLocalMode": true,
    "localModeSocketLocation": "/var/tmp/focalboard_local.socket"
}
EOF
```

## Setting Up PostgreSQL (for Team Mode)

```bash
# Install PostgreSQL
sudo apt install postgresql

# Create database and user
sudo -u postgres psql << 'SQL'
CREATE USER focalboard WITH PASSWORD 'your-db-password';
CREATE DATABASE focalboard OWNER focalboard;
GRANT ALL PRIVILEGES ON DATABASE focalboard TO focalboard;
\q
SQL

# Test the connection
PGPASSWORD=your-db-password psql -h localhost -U focalboard -d focalboard -c "\conninfo"
```

## Creating a System User and Service

Run Focalboard as a dedicated non-root user:

```bash
# Create a system user for Focalboard
sudo useradd -r -s /usr/sbin/nologin focalboard

# Create the files directory and set ownership
sudo mkdir -p /opt/focalboard/files
sudo chown -R focalboard:focalboard /opt/focalboard/files

# Create a systemd service
sudo tee /etc/systemd/system/focalboard.service << 'EOF'
[Unit]
Description=Focalboard Project Management
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=focalboard
Group=focalboard
WorkingDirectory=/opt/focalboard
ExecStart=/opt/focalboard/bin/focalboard-server
Restart=on-failure
RestartSec=10

# Optional: set resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now focalboard

# Check status
systemctl status focalboard
journalctl -u focalboard -f
```

## Setting Up nginx as a Reverse Proxy

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/focalboard << 'EOF'
server {
    listen 80;
    server_name focalboard.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name focalboard.example.com;

    ssl_certificate /etc/letsencrypt/live/focalboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/focalboard.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }

    access_log /var/log/nginx/focalboard.access.log;
    error_log /var/log/nginx/focalboard.error.log;
}
EOF

sudo ln -s /etc/nginx/sites-available/focalboard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d focalboard.example.com
```

## Creating the First User

Focalboard has a command-line tool for user management:

```bash
# Create the first admin user
sudo -u focalboard /opt/focalboard/bin/focalboard-server --useradmin

# Or use the local socket mode
export FOCALBOARD_LOCALMODE_SOCKET=/var/tmp/focalboard_local.socket
sudo -u focalboard /opt/focalboard/bin/focalboard-admin --url http://localhost useradmin create \
    --username admin \
    --password 'your-admin-password' \
    --email admin@example.com
```

Alternatively, navigate to `https://focalboard.example.com` and register through the web interface. With multi-user server mode, the first registered user becomes the admin.

## Using the Focalboard CLI

The `focalboard-admin` CLI tool provides user and server management:

```bash
# List all users
sudo -u focalboard /opt/focalboard/bin/focalboard-admin \
    --url http://localhost \
    useradmin list

# Create a user
sudo -u focalboard /opt/focalboard/bin/focalboard-admin \
    --url http://localhost \
    useradmin create \
    --username newuser \
    --password 'password' \
    --email user@example.com

# Reset a user's password
sudo -u focalboard /opt/focalboard/bin/focalboard-admin \
    --url http://localhost \
    useradmin reset-password \
    --username someuser \
    --password 'newpassword'
```

## Backing Up Focalboard Data

For SQLite:

```bash
# Stop the service before backing up SQLite
sudo systemctl stop focalboard

# Backup the database file
sudo cp /opt/focalboard/focalboard.db \
    /var/backups/focalboard-$(date +%Y%m%d).db

sudo systemctl start focalboard

# Backup uploaded files
sudo tar czf /var/backups/focalboard-files-$(date +%Y%m%d).tar.gz \
    /opt/focalboard/files
```

For PostgreSQL:

```bash
# Backup without stopping the service
sudo -u postgres pg_dump focalboard | \
    gzip > /var/backups/focalboard-db-$(date +%Y%m%d).sql.gz

# Backup uploaded files
sudo tar czf /var/backups/focalboard-files-$(date +%Y%m%d).tar.gz \
    /opt/focalboard/files
```

## Updating Focalboard

```bash
# Stop the service
sudo systemctl stop focalboard

# Backup current installation
sudo tar czf /var/backups/focalboard-install-$(date +%Y%m%d).tar.gz /opt/focalboard

# Download new version
cd /tmp
curl -LO https://github.com/mattermost/focalboard/releases/download/vX.Y.Z/focalboard-server-linux-amd64.tar.gz

# Extract and replace binaries (keep config and data)
tar xzf focalboard-server-linux-amd64.tar.gz
sudo rsync -av --exclude='config.json' --exclude='files/' --exclude='focalboard.db' \
    focalboard/ /opt/focalboard/

# Fix permissions
sudo chown -R focalboard:focalboard /opt/focalboard/files

# Start the service
sudo systemctl start focalboard
systemctl status focalboard
```

## Troubleshooting

```bash
# Service fails to start
journalctl -u focalboard -n 50

# Database connection issues (PostgreSQL)
sudo -u focalboard /opt/focalboard/bin/focalboard-server --diagnose

# Check if port is available
ss -tlnp | grep 8000

# Verify configuration
sudo -u focalboard cat /opt/focalboard/config.json

# Restart and check
sudo systemctl restart focalboard
journalctl -u focalboard -f
```

Focalboard is lightweight and reasonably straightforward to operate. The multiple view types (board, table, calendar, gallery) on a single dataset are genuinely useful for project work where you need to look at the same tasks from different angles. For teams that want self-hosted project boards without the complexity of a full platform, it hits a good balance point.
