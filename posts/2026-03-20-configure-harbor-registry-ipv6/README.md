# How to Configure Harbor Container Registry with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Container Registry, IPv6, Docker, Kubernetes, DevOps, Security

Description: Deploy and configure Harbor container registry to accept connections over IPv6, including Nginx proxy configuration, HTTPS setup, and Docker client authentication.

---

Harbor is a popular open-source container registry with security scanning, RBAC, and image signing. Configuring Harbor for IPv6 involves updating its Nginx configuration and ensuring the HTTPS certificate includes IPv6 SANs.

## Prerequisites

```bash
# Verify Docker and Docker Compose are installed

docker --version
docker compose version

# Check IPv6 connectivity
ip -6 addr show
curl -6 https://ifconfig.me/ip
```

## Downloading and Configuring Harbor

```bash
# Download Harbor installer
wget https://github.com/goharbor/harbor/releases/download/v2.9.0/harbor-online-installer-v2.9.0.tgz
tar xvf harbor-online-installer-v2.9.0.tgz
cd harbor/
```

Edit the Harbor configuration for IPv6:

```yaml
# harbor.yml

# Use a hostname that resolves to IPv6 (preferred)
hostname: registry.example.com

# Or use IPv6 address directly (less ideal but works)
# hostname: 2001:db8::1

# HTTPS configuration
https:
  port: 443
  # Certificate with IPv6 SAN included
  certificate: /etc/harbor/certs/server.crt
  private_key: /etc/harbor/certs/server.key

# HTTP (redirect to HTTPS)
http:
  port: 80

# Admin password
harbor_admin_password: SecurePassword123

# Database
database:
  password: DatabasePassword

# Storage
data_volume: /data/harbor
```

## Generating a Certificate with IPv6 SAN

```bash
# Create OpenSSL config with IPv6 SAN for Harbor
cat > /tmp/harbor-cert.cnf << 'EOF'
[req]
default_bits = 2048
prompt = no
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = registry.example.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = registry.example.com
IP.1  = 2001:db8::20
EOF

# Generate certificate
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/harbor/certs/server.key \
  -out /etc/harbor/certs/server.crt \
  -config /tmp/harbor-cert.cnf

# Verify IPv6 SAN in certificate
openssl x509 -in /etc/harbor/certs/server.crt -noout -text | \
  grep "Subject Alternative"
```

## Installing Harbor

```bash
# Run Harbor installer
sudo ./install.sh

# Verify Harbor is running
docker compose ps

# Check Harbor containers are healthy
docker ps | grep harbor
```

## Configuring Nginx for IPv6 in Harbor

Harbor uses Nginx as a proxy. After installation, update the nginx config:

```bash
# Find the Harbor nginx configuration
cat harbor/common/config/nginx/nginx.conf

# Update to listen on IPv6
# The template is in common/templates/nginx/nginx.http.conf
# Edit to add: listen [::]:80; and listen [::]:443 ssl;
```

```nginx
# Custom nginx.conf for Harbor with IPv6
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream core {
        server core:8080;
    }

    server {
        # Listen on both IPv4 and IPv6
        listen 80;
        listen [::]:80;
        return 301 https://$host$request_uri;
    }

    server {
        # HTTPS on both IPv4 and IPv6
        listen 443 ssl http2;
        listen [::]:443 ssl http2;

        ssl_certificate /etc/nginx/cert/server.crt;
        ssl_certificate_key /etc/nginx/cert/server.key;

        location / {
            proxy_pass http://core;
        }
    }
}
```

## Authenticating Docker to Harbor over IPv6

```bash
# Login to Harbor registry over IPv6
docker login registry.example.com \
  -u admin \
  -p SecurePassword123

# Tag and push an image
docker tag myapp:latest registry.example.com/myproject/myapp:latest
docker push registry.example.com/myproject/myapp:latest

# Pull from Harbor over IPv6
docker pull registry.example.com/myproject/myapp:latest

# For self-signed certs, configure Docker to trust the Harbor CA
sudo mkdir -p /etc/docker/certs.d/registry.example.com
sudo cp /etc/harbor/certs/server.crt \
  /etc/docker/certs.d/registry.example.com/ca.crt
sudo systemctl restart docker
```

## Firewall Rules for Harbor IPv6

```bash
# Open Harbor ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6
```

Harbor's flexible Nginx proxy configuration makes it straightforward to enable IPv6 access, providing a full-featured private container registry accessible over both IPv4 and IPv6 networks.
