# How to Install Traefik on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Traefik, Reverse Proxy, Docker, Networking

Description: Install and configure Traefik reverse proxy on Ubuntu Server, including static configuration, dynamic routing, and integration with Let's Encrypt for automatic TLS.

---

Traefik is a cloud-native reverse proxy and load balancer built with microservices in mind. Unlike traditional proxies, Traefik can discover services dynamically through provider integrations with Docker, Kubernetes, Consul, and others. When a container starts, Traefik can pick up routing rules from its labels and begin routing traffic automatically.

This guide covers installing Traefik as a binary or Docker container on Ubuntu, writing the static configuration, and setting up basic HTTP/HTTPS routing with automatic certificate management.

## Installation Methods

Traefik can run as a standalone binary, in Docker, or via a package manager. The binary method gives you more control and works without Docker.

### Method 1: Install from Binary

```bash
# Download the latest Traefik release (check https://github.com/traefik/traefik/releases)
TRAEFIK_VERSION="v3.1.0"
wget "https://github.com/traefik/traefik/releases/download/${TRAEFIK_VERSION}/traefik_${TRAEFIK_VERSION}_linux_amd64.tar.gz"

# Extract the binary
tar -xzf "traefik_${TRAEFIK_VERSION}_linux_amd64.tar.gz"

# Move to system path
sudo mv traefik /usr/local/bin/
sudo chmod +x /usr/local/bin/traefik

# Verify installation
traefik version
```

### Method 2: Install via Docker

If you are running Docker, this is the simplest approach:

```bash
# Ensure Docker is installed
sudo apt install docker.io -y
sudo systemctl enable --now docker

# Pull the Traefik image
sudo docker pull traefik:v3.1
```

## Creating the Traefik User and Directories

When running as a binary, create a dedicated user and configuration directories:

```bash
# Create a system user for Traefik
sudo useradd -r -s /usr/sbin/nologin traefik

# Create configuration and data directories
sudo mkdir -p /etc/traefik
sudo mkdir -p /var/lib/traefik    # For ACME/certificate storage

# Set ownership
sudo chown traefik:traefik /var/lib/traefik
sudo chmod 600 /var/lib/traefik

# Create log directory
sudo mkdir -p /var/log/traefik
sudo chown traefik:traefik /var/log/traefik
```

## Static Configuration

Traefik has two layers of configuration: static and dynamic. Static configuration defines global settings, entry points, and providers. It is set at startup and cannot change without a restart.

Create the main configuration file:

```bash
sudo nano /etc/traefik/traefik.yml
```

```yaml
# Traefik static configuration

# Global settings
global:
  checkNewVersion: false
  sendAnonymousUsage: false

# API and dashboard
api:
  dashboard: true
  # Secure the dashboard - don't expose it publicly without auth
  insecure: false    # Set to true only for local testing

# Entry points - define listening ports
entryPoints:
  web:
    address: ":80"
    # Redirect all HTTP to HTTPS
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https

  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

# Certificate resolvers
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /var/lib/traefik/acme.json
      # Use TLS challenge (simplest for single-domain)
      tlsChallenge: {}
      # Or HTTP challenge
      # httpChallenge:
      #   entryPoint: web

# Providers - where to find dynamic configuration
providers:
  # File provider for manual route definitions
  file:
    directory: /etc/traefik/conf.d
    watch: true    # Reload when files change

  # Docker provider - optional, enable if using Docker
  # docker:
  #   endpoint: "unix:///var/run/docker.sock"
  #   exposedByDefault: false

# Logging
log:
  filePath: /var/log/traefik/traefik.log
  level: INFO    # DEBUG, INFO, WARN, ERROR

# Access log
accessLog:
  filePath: /var/log/traefik/access.log
  format: json
```

```bash
# Secure the config file
sudo chown traefik:traefik /etc/traefik/traefik.yml
sudo chmod 640 /etc/traefik/traefik.yml

# Create the conf.d directory for dynamic config
sudo mkdir -p /etc/traefik/conf.d
sudo chown traefik:traefik /etc/traefik/conf.d
```

## Dynamic Configuration

Dynamic configuration defines routers, services, and middleware. With the file provider, create YAML files in `/etc/traefik/conf.d`:

```bash
sudo nano /etc/traefik/conf.d/myapp.yml
```

```yaml
# Dynamic configuration for myapp

http:
  # Routers - match incoming requests and route to services
  routers:
    myapp:
      rule: "Host(`myapp.example.com`)"
      entryPoints:
        - websecure
      service: myapp-backend
      tls:
        certResolver: letsencrypt
      middlewares:
        - secure-headers

    # Dashboard router (protected)
    traefik-dashboard:
      rule: "Host(`traefik.example.com`)"
      entryPoints:
        - websecure
      service: api@internal
      tls:
        certResolver: letsencrypt
      middlewares:
        - dashboard-auth

  # Services - define backends
  services:
    myapp-backend:
      loadBalancer:
        servers:
          - url: "http://localhost:3000"
        # Health check
        healthCheck:
          path: /health
          interval: 10s
          timeout: 3s

  # Middleware - modify requests/responses
  middlewares:
    secure-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"

    dashboard-auth:
      basicAuth:
        users:
          # Generate with: echo $(htpasswd -nB admin) | sed -e s/\\$/\\$\\$/g
          - "admin:$$2y$$12$$..."
```

## Creating the Systemd Service

Run Traefik as a managed systemd service:

```bash
sudo nano /etc/systemd/system/traefik.service
```

```ini
[Unit]
Description=Traefik Reverse Proxy
Documentation=https://doc.traefik.io/traefik/
After=network-online.target
Wants=network-online.target
AssertFileIsExecutable=/usr/local/bin/traefik

[Service]
User=traefik
Group=traefik

# Allow binding to privileged ports (80, 443)
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Configuration file
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yml

# Restart policy
Restart=on-failure
RestartSec=5

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/var/log/traefik /var/lib/traefik

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable traefik
sudo systemctl start traefik

# Check status
sudo systemctl status traefik
sudo journalctl -u traefik -f
```

## Firewall Configuration

```bash
# Open HTTP and HTTPS ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload UFW
sudo ufw reload
sudo ufw status
```

## Testing the Installation

Validate the static configuration:

```bash
# Test configuration
traefik --configFile=/etc/traefik/traefik.yml --dry-run

# Check Traefik logs for errors
sudo tail -f /var/log/traefik/traefik.log
```

Access the Traefik dashboard if configured. With `insecure: true` for local testing, it is accessible at `http://server-ip:8080/dashboard/`.

## Docker Provider Setup

If using Traefik with Docker, enable the Docker provider and use container labels for routing:

```yaml
# In traefik.yml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-net
```

Add Traefik labels to Docker containers:

```yaml
# docker-compose.yml for an application
version: "3.8"

networks:
  traefik-net:
    external: true

services:
  myapp:
    image: myapp:latest
    networks:
      - traefik-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"
```

Create the Docker network:

```bash
sudo docker network create traefik-net
```

## Verifying Certificate Management

Traefik stores certificates in the ACME JSON file:

```bash
# Check if certificates are being issued
sudo cat /var/lib/traefik/acme.json | python3 -m json.tool | grep -A 5 "domain"

# Check certificate expiry
sudo openssl s_client -connect myapp.example.com:443 -servername myapp.example.com 2>/dev/null | openssl x509 -noout -dates
```

Traefik renews certificates automatically about 30 days before expiry.

## Troubleshooting

**Port 80/443 already in use:** Check what is listening with `ss -tlnp | grep -E ':80|:443'`. Stop conflicting services like Apache or Nginx.

**Certificates not issuing:** Verify DNS resolves to the server's public IP, ports 80 and 443 are open, and the ACME email is set correctly. Use the staging Let's Encrypt endpoint for testing to avoid rate limits.

**Routes not matching:** Check the dynamic configuration syntax with `traefik --configFile=/etc/traefik/traefik.yml --log.level=DEBUG` and review the dashboard for routing information.

Traefik's strength is in its provider system - once the static configuration is in place, adding new routes requires only a configuration file change (or a container label), with no proxy restart needed.
