# How to Install Element Web with Matrix on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Matrix, Element, Self-Hosted, Messaging

Description: Learn how to install Synapse Matrix homeserver and Element Web client on Ubuntu for a fully self-hosted, decentralized team messaging system.

---

Matrix is an open standard for decentralized, federated communication. Synapse is the reference Matrix homeserver implementation, and Element Web is the most popular client for it. Together they give you a self-hosted messaging platform that can federate with other Matrix servers worldwide, meaning your users can communicate with anyone on the Matrix network.

This tutorial walks through setting up a production-ready Matrix homeserver with Element Web on Ubuntu, using Nginx as a reverse proxy and PostgreSQL as the database.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 2 GB RAM (4 GB recommended)
- A domain name - you'll need two subdomains: `matrix.example.com` (homeserver) and `element.example.com` (web client)
- Ports 80, 443, and 8448 available (8448 for Matrix federation)

## Installing Dependencies

```bash
sudo apt update && sudo apt install -y \
  python3 python3-pip python3-venv \
  build-essential libffi-dev python3-dev \
  libssl-dev libjpeg-dev libxslt1-dev \
  libpq-dev postgresql postgresql-client \
  nginx certbot python3-certbot-nginx \
  curl wget
```

## Setting Up PostgreSQL

Matrix performs significantly better with PostgreSQL than SQLite:

```bash
# Switch to postgres user
sudo -u postgres psql << 'EOF'
-- Create the database and user for Synapse
CREATE USER synapse WITH PASSWORD 'StrongDatabasePassword123!';
CREATE DATABASE synapse
  ENCODING 'UTF8'
  LC_COLLATE='C'
  LC_CTYPE='C'
  template=template0
  OWNER synapse;
GRANT ALL PRIVILEGES ON DATABASE synapse TO synapse;
EOF
```

## Installing Synapse

Install Synapse using the official method:

```bash
# Add Matrix.org repository
sudo wget -O /usr/share/keyrings/matrix-org-archive-keyring.gpg \
  https://packages.matrix.org/debian/matrix-org-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/matrix-org-archive-keyring.gpg] \
  https://packages.matrix.org/debian/ $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/matrix-org.list

sudo apt update
sudo apt install -y matrix-synapse-py3
```

During installation, you'll be prompted for your server name. Enter your domain (e.g., `example.com` - not the subdomain).

## Configuring Synapse

The configuration file is at `/etc/matrix-synapse/homeserver.yaml`. Edit it:

```bash
sudo nano /etc/matrix-synapse/homeserver.yaml
```

Key settings to configure:

```yaml
# /etc/matrix-synapse/homeserver.yaml

# Your server's public name (this is permanent - choose carefully)
server_name: "example.com"

# Listen on localhost only - Nginx will handle external connections
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    bind_addresses: ['127.0.0.1']
    resources:
      - names: [client, federation]
        compress: false

# PostgreSQL database configuration
database:
  name: psycopg2
  args:
    user: synapse
    password: StrongDatabasePassword123!
    database: synapse
    host: localhost
    cp_min: 5
    cp_max: 10

# Enable user registration (disable after initial setup if needed)
enable_registration: true
enable_registration_without_verification: false

# Email configuration for verification
email:
  smtp_host: smtp.example.com
  smtp_port: 587
  smtp_user: noreply@example.com
  smtp_pass: your_smtp_password
  require_transport_security: true
  notif_from: "Matrix Server <noreply@example.com>"

# Media store location
media_store_path: /var/lib/matrix-synapse/media

# Log configuration
log_config: /etc/matrix-synapse/log.yaml

# Max upload size
max_upload_size: 50M

# Enable presence (who's online indicators)
use_presence: true

# Federation - allow other Matrix servers to contact yours
federation_domain_whitelist: null  # null means allow all
```

Generate a signing key:

```bash
# The install creates this automatically, but verify it exists
ls -la /etc/matrix-synapse/homeserver.signing.key
```

Start and enable Synapse:

```bash
sudo systemctl enable matrix-synapse
sudo systemctl start matrix-synapse
sudo systemctl status matrix-synapse
```

## Configuring Nginx for Synapse

Create the Nginx configuration:

```nginx
# /etc/nginx/sites-available/matrix.example.com
server {
    listen 80;
    listen [::]:80;
    server_name matrix.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name matrix.example.com;

    ssl_certificate /etc/letsencrypt/live/matrix.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matrix.example.com/privkey.pem;

    # Allow large uploads
    client_max_body_size 50M;

    location ~* ^(\/_matrix|\/_synapse\/client) {
        proxy_pass http://127.0.0.1:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
    }
}

# Federation port (Matrix servers contact each other on 8448)
server {
    listen 8448 ssl http2 default_server;
    listen [::]:8448 ssl http2 default_server;
    server_name matrix.example.com;

    ssl_certificate /etc/letsencrypt/live/matrix.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matrix.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## Setting Up the .well-known Delegation

To allow users to have addresses like `@user@example.com` instead of `@user@matrix.example.com`, set up well-known delegation on your main domain:

```nginx
# Add this to your example.com Nginx configuration
location /.well-known/matrix/client {
    return 200 '{"m.homeserver":{"base_url":"https://matrix.example.com"}}';
    add_header Content-Type application/json;
    add_header Access-Control-Allow-Origin *;
}

location /.well-known/matrix/server {
    return 200 '{"m.server":"matrix.example.com:443"}';
    add_header Content-Type application/json;
}
```

## Installing Element Web

Element Web is a static JavaScript application. Download and serve it with Nginx:

```bash
# Download the latest Element Web release
cd /tmp
ELEMENT_VERSION=$(curl -s https://api.github.com/repos/element-hq/element-web/releases/latest | \
  grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')
wget "https://github.com/element-hq/element-web/releases/download/v${ELEMENT_VERSION}/element-v${ELEMENT_VERSION}.tar.gz"

# Extract to web root
sudo mkdir -p /var/www/element
sudo tar xzf "element-v${ELEMENT_VERSION}.tar.gz" -C /var/www/element --strip-components=1
```

Configure Element to point to your homeserver:

```bash
sudo cp /var/www/element/config.sample.json /var/www/element/config.json
sudo nano /var/www/element/config.json
```

```json
{
    "default_server_config": {
        "m.homeserver": {
            "base_url": "https://matrix.example.com",
            "server_name": "example.com"
        },
        "m.identity_server": {
            "base_url": "https://vector.im"
        }
    },
    "brand": "Element",
    "integrations_ui_url": "https://scalar.vector.im/",
    "integrations_rest_url": "https://scalar.vector.im/api",
    "default_theme": "light",
    "room_directory": {
        "servers": [
            "matrix.org"
        ]
    },
    "enable_presence_by_hs_url": {
        "https://matrix.org": false,
        "https://matrix-client.matrix.org": false
    },
    "setting_defaults": {
        "breadcrumbs": true
    }
}
```

Create the Nginx config for Element:

```nginx
# /etc/nginx/sites-available/element.example.com
server {
    listen 80;
    server_name element.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name element.example.com;

    ssl_certificate /etc/letsencrypt/live/element.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/element.example.com/privkey.pem;

    root /var/www/element;
    index index.html;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Content-Security-Policy "frame-ancestors 'self'";

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable sites and get certificates:

```bash
sudo ln -s /etc/nginx/sites-available/matrix.example.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/element.example.com /etc/nginx/sites-enabled/

# Get SSL certificates
sudo certbot --nginx -d matrix.example.com -d element.example.com

sudo nginx -t && sudo systemctl reload nginx
```

## Creating Your First Admin User

```bash
# Register an admin user via the command line
sudo register_new_matrix_user \
  -c /etc/matrix-synapse/homeserver.yaml \
  --admin \
  http://localhost:8008
```

You can now open `https://element.example.com` and log in with the admin account.

## Verifying Federation

Check if your server can federate with the Matrix network:

```bash
# Test federation using the Matrix federation tester
curl https://federationtester.matrix.org/api/report?server_name=example.com
```

Monitoring your Matrix homeserver with [OneUptime](https://oneuptime.com) ensures you're alerted if your chat infrastructure becomes unavailable, keeping your team's communication running smoothly.
