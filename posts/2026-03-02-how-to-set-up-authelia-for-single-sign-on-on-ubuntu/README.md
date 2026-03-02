# How to Set Up Authelia for Single Sign-On on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Authelia, Single Sign-On, Authentication, Security

Description: Learn how to install and configure Authelia on Ubuntu to provide single sign-on and two-factor authentication for your self-hosted services.

---

Authelia is an open-source authentication and authorization server that provides two-factor authentication and single sign-on (SSO) for your applications through a web portal. It works as a companion to reverse proxies like Nginx or Traefik, sitting between them and your backend services. When a user tries to access a protected resource, the reverse proxy checks with Authelia first, which handles authentication and enforces your access policies.

This setup is particularly valuable when you're running multiple self-hosted services and want centralized authentication rather than managing credentials for each application separately.

## Prerequisites

Before starting, you need:
- Ubuntu 22.04 or 24.04 server
- A reverse proxy (Nginx or Traefik) already installed
- A domain name with DNS pointing to your server
- Docker and Docker Compose installed (we'll use Docker for Authelia)

## Installing Docker

If you don't have Docker installed yet:

```bash
# Install prerequisites
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

## Setting Up the Directory Structure

Create a working directory for Authelia:

```bash
mkdir -p /opt/authelia/{config,secrets}
cd /opt/authelia
```

## Generating Secrets

Authelia requires several secrets. Generate them now and store them securely:

```bash
# Generate a JWT secret
openssl rand -hex 64 > /opt/authelia/secrets/jwt_secret

# Generate a session secret
openssl rand -hex 64 > /opt/authelia/secrets/session_secret

# Generate a storage encryption key
openssl rand -hex 64 > /opt/authelia/secrets/storage_encryption_key

# Set restrictive permissions
chmod 600 /opt/authelia/secrets/*
```

## Creating the Authelia Configuration

Create the main configuration file:

```bash
cat > /opt/authelia/config/configuration.yml << 'EOF'
---
# Server configuration
server:
  host: 0.0.0.0
  port: 9091

# Logging
log:
  level: info

# Theme
theme: light

# JWT secret (loaded from file)
jwt_secret_file: /secrets/jwt_secret

# Default redirection URL after login
default_redirection_url: https://auth.example.com

# Time-based one-time password configuration
totp:
  issuer: example.com
  period: 30
  skew: 1

# Authentication backend (use file-based for simplicity)
authentication_backend:
  file:
    path: /config/users_database.yml
    password:
      algorithm: argon2id
      iterations: 1
      key_length: 32
      salt_length: 16
      memory: 1024
      parallelism: 8

# Access control rules
access_control:
  default_policy: deny
  rules:
    # Allow public resources without authentication
    - domain: public.example.com
      policy: bypass
    # Require 2FA for admin interfaces
    - domain: admin.example.com
      policy: two_factor
    # Require single factor for other services
    - domain: "*.example.com"
      policy: one_factor

# Session configuration
session:
  name: authelia_session
  secret_file: /secrets/session_secret
  expiration: 1h
  inactivity: 5m
  remember_me_duration: 1M
  domain: example.com

# Regulation (brute force protection)
regulation:
  max_retries: 3
  find_time: 2m
  ban_time: 5m

# Storage backend (SQLite for single-node; use PostgreSQL for HA)
storage:
  encryption_key_file: /secrets/storage_encryption_key
  local:
    path: /config/db.sqlite3

# Notification provider (for password reset and 2FA registration)
notifier:
  smtp:
    username: noreply@example.com
    password: your_smtp_password
    host: smtp.example.com
    port: 587
    sender: "Authelia <noreply@example.com>"
    subject: "[Authelia] {title}"
    startup_check_address: test@example.com
EOF
```

Replace `example.com` with your actual domain throughout the file.

## Creating the Users Database

```bash
# First, generate a hashed password
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate argon2 --password 'YourSecurePassword123!'
```

Use the output hash in your users file:

```bash
cat > /opt/authelia/config/users_database.yml << 'EOF'
---
users:
  john:
    displayname: "John Doe"
    # Hash generated by the command above
    password: "$argon2id$v=19$m=1024,t=1,p=8$..."
    email: john@example.com
    groups:
      - admins
      - users
  jane:
    displayname: "Jane Smith"
    password: "$argon2id$v=19$m=1024,t=1,p=8$..."
    email: jane@example.com
    groups:
      - users
EOF
```

## Docker Compose Setup

```yaml
# /opt/authelia/docker-compose.yml
version: '3.8'

services:
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    restart: unless-stopped
    volumes:
      - ./config:/config
      - ./secrets:/secrets
    ports:
      - "9091:9091"
    environment:
      - TZ=America/New_York
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9091/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Start Authelia:

```bash
cd /opt/authelia
docker compose up -d
docker compose logs -f authelia
```

## Configuring Nginx as the Reverse Proxy

Install and configure Nginx with Authelia integration:

```bash
sudo apt install -y nginx
```

Create a shared Authelia configuration snippet:

```nginx
# /etc/nginx/snippets/authelia-location.conf
location /authelia {
    internal;
    set $upstream_authelia http://127.0.0.1:9091/api/verify;
    proxy_pass_request_body off;
    proxy_pass $upstream_authelia;
    proxy_set_header Content-Length "";

    # Pass headers needed for verification
    proxy_set_header X-Original-URL $scheme://$http_host$request_uri;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Uri $request_uri;
    proxy_set_header X-Forwarded-Ssl on;
    proxy_redirect http:// $scheme://;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_cache_bypass $cookie_session;
    proxy_no_cache $cookie_session;
    proxy_buffers 4 32k;
    client_body_buffer_size 128k;
    send_timeout 5m;
    proxy_read_timeout 240;
    proxy_send_timeout 240;
    proxy_connect_timeout 10;
}
```

```nginx
# /etc/nginx/snippets/authelia-authrequest.conf
auth_request /authelia;
auth_request_set $target_url $scheme://$http_host$request_uri;
auth_request_set $user $upstream_http_remote_user;
auth_request_set $groups $upstream_http_remote_groups;
auth_request_set $name $upstream_http_remote_name;
auth_request_set $emails $upstream_http_remote_emails;
proxy_set_header Remote-User $user;
proxy_set_header Remote-Groups $groups;
proxy_set_header Remote-Name $name;
proxy_set_header Remote-Emails $emails;

error_page 401 =302 https://auth.example.com/?rd=$target_url;
```

Now create a virtual host for the Authelia portal itself:

```nginx
# /etc/nginx/sites-available/auth.example.com
server {
    listen 80;
    server_name auth.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9091;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}
```

Protect another service with Authelia:

```nginx
# /etc/nginx/sites-available/app.example.com
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Include the Authelia location block
    include /etc/nginx/snippets/authelia-location.conf;

    location / {
        # Include the auth_request directives
        include /etc/nginx/snippets/authelia-authrequest.conf;

        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the sites and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/auth.example.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Testing Your Setup

With everything running, navigate to `https://app.example.com`. You should be redirected to the Authelia login portal. After entering your credentials, you'll be sent back to the app.

To test the two-factor authentication flow, log in and navigate to the security settings where you can register a TOTP application like Google Authenticator or Bitwarden Authenticator.

## Keeping Authelia Updated

```bash
# Pull the latest image and restart
cd /opt/authelia
docker compose pull
docker compose up -d
```

Authelia's configuration format evolves between major versions, so always check the migration guides at the official documentation when upgrading major versions.

## Monitoring with OneUptime

Once Authelia is running in production, you'll want to monitor its availability. Setting up an uptime check for your Authelia endpoint ensures you're notified if the authentication portal goes down, which would lock users out of all protected services. [OneUptime](https://oneuptime.com) can monitor your Authelia instance and alert you immediately if it becomes unreachable.
