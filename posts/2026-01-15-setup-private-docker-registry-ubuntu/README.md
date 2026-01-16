# How to Set Up a Private Docker Registry on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Docker, Registry, Containers, DevOps, Tutorial

Description: Complete guide to setting up a secure private Docker registry on Ubuntu for storing and distributing container images.

---

A private Docker registry lets you store and distribute container images within your organization without relying on public registries. This guide covers setting up a secure registry with authentication and TLS on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Docker installed
- Domain name (for SSL) or self-signed certificates
- Adequate disk space for images

## Quick Start (Basic Registry)

```bash
# Run registry container
docker run -d -p 5000:5000 --name registry --restart=always registry:2

# Test registry
docker pull nginx
docker tag nginx localhost:5000/nginx
docker push localhost:5000/nginx

# Verify
curl http://localhost:5000/v2/_catalog
```

## Production Setup

### Create Directory Structure

```bash
# Create directories
sudo mkdir -p /opt/registry/{data,auth,certs}
cd /opt/registry
```

### Generate SSL Certificates

For Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone -d registry.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/registry.example.com/fullchain.pem /opt/registry/certs/
sudo cp /etc/letsencrypt/live/registry.example.com/privkey.pem /opt/registry/certs/
```

For self-signed certificates:

```bash
# Generate self-signed certificate
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout /opt/registry/certs/domain.key \
  -x509 -days 365 \
  -out /opt/registry/certs/domain.crt \
  -subj "/CN=registry.example.com"
```

### Configure Authentication

```bash
# Install htpasswd
sudo apt install apache2-utils -y

# Create password file
htpasswd -Bc /opt/registry/auth/htpasswd admin
# Enter password when prompted

# Add more users
htpasswd -B /opt/registry/auth/htpasswd developer
```

### Create Docker Compose File

```bash
nano /opt/registry/docker-compose.yml
```

```yaml
version: '3.8'

services:
  registry:
    image: registry:2
    container_name: docker-registry
    restart: always
    ports:
      - "5000:5000"
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    volumes:
      - ./data:/var/lib/registry
      - ./auth:/auth
      - ./certs:/certs
```

### Start Registry

```bash
cd /opt/registry
docker compose up -d

# Check status
docker compose ps
docker compose logs
```

## Configure Docker Clients

### For Self-Signed Certificates

On each client machine:

```bash
# Create certificate directory
sudo mkdir -p /etc/docker/certs.d/registry.example.com:5000

# Copy CA certificate
sudo cp domain.crt /etc/docker/certs.d/registry.example.com:5000/ca.crt

# Restart Docker
sudo systemctl restart docker
```

Or trust the certificate system-wide:

```bash
# Copy to CA certificates
sudo cp domain.crt /usr/local/share/ca-certificates/registry.example.com.crt
sudo update-ca-certificates
sudo systemctl restart docker
```

### Login to Registry

```bash
# Login
docker login registry.example.com:5000

# Enter username and password when prompted
```

## Push and Pull Images

### Push Image

```bash
# Pull public image
docker pull nginx:latest

# Tag for private registry
docker tag nginx:latest registry.example.com:5000/nginx:latest

# Push to private registry
docker push registry.example.com:5000/nginx:latest
```

### Pull Image

```bash
# Pull from private registry
docker pull registry.example.com:5000/nginx:latest
```

## Registry API

### List Repositories

```bash
# List all repositories
curl -u admin:password https://registry.example.com:5000/v2/_catalog

# Output: {"repositories":["nginx","myapp"]}
```

### List Tags

```bash
# List tags for repository
curl -u admin:password https://registry.example.com:5000/v2/nginx/tags/list

# Output: {"name":"nginx","tags":["latest","1.24"]}
```

### Get Image Manifest

```bash
# Get manifest
curl -u admin:password \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://registry.example.com:5000/v2/nginx/manifests/latest
```

## Delete Images

### Delete via API

```bash
# Get digest
DIGEST=$(curl -sI -u admin:password \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://registry.example.com:5000/v2/nginx/manifests/latest \
  | grep Docker-Content-Digest | awk '{print $2}' | tr -d '\r')

# Delete manifest
curl -X DELETE -u admin:password \
  https://registry.example.com:5000/v2/nginx/manifests/$DIGEST
```

### Garbage Collection

After deleting, run garbage collection to free space:

```bash
# Stop registry
docker compose stop registry

# Run garbage collection
docker run --rm -v /opt/registry/data:/var/lib/registry \
  registry:2 garbage-collect /etc/docker/registry/config.yml

# Start registry
docker compose start registry
```

## Registry UI (Optional)

Add web interface:

```yaml
# Add to docker-compose.yml
  registry-ui:
    image: joxit/docker-registry-ui:latest
    container_name: registry-ui
    restart: always
    ports:
      - "8080:80"
    environment:
      - REGISTRY_URL=https://registry:5000
      - SINGLE_REGISTRY=true
      - REGISTRY_TITLE=My Docker Registry
      - DELETE_IMAGES=true
    depends_on:
      - registry
```

Access at `http://registry.example.com:8080`

## Advanced Configuration

### Custom Configuration File

```bash
nano /opt/registry/config.yml
```

```yaml
version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
  maintenance:
    uploadpurging:
      enabled: true
      age: 168h
      interval: 24h
      dryrun: false
http:
  addr: :5000
  tls:
    certificate: /certs/domain.crt
    key: /certs/domain.key
  headers:
    X-Content-Type-Options: [nosniff]
auth:
  htpasswd:
    realm: Registry Realm
    path: /auth/htpasswd
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

Update docker-compose.yml:

```yaml
services:
  registry:
    image: registry:2
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml
      # ... other volumes
```

### Storage Backend (S3)

```yaml
storage:
  s3:
    accesskey: AKIAIOSFODNN7EXAMPLE
    secretkey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    region: us-east-1
    bucket: my-registry-bucket
    rootdirectory: /registry
```

### Caching with Redis

```yaml
version: '3.8'

services:
  registry:
    # ... existing config
    environment:
      REGISTRY_REDIS_ADDR: redis:6379
    depends_on:
      - redis

  redis:
    image: redis:alpine
    restart: always
```

## Monitoring

### Prometheus Metrics

Enable metrics in config.yml:

```yaml
http:
  debug:
    addr: :5001
    prometheus:
      enabled: true
      path: /metrics
```

Access metrics at `https://registry.example.com:5001/metrics`

### Health Check

```bash
# Check registry health
curl -u admin:password https://registry.example.com:5000/v2/

# Should return: {}
```

## Backup and Restore

### Backup

```bash
#!/bin/bash
# Backup registry data

BACKUP_DIR="/backup/registry-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Stop registry
docker compose -f /opt/registry/docker-compose.yml stop

# Backup data
tar -czf $BACKUP_DIR/data.tar.gz -C /opt/registry data

# Backup config
cp -r /opt/registry/auth $BACKUP_DIR/
cp -r /opt/registry/certs $BACKUP_DIR/
cp /opt/registry/docker-compose.yml $BACKUP_DIR/

# Start registry
docker compose -f /opt/registry/docker-compose.yml start

echo "Backup complete: $BACKUP_DIR"
```

### Restore

```bash
#!/bin/bash
# Restore registry data

BACKUP_DIR=$1

# Stop registry
docker compose -f /opt/registry/docker-compose.yml down

# Restore data
tar -xzf $BACKUP_DIR/data.tar.gz -C /opt/registry

# Restore config
cp -r $BACKUP_DIR/auth /opt/registry/
cp -r $BACKUP_DIR/certs /opt/registry/
cp $BACKUP_DIR/docker-compose.yml /opt/registry/

# Start registry
docker compose -f /opt/registry/docker-compose.yml up -d
```

## Troubleshooting

### Connection Refused

```bash
# Check registry is running
docker compose ps

# Check port is listening
ss -tlnp | grep 5000

# Check firewall
sudo ufw status
```

### Certificate Errors

```bash
# Verify certificate
openssl s_client -connect registry.example.com:5000

# Check certificate is in correct location
ls -la /etc/docker/certs.d/registry.example.com:5000/
```

### Authentication Failed

```bash
# Test authentication
curl -v -u admin:password https://registry.example.com:5000/v2/

# Regenerate htpasswd if needed
htpasswd -Bc /opt/registry/auth/htpasswd admin
docker compose restart
```

---

A private Docker registry gives you control over your container images and can significantly speed up deployments within your network. For larger deployments, consider Harbor or GitLab Container Registry for additional features like vulnerability scanning and RBAC.
