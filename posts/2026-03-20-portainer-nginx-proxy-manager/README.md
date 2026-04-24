# How to Deploy Portainer and Nginx Proxy Manager Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Reverse Proxy, HTTPS, Docker

Description: Learn how to deploy Portainer alongside Nginx Proxy Manager (NPM) for a GUI-driven reverse proxy solution with automatic SSL, without needing to write Nginx configuration files.

## Introduction

Nginx Proxy Manager (NPM) provides a web interface for managing Nginx reverse proxy configurations, making it accessible to users who prefer not to write Nginx config files directly. When combined with Portainer, you get a complete container management and proxy solution through two web UIs. This guide covers deploying both together on Docker with Let's Encrypt SSL.

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointing to your server
- Ports 80 and 443 accessible, plus administrative access to port 81 for initial NPM setup

## Step 1: Create the Docker Compose File

```yaml
# /opt/proxy-manager/docker-compose.yml

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"      # HTTP - required for Let's Encrypt HTTP challenge
      - "443:443"    # HTTPS - your services
      - "81:81"      # NPM admin interface
    environment:
      DB_MYSQL_HOST: "npm-db"
      DB_MYSQL_PORT: 3306
      DB_MYSQL_USER: "npm"
      DB_MYSQL_PASSWORD: "npm-db-password"
      DB_MYSQL_NAME: "npm"
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - npm-network
      - proxy    # Share network with Portainer
    depends_on:
      - npm-db

  npm-db:
    image: jc21/mariadb-aria:latest
    container_name: npm-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "root-password"
      MYSQL_DATABASE: "npm"
      MYSQL_USER: "npm"
      MYSQL_PASSWORD: "npm-db-password"
    volumes:
      - npm_db_data:/var/lib/mysql
    networks:
      - npm-network

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy    # On proxy network so NPM can reach it

networks:
  npm-network:
    driver: bridge
  proxy:
    name: proxy
    driver: bridge

volumes:
  npm_data:
  npm_letsencrypt:
  npm_db_data:
  portainer_data:
```

## Step 2: Deploy the Stack

```bash
cd /opt/proxy-manager

# Start all services
docker compose up -d

# Check all containers are running
docker compose ps

# Check NPM logs
docker logs nginx-proxy-manager --follow
```

## Step 3: Initial NPM Setup

```bash
# Access NPM admin at http://YOUR_SERVER_IP:81
# Default credentials:
# Email: admin@example.com
# Password: changeme

# You'll be prompted to change the email and password on first login
```

## Step 4: Configure DNS

Create DNS A records for both services:

```text
portainer.example.com   A   YOUR_SERVER_IP
npm.example.com         A   YOUR_SERVER_IP   # For NPM admin itself (optional)
```

## Step 5: Add Portainer as a Proxy Host in NPM

1. Log into NPM at `http://YOUR_SERVER_IP:81`
2. Click **Hosts** → **Proxy Hosts** → **Add Proxy Host**
3. Configure:

```bash
Details tab:
  Domain Names: portainer.example.com
  Scheme: http
  Forward Hostname/IP: portainer    # Docker container name
  Forward Port: 9000
  Cache Assets: OFF
  Block Common Exploits: ON
  Websockets Support: ON    # Required for Portainer terminal

SSL tab:
  SSL Certificate: Request a new SSL Certificate
  Force SSL: ON
  Email Address: your-email@example.com
  Let's Encrypt checkbox: checked
```

4. Click **Save** - NPM will automatically request and configure the Let's Encrypt certificate.

## Step 6: Verify the Setup

```bash
# Test HTTP to HTTPS redirect
curl -I http://portainer.example.com
# Expected: 301 Moved Permanently → https://portainer.example.com

# Test HTTPS
curl -I https://portainer.example.com
# Expected: 200 OK

# Verify certificate
echo | openssl s_client -servername portainer.example.com \
  -connect portainer.example.com:443 2>/dev/null | \
  openssl x509 -noout -issuer
# Expected: issuer is a Let's Encrypt intermediate certificate (the CN can vary)
```

## Step 7: Secure NPM Admin Interface

The NPM admin port (81) should not be exposed to the internet:

```bash
# Option 1: Bind NPM admin only to localhost
# In docker-compose.yml, change:
ports:
  - "127.0.0.1:81:81"    # Only accessible from the server itself

# Access via SSH tunnel:
ssh -L 8181:127.0.0.1:81 user@your-server
# Then access http://localhost:8181 in your browser

# Option 2: Add NPM itself as a proxy host in NPM
# Create a proxy host for npm.example.com pointing to npm:81
# Do not add an NPM access list here; it can break NPM's own login
# Restrict access with firewall rules or a VPN instead
```

## Conclusion

Nginx Proxy Manager paired with Portainer gives teams a fully GUI-managed Docker infrastructure - no command line required for day-to-day operations. NPM handles SSL certificate provisioning and renewal automatically while Portainer manages container deployments. The key is connecting both on the same Docker network so NPM can reach Portainer containers by name, and enabling WebSocket support for Portainer's terminal functionality.
