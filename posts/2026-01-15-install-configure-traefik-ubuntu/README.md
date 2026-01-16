# How to Install and Configure Traefik on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Traefik, Reverse Proxy, Load Balancer, Cloud Native, Tutorial

Description: Complete guide to installing Traefik edge router on Ubuntu for dynamic reverse proxy and load balancing.

---

Traefik is a modern cloud-native edge router and reverse proxy. It automatically discovers services and configures itself dynamically. With native integration for Docker, Kubernetes, and other orchestrators, Traefik simplifies microservices routing. This guide covers Traefik installation on Ubuntu.

## Features

- Automatic service discovery
- Dynamic configuration
- Let's Encrypt integration
- Multiple providers (Docker, K8s, file)
- Middleware support
- Dashboard and metrics

## Prerequisites

- Ubuntu 20.04 or later
- Root or sudo access
- Domain name for HTTPS

## Installation

### Download Binary

```bash
# Download Traefik
wget https://github.com/traefik/traefik/releases/download/v3.0.0/traefik_v3.0.0_linux_amd64.tar.gz

# Extract
tar -xzf traefik_*.tar.gz

# Move to bin
sudo mv traefik /usr/local/bin/

# Verify
traefik version
```

### Create User and Directories

```bash
# Create user
sudo useradd -r -s /sbin/nologin traefik

# Create directories
sudo mkdir -p /etc/traefik
sudo mkdir -p /etc/traefik/dynamic
sudo mkdir -p /var/log/traefik

# Set ownership
sudo chown -R traefik:traefik /etc/traefik /var/log/traefik
```

## Static Configuration

```bash
sudo nano /etc/traefik/traefik.yml
```

```yaml
# Traefik static configuration

# Global settings
global:
  checkNewVersion: true
  sendAnonymousUsage: false

# API and Dashboard
api:
  dashboard: true
  insecure: false

# Entrypoints
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

# Certificate resolvers (Let's Encrypt)
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

# Providers
providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

# Logging
log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log
```

## Dynamic Configuration

### Simple Reverse Proxy

```bash
sudo nano /etc/traefik/dynamic/apps.yml
```

```yaml
http:
  routers:
    myapp:
      rule: "Host(`app.example.com`)"
      service: myapp
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    myapp:
      loadBalancer:
        servers:
          - url: "http://localhost:3000"
```

### Multiple Applications

```yaml
http:
  routers:
    frontend:
      rule: "Host(`www.example.com`)"
      service: frontend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    api:
      rule: "Host(`api.example.com`)"
      service: api
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    admin:
      rule: "Host(`admin.example.com`)"
      service: admin
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - auth

  services:
    frontend:
      loadBalancer:
        servers:
          - url: "http://localhost:3000"

    api:
      loadBalancer:
        servers:
          - url: "http://localhost:8080"

    admin:
      loadBalancer:
        servers:
          - url: "http://localhost:9000"

  middlewares:
    auth:
      basicAuth:
        users:
          - "admin:$apr1$..."  # htpasswd generated
```

## Path-Based Routing

```yaml
http:
  routers:
    main:
      rule: "Host(`example.com`) && PathPrefix(`/`)"
      service: frontend
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

    api:
      rule: "Host(`example.com`) && PathPrefix(`/api`)"
      service: api
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - strip-api-prefix

  services:
    frontend:
      loadBalancer:
        servers:
          - url: "http://localhost:3000"

    api:
      loadBalancer:
        servers:
          - url: "http://localhost:8080"

  middlewares:
    strip-api-prefix:
      stripPrefix:
        prefixes:
          - "/api"
```

## Load Balancing

```yaml
http:
  services:
    myapp:
      loadBalancer:
        servers:
          - url: "http://192.168.1.10:3000"
          - url: "http://192.168.1.11:3000"
          - url: "http://192.168.1.12:3000"
        healthCheck:
          path: /health
          interval: "10s"
          timeout: "3s"
        sticky:
          cookie:
            name: server_id
            secure: true
```

## Middlewares

### Authentication

```yaml
http:
  middlewares:
    # Basic Auth
    basic-auth:
      basicAuth:
        users:
          - "admin:$apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/"

    # Digest Auth
    digest-auth:
      digestAuth:
        users:
          - "admin:traefik:password"

    # Forward Auth
    forward-auth:
      forwardAuth:
        address: "http://auth-service:9091/verify"
        trustForwardHeader: true
        authResponseHeaders:
          - "X-Forwarded-User"
```

### Headers

```yaml
http:
  middlewares:
    security-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
        contentTypeNosniff: true
        browserXssFilter: true
        frameDeny: true
        customResponseHeaders:
          X-Custom-Header: "value"

    cors-headers:
      headers:
        accessControlAllowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "DELETE"
        accessControlAllowOriginList:
          - "https://example.com"
        accessControlMaxAge: 100
        addVaryHeader: true
```

### Rate Limiting

```yaml
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 200
        period: 1m
```

### Compression

```yaml
http:
  middlewares:
    compress:
      compress:
        excludedContentTypes:
          - "text/event-stream"
```

### Retry

```yaml
http:
  middlewares:
    retry:
      retry:
        attempts: 4
        initialInterval: 100ms
```

## Dashboard Configuration

```yaml
# In dynamic configuration
http:
  routers:
    dashboard:
      rule: "Host(`traefik.example.com`)"
      service: api@internal
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      middlewares:
        - dashboard-auth

  middlewares:
    dashboard-auth:
      basicAuth:
        users:
          - "admin:$apr1$..."
```

## Systemd Service

```bash
sudo nano /etc/systemd/system/traefik.service
```

```ini
[Unit]
Description=Traefik Edge Router
Documentation=https://doc.traefik.io/traefik/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=traefik
Group=traefik
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yml
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
# Create acme.json with correct permissions
sudo touch /etc/traefik/acme.json
sudo chmod 600 /etc/traefik/acme.json
sudo chown traefik:traefik /etc/traefik/acme.json

# Start Traefik
sudo systemctl daemon-reload
sudo systemctl start traefik
sudo systemctl enable traefik

# Check status
sudo systemctl status traefik
```

## Docker Provider

### Enable Docker Provider

```yaml
# traefik.yml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
```

### Docker Compose Example

```yaml
version: '3'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "traefik-certs:/letsencrypt"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

  myapp:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
      - "traefik.http.services.myapp.loadbalancer.server.port=3000"

volumes:
  traefik-certs:
```

## TCP/UDP Routing

```yaml
# TCP routing
tcp:
  routers:
    mysql:
      rule: "HostSNI(`db.example.com`)"
      service: mysql
      tls:
        passthrough: true

  services:
    mysql:
      loadBalancer:
        servers:
          - address: "192.168.1.10:3306"

# UDP routing
udp:
  routers:
    dns:
      entryPoints:
        - udp
      service: dns

  services:
    dns:
      loadBalancer:
        servers:
          - address: "192.168.1.10:53"
```

## Metrics and Monitoring

### Prometheus Metrics

```yaml
# traefik.yml
metrics:
  prometheus:
    buckets:
      - 0.1
      - 0.3
      - 1.2
      - 5.0
    addEntryPointsLabels: true
    addRoutersLabels: true
    addServicesLabels: true
    entryPoint: metrics

entryPoints:
  metrics:
    address: ":8082"
```

### Health Check Endpoint

```yaml
ping:
  entryPoint: ping

entryPoints:
  ping:
    address: ":8081"
```

## Troubleshooting

### Check Logs

```bash
# System logs
sudo journalctl -u traefik -f

# Access logs
sudo tail -f /var/log/traefik/access.log

# Traefik logs
sudo tail -f /var/log/traefik/traefik.log
```

### Debug Mode

```yaml
# traefik.yml
log:
  level: DEBUG
```

### Common Issues

```bash
# Permission denied for docker.sock
sudo usermod -aG docker traefik

# Certificate issues
# Check acme.json permissions
ls -la /etc/traefik/acme.json

# Service not discovered
# Check dynamic config syntax
traefik validate --configFile=/etc/traefik/traefik.yml
```

---

Traefik excels as a cloud-native edge router with automatic service discovery. Its dynamic configuration and Docker/Kubernetes integration make it ideal for microservices architectures. For monitoring your Traefik deployment, consider using OneUptime for comprehensive uptime and performance tracking.
