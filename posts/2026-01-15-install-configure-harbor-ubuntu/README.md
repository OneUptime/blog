# How to Install and Configure Harbor on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Harbor, Container Registry, Docker, DevOps, Tutorial

Description: Complete guide to installing Harbor container registry on Ubuntu for secure enterprise Docker image storage.

---

Harbor is an open-source container registry that stores, signs, and scans container images. It provides security features like vulnerability scanning, image signing, and role-based access control. This guide covers Harbor installation on Ubuntu.

## Features

- Container image storage
- Vulnerability scanning
- Image signing (Notary)
- Role-based access control
- Replication between registries
- Garbage collection
- REST API

## Prerequisites

- Ubuntu 20.04 or later
- At least 4GB RAM (8GB recommended)
- Docker and Docker Compose
- 50GB+ disk space
- Root or sudo access

## Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

## Download Harbor

```bash
# Download Harbor installer
cd /opt
sudo wget https://github.com/goharbor/harbor/releases/download/v2.9.1/harbor-offline-installer-v2.9.1.tgz

# Extract
sudo tar xzf harbor-offline-installer-*.tgz
cd harbor
```

## Generate SSL Certificates

### Self-Signed (Development)

```bash
# Create certificate directory
sudo mkdir -p /data/cert
cd /data/cert

# Generate CA key
sudo openssl genrsa -out ca.key 4096

# Generate CA certificate
sudo openssl req -x509 -new -nodes -sha512 -days 3650 \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=harbor.example.com" \
    -key ca.key \
    -out ca.crt

# Generate server key
sudo openssl genrsa -out harbor.example.com.key 4096

# Generate CSR
sudo openssl req -sha512 -new \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=harbor.example.com" \
    -key harbor.example.com.key \
    -out harbor.example.com.csr

# Create extensions file
cat > v3.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=harbor.example.com
DNS.2=harbor
IP.1=192.168.1.100
EOF

# Generate certificate
sudo openssl x509 -req -sha512 -days 3650 \
    -extfile v3.ext \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -in harbor.example.com.csr \
    -out harbor.example.com.crt

# Convert to Docker format
sudo openssl x509 -inform PEM -in harbor.example.com.crt -out harbor.example.com.cert

# Copy to Docker certs
sudo mkdir -p /etc/docker/certs.d/harbor.example.com
sudo cp harbor.example.com.cert /etc/docker/certs.d/harbor.example.com/
sudo cp harbor.example.com.key /etc/docker/certs.d/harbor.example.com/
sudo cp ca.crt /etc/docker/certs.d/harbor.example.com/

# Restart Docker
sudo systemctl restart docker
```

### Let's Encrypt

```bash
# Install certbot
sudo apt install certbot -y

# Get certificate
sudo certbot certonly --standalone -d harbor.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/harbor.example.com/fullchain.pem /data/cert/harbor.example.com.crt
sudo cp /etc/letsencrypt/live/harbor.example.com/privkey.pem /data/cert/harbor.example.com.key
```

## Configure Harbor

```bash
cd /opt/harbor
sudo cp harbor.yml.tmpl harbor.yml
sudo nano harbor.yml
```

```yaml
# Harbor configuration

hostname: harbor.example.com

http:
  port: 80

https:
  port: 443
  certificate: /data/cert/harbor.example.com.crt
  private_key: /data/cert/harbor.example.com.key

# External URL
external_url: https://harbor.example.com

# Harbor admin password
harbor_admin_password: YourStrongPassword

# Database configuration
database:
  password: root123
  max_idle_conns: 100
  max_open_conns: 900
  conn_max_lifetime: 5m
  conn_max_idle_time: 0

# Data volume
data_volume: /data

# Storage backend
storage_service:
  filesystem:
    rootdirectory: /storage

# Trivy vulnerability scanner
trivy:
  ignore_unfixed: false
  skip_update: false
  offline_scan: false
  insecure: false

# Notification
notification:
  webhook_job_max_retry: 10

# Log
log:
  level: info
  local:
    rotate_count: 50
    rotate_size: 200M
    location: /var/log/harbor

# Proxy (if behind proxy)
# proxy:
#   http_proxy:
#   https_proxy:
#   no_proxy:
```

## Install Harbor

```bash
# Prepare and install
cd /opt/harbor
sudo ./prepare

# Install with Trivy scanner
sudo ./install.sh --with-trivy

# Or install with Notary (image signing)
sudo ./install.sh --with-trivy --with-notary
```

## Access Harbor

1. Open: `https://harbor.example.com`
2. Login:
   - Username: admin
   - Password: (from harbor.yml)

## Docker Login

```bash
# Login to Harbor
docker login harbor.example.com

# For self-signed certificates, add CA to system
sudo cp /data/cert/ca.crt /usr/local/share/ca-certificates/harbor-ca.crt
sudo update-ca-certificates
```

## Create Project

### Via Web UI

1. Projects → New Project
2. Configure:
   - Project Name: myproject
   - Access Level: Public/Private
   - Enable vulnerability scanning

### Via API

```bash
curl -X POST "https://harbor.example.com/api/v2.0/projects" \
    -u "admin:password" \
    -H "Content-Type: application/json" \
    -d '{
        "project_name": "myproject",
        "public": true
    }'
```

## Push Images

```bash
# Tag image
docker tag myapp:latest harbor.example.com/myproject/myapp:latest

# Push image
docker push harbor.example.com/myproject/myapp:latest
```

## Pull Images

```bash
# Pull image
docker pull harbor.example.com/myproject/myapp:latest
```

## User Management

### Create User

1. Administration → Users → New User
2. Fill in details
3. Assign to project with role

### Roles

| Role | Permissions |
|------|-------------|
| Guest | Pull images |
| Developer | Pull/push images |
| Maintainer | Pull/push + scan + label |
| Project Admin | Full project control |

## Vulnerability Scanning

### Scan Image

1. Projects → Select project → Repositories
2. Select image → Scan

### Auto-Scan on Push

1. Projects → Configuration
2. Enable "Automatically scan images on push"

### Prevent Vulnerable Images

1. Projects → Configuration
2. Set vulnerability severity threshold
3. Enable "Prevent vulnerable images from running"

## Replication

### Configure Endpoint

1. Administration → Registries → New Endpoint
2. Configure destination registry:
   - Provider: Docker Hub / Harbor / etc.
   - Endpoint URL
   - Access credentials

### Create Replication Rule

1. Administration → Replications → New Replication Rule
2. Configure:
   - Name: replicate-to-dockerhub
   - Source: myproject/**
   - Destination: Docker Hub endpoint
   - Trigger: Event-based / Scheduled

## Garbage Collection

### Run Manually

1. Administration → Garbage Collection
2. Click "GC Now"

### Schedule

1. Administration → Garbage Collection
2. Set schedule (e.g., daily at 2 AM)

## API Usage

### List Projects

```bash
curl -X GET "https://harbor.example.com/api/v2.0/projects" \
    -u "admin:password"
```

### List Repositories

```bash
curl -X GET "https://harbor.example.com/api/v2.0/projects/myproject/repositories" \
    -u "admin:password"
```

### Get Vulnerability Report

```bash
curl -X GET "https://harbor.example.com/api/v2.0/projects/myproject/repositories/myapp/artifacts/latest/additions/vulnerabilities" \
    -u "admin:password"
```

## Kubernetes Integration

### Create Image Pull Secret

```bash
kubectl create secret docker-registry harbor-secret \
    --docker-server=harbor.example.com \
    --docker-username=robot\$myproject+myrobot \
    --docker-password=robot-token
```

### Use in Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      imagePullSecrets:
        - name: harbor-secret
      containers:
        - name: myapp
          image: harbor.example.com/myproject/myapp:latest
```

## Backup and Restore

### Backup

```bash
# Stop Harbor
cd /opt/harbor
docker compose down

# Backup data
sudo tar -czf harbor-backup-$(date +%Y%m%d).tar.gz /data

# Backup database
docker exec harbor-db pg_dump -U postgres registry > harbor-db-backup.sql

# Start Harbor
docker compose up -d
```

### Restore

```bash
# Stop Harbor
docker compose down

# Restore data
sudo tar -xzf harbor-backup-*.tar.gz -C /

# Restore database
docker exec -i harbor-db psql -U postgres registry < harbor-db-backup.sql

# Start Harbor
docker compose up -d
```

## Troubleshooting

### Check Logs

```bash
# All container logs
docker compose logs -f

# Specific service
docker compose logs -f core
docker compose logs -f registry
docker compose logs -f trivy-adapter
```

### Common Issues

```bash
# Certificate errors
# Ensure certificates are in correct locations
ls -la /etc/docker/certs.d/harbor.example.com/

# Cannot push large images
# Check nginx configuration for client_max_body_size

# Database issues
docker compose logs -f postgresql

# Restart Harbor
cd /opt/harbor
docker compose down
docker compose up -d
```

### Health Check

```bash
# Check all containers are running
docker compose ps

# API health
curl https://harbor.example.com/api/v2.0/health
```

---

Harbor provides enterprise-grade container registry features for secure image management. Its vulnerability scanning and access control make it ideal for production environments. For monitoring your Harbor deployment, consider using OneUptime for comprehensive uptime and performance tracking.
