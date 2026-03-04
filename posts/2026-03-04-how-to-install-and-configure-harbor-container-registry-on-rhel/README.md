# How to Install and Configure Harbor Container Registry on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Harbor, Container Registry, Docker, Security

Description: Learn how to install and configure Harbor on RHEL as a private container registry with vulnerability scanning and access control.

---

Harbor is an open-source container registry that provides security features like vulnerability scanning, image signing, role-based access control, and replication. It runs on top of Docker and Docker Compose.

## Prerequisites

```bash
# Docker and Docker Compose must be installed
docker version
docker compose version

# Install openssl for certificate generation
sudo dnf install -y openssl
```

## Downloading Harbor

```bash
# Download the Harbor offline installer
curl -L https://github.com/goharbor/harbor/releases/download/v2.10.0/harbor-offline-installer-v2.10.0.tgz \
  -o /tmp/harbor.tar.gz
sudo tar xzf /tmp/harbor.tar.gz -C /opt/
cd /opt/harbor
```

## Generating TLS Certificates

```bash
# Create a CA certificate
mkdir -p /opt/harbor/certs
cd /opt/harbor/certs

openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/CN=Harbor CA" \
  -key ca.key -out ca.crt

# Generate server certificate
openssl genrsa -out harbor.key 4096
openssl req -sha512 -new \
  -subj "/CN=registry.example.com" \
  -key harbor.key -out harbor.csr

# Create extensions file
cat << 'EXT' > v3ext.cnf
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1=registry.example.com
DNS.2=registry
IP.1=192.168.1.100
EXT

openssl x509 -req -sha512 -days 3650 \
  -extfile v3ext.cnf \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -in harbor.csr -out harbor.crt
```

## Configuring Harbor

```bash
# Copy the template configuration
cp /opt/harbor/harbor.yml.tmpl /opt/harbor/harbor.yml
```

Edit `/opt/harbor/harbor.yml`:

```yaml
# Key settings in harbor.yml
hostname: registry.example.com

https:
  port: 443
  certificate: /opt/harbor/certs/harbor.crt
  private_key: /opt/harbor/certs/harbor.key

harbor_admin_password: Harbor12345

database:
  password: root123

data_volume: /data/harbor
```

## Installing Harbor

```bash
# Run the installer with vulnerability scanning
sudo /opt/harbor/install.sh --with-trivy

# The installer pulls Docker images and starts all containers
```

## Configuring Docker to Trust Harbor

```bash
# Copy the CA certificate to the Docker trust store
sudo mkdir -p /etc/docker/certs.d/registry.example.com/
sudo cp /opt/harbor/certs/ca.crt /etc/docker/certs.d/registry.example.com/

# Restart Docker
sudo systemctl restart docker
```

## Using Harbor

```bash
# Log in to Harbor
docker login registry.example.com -u admin -p Harbor12345

# Tag and push an image
docker tag myapp:latest registry.example.com/myproject/myapp:latest
docker push registry.example.com/myproject/myapp:latest

# Pull an image
docker pull registry.example.com/myproject/myapp:latest
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=443/tcp --permanent
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --reload
```

Access the Harbor web UI at `https://registry.example.com`. Create projects, manage users, set up replication rules, and configure vulnerability scanning policies through the dashboard. Change the admin password immediately after first login.
