# How to Set Up a Signature Server for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Signature Server, Image Signing

Description: Learn how to set up and run a dedicated signature server to host container image signatures for Podman verification.

---

> A centralized signature server gives your entire organization a single source of truth for image authenticity.

When using GPG-based image signing with Podman, signatures need to be stored somewhere accessible to all clients that will verify them. A signature server is a simple web server that hosts signature files in a predictable directory structure. This guide covers setting up a signature server from scratch.

---

## Understanding the Signature Server Architecture

Podman stores and retrieves signatures using a well-defined URL pattern. When an image is signed, the signature is stored in a path based on the image reference and digest. The signature server simply serves these files over HTTP or HTTPS.

The URL pattern follows this structure:
```text
<lookaside-url>/<image-name>@<digest-algorithm>=<digest-hex>/signature-<n>
```

## Setting Up the Signature Storage Directory

```bash
# Create the base directory for signature storage

sudo mkdir -p /var/lib/containers/sigstore
sudo chmod 755 /var/lib/containers/sigstore
```

```bash
# Create a directory structure for organizing signatures
sudo mkdir -p /srv/sigstore
sudo chown $(whoami):$(whoami) /srv/sigstore
```

## Running a Signature Server with Nginx

Use a containerized Nginx server to serve signatures.

```bash
# Create an Nginx configuration for the signature server
mkdir -p /tmp/sigserver-config

cat > /tmp/sigserver-config/nginx.conf << 'EOF'
server {
    listen 80;
    server_name sigstore.example.com;

    # Serve signatures from this root directory
    root /srv/sigstore;

    # Allow directory listing for debugging
    autoindex on;

    # Enable CORS for cross-origin requests
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";

    location / {
        # Serve static signature files
        try_files $uri =404;
    }

    # Health check endpoint
    location /healthz {
        return 200 "OK\n";
    }
}
EOF
```

```bash
# Run the signature server as a Podman container
podman run --rm -d \
  --name sigstore-server \
  -p 8888:80 \
  -v /srv/sigstore:/srv/sigstore:ro,Z \
  -v /tmp/sigserver-config/nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  docker.io/library/nginx:alpine

# Verify the server is running
curl -s http://localhost:8888/healthz
# Expected output: OK
```

## Configuring Podman to Use the Signature Server

```bash
# Configure the lookaside signature storage for pushing (writing) and verification (reading)
sudo mkdir -p /etc/containers/registries.d

sudo tee /etc/containers/registries.d/localhost-5000.yaml > /dev/null << 'EOF'
docker:
  localhost:5000:
    # Where Podman writes signatures during 'podman push --sign-by'
    lookaside-staging: file:///var/lib/containers/sigstore

    # Where Podman reads signatures when signature verification is required
    lookaside: http://localhost:8888
EOF
```

## Signing and Publishing Signatures

```bash
# Start a local registry for testing
podman run --rm -d -p 5000:5000 --name test-registry docker.io/library/registry:2

# Tag and push an image
podman tag docker.io/library/alpine:latest localhost:5000/myapp:v1.0
podman push --tls-verify=false localhost:5000/myapp:v1.0
```

```bash
# Sign the image (writes signature to staging directory)
podman push --tls-verify=false \
  --sign-by container-signing@example.com \
  localhost:5000/myapp:v1.0

# Check that signatures were created in staging
find /var/lib/containers/sigstore -type f -name "signature-*"
```

```bash
# Copy signatures from staging to the signature server directory
sudo rsync -av /var/lib/containers/sigstore/ /srv/sigstore/

# Verify signatures are accessible via the server
curl -s http://localhost:8888/ | head -20
```

## Automating Signature Publishing

Create a script that automatically syncs signatures to the server.

```bash
#!/bin/bash
# sync-signatures.sh - Sync signatures from staging to the server

STAGING_DIR="/var/lib/containers/sigstore"
SERVER_DIR="/srv/sigstore"

# Sync new signatures
rsync -av --ignore-existing "$STAGING_DIR/" "$SERVER_DIR/"

# Count total signatures
total=$(find "$SERVER_DIR" -type f -name "signature-*" | wc -l)
echo "Total signatures published: $total"
```

```bash
chmod +x sync-signatures.sh
```

## Setting Up HTTPS with a Self-Signed Certificate

For production, use HTTPS to protect signature integrity in transit.

```bash
# Generate a self-signed certificate for testing
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /tmp/sigserver-config/server.key \
  -out /tmp/sigserver-config/server.crt \
  -subj "/CN=sigstore.example.com"
```

```bash
# Create an HTTPS Nginx configuration
cat > /tmp/sigserver-config/nginx-ssl.conf << 'EOF'
server {
    listen 443 ssl;
    server_name sigstore.example.com;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    root /srv/sigstore;
    autoindex on;

    location / {
        try_files $uri =404;
    }
}
EOF
```

```bash
# Run the HTTPS signature server
podman stop sigstore-server 2>/dev/null
podman rm sigstore-server 2>/dev/null

podman run --rm -d \
  --name sigstore-server-ssl \
  -p 8443:443 \
  -v /srv/sigstore:/srv/sigstore:ro,Z \
  -v /tmp/sigserver-config/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  -v /tmp/sigserver-config/server.crt:/etc/nginx/ssl/server.crt:ro,Z \
  -v /tmp/sigserver-config/server.key:/etc/nginx/ssl/server.key:ro,Z \
  docker.io/library/nginx:alpine

# Test HTTPS access
curl -sk https://localhost:8443/
```

## Monitoring the Signature Server

```bash
# Check server health and access logs
podman logs sigstore-server-ssl --tail 20

# Monitor for errors
podman logs -f sigstore-server-ssl 2>&1 | grep -i error &
```

## Cleanup

```bash
podman stop sigstore-server sigstore-server-ssl test-registry 2>/dev/null
podman rm sigstore-server sigstore-server-ssl test-registry 2>/dev/null
rm -rf /tmp/sigserver-config
```

## Summary

A signature server provides a centralized, accessible location for Podman to retrieve image signatures during verification. By running a simple web server that hosts signature files in the expected directory structure, you enable signature verification across your entire infrastructure. Configure Podman clients to point their lookaside URL to your server, automate signature publishing from your CI/CD pipeline, and use HTTPS in production to protect signature integrity in transit.
