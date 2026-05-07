# How to Set Up a Private Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Private Registry, Self-Hosted

Description: Step-by-step instructions for setting up and running your own private container registry using Podman.

---

> Running your own private registry gives you full control over image storage, access, and distribution.

A private container registry lets you store and distribute container images within your organization without relying on external services. You can run a fully functional registry using Podman itself, complete with TLS, authentication, and persistent storage. This guide walks you through the entire setup process.

---

## Starting a Basic Registry

Launch a simple registry container for development use.

```bash
# Create a volume for persistent storage

podman volume create registry-data

# Start the registry container
podman run -d \
  --name private-registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  --restart always \
  docker.io/library/registry:2

# Verify the registry is running
curl -s http://localhost:5000/v2/_catalog
# Expected output: {"repositories":[]}
```

## Testing the Basic Registry

Push and pull a test image to confirm the registry works.

```bash
# Pull a test image
podman pull docker.io/library/alpine:latest

# Tag it for the private registry
podman tag docker.io/library/alpine:latest localhost:5000/alpine:latest

# Push to the private registry
podman push --tls-verify=false localhost:5000/alpine:latest

# Verify the image is in the registry
curl -s http://localhost:5000/v2/_catalog
# Expected output: {"repositories":["alpine"]}

# Pull the image back from the private registry
podman rmi localhost:5000/alpine:latest
podman pull --tls-verify=false localhost:5000/alpine:latest
```

## Adding TLS with Self-Signed Certificates

Secure the registry with TLS encryption.

```bash
# Create a directory for certificates
mkdir -p "$HOME/registry/certs"

# Generate a self-signed certificate
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout "$HOME/registry/certs/registry.key" \
  -x509 -days 365 \
  -out "$HOME/registry/certs/registry.crt" \
  -subj "/CN=registry.example.com" \
  -addext "subjectAltName=DNS:registry.example.com,IP:192.168.1.100"

# Stop the old registry
podman stop private-registry
podman rm private-registry

# Start the registry with TLS
podman run -d \
  --name private-registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  -v "$HOME/registry/certs:/certs:ro" \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  --restart always \
  docker.io/library/registry:2

# Install the certificate for Podman
mkdir -p "$HOME/.config/containers/certs.d/registry.example.com:5000"
cp "$HOME/registry/certs/registry.crt" \
  "$HOME/.config/containers/certs.d/registry.example.com:5000/ca.crt"

# Test the TLS connection
podman pull registry.example.com:5000/alpine:latest
```

## Adding Authentication

Protect the registry with username and password authentication.

```bash
# Create a directory for auth files
mkdir -p "$HOME/registry/auth"

# Install htpasswd (part of httpd-tools or apache2-utils)
sudo dnf install -y httpd-tools 2>/dev/null || \
  sudo apt-get install -y apache2-utils

# Create a password file with a user
htpasswd -Bbn admin secretpassword > "$HOME/registry/auth/htpasswd"

# Add additional users
htpasswd -Bbn developer devpassword >> "$HOME/registry/auth/htpasswd"

# Stop the old registry
podman stop private-registry
podman rm private-registry

# Start the registry with TLS and authentication
podman run -d \
  --name private-registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  -v "$HOME/registry/certs:/certs:ro" \
  -v "$HOME/registry/auth:/auth:ro" \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  -e REGISTRY_AUTH=htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_REALM="Private Registry" \
  -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd \
  --restart always \
  docker.io/library/registry:2

# Login to the authenticated registry
podman login registry.example.com:5000
# Username: admin
# Password: secretpassword
```

## Using a Configuration File

For advanced settings, use a registry configuration file.

```bash
# Create a registry configuration file
mkdir -p "$HOME/registry/config"

cat > "$HOME/registry/config/config.yml" <<'EOF'
version: 0.1
log:
  level: info
  formatter: text
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
  tls:
    certificate: /certs/registry.crt
    key: /certs/registry.key
auth:
  htpasswd:
    realm: "Private Registry"
    path: /auth/htpasswd
health:
  storagedriver:
    enabled: true
    interval: 30s
    threshold: 3
EOF

# Start with the configuration file
podman stop private-registry 2>/dev/null; podman rm private-registry 2>/dev/null

podman run -d \
  --name private-registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  -v "$HOME/registry/certs:/certs:ro" \
  -v "$HOME/registry/auth:/auth:ro" \
  -v "$HOME/registry/config/config.yml:/etc/docker/registry/config.yml:ro" \
  --restart always \
  docker.io/library/registry:2
```

## Managing the Registry

Common management tasks for your private registry.

```bash
# List all repositories
curl -s -u admin:secretpassword \
  https://registry.example.com:5000/v2/_catalog

# List tags for a repository
curl -s -u admin:secretpassword \
  https://registry.example.com:5000/v2/myapp/tags/list

# Check registry health
curl -s https://registry.example.com:5000/v2/ && echo "Registry is healthy"

# View registry logs
podman logs private-registry

# Garbage collect unused image layers with the registry stopped
podman stop private-registry
podman run --rm \
  -v registry-data:/var/lib/registry \
  -v "$HOME/registry/certs:/certs:ro" \
  -v "$HOME/registry/auth:/auth:ro" \
  -v "$HOME/registry/config/config.yml:/etc/docker/registry/config.yml:ro" \
  docker.io/library/registry:2 \
  /bin/registry garbage-collect /etc/docker/registry/config.yml
podman start private-registry
```

## Running the Registry as a Systemd Service

Make the registry start automatically on boot.

```bash
# Create a Quadlet unit for the registry container
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/private-registry.container <<'EOF'
[Unit]
Description=Private container registry

[Container]
ContainerName=private-registry
Image=docker.io/library/registry:2
PublishPort=5000:5000
Volume=registry-data:/var/lib/registry
Volume=%h/registry/certs:/certs:ro
Volume=%h/registry/auth:/auth:ro
Volume=%h/registry/config/config.yml:/etc/docker/registry/config.yml:ro

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Enable and start the service
podman stop private-registry 2>/dev/null
podman rm private-registry 2>/dev/null
systemctl --user daemon-reload
systemctl --user enable --now private-registry.service
sudo loginctl enable-linger "$USER"

# Check the service status
systemctl --user status private-registry.service
```

## Summary

Setting up a private registry with Podman involves running the standard Docker registry image with TLS certificates and htpasswd authentication. Use persistent volumes for image storage and a configuration file for advanced settings. Secure the registry with proper certificates and passwords, run garbage collection to reclaim disk space, and use systemd for automatic startup. This gives you a fully functional, self-hosted container registry under your complete control.
