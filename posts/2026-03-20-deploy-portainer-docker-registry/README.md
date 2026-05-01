# How to Deploy Portainer with a Docker Registry (Distribution)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Docker Registry, Self-Hosted, Container Registry

Description: Learn how to deploy a private Docker Registry (Distribution) alongside Portainer using Docker Compose for a fully self-hosted container management solution.

## Introduction

Running a private Docker Registry gives your team full control over container images - no rate limits, no external dependencies, and no image leaks. When paired with Portainer, you get a complete self-hosted platform for building, storing, and deploying containers.

This guide walks you through deploying Docker Distribution (the official open-source registry) and connecting it to Portainer so you can push, pull, and manage images directly from the UI.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose v2 installed
- Portainer CE or BE running (or about to be set up)
- A domain name or local hostname for the registry

## Step 1: Create the Directory Structure

```bash
# Create directories for registry data, auth, and TLS certificates

mkdir -p /opt/registry/data
mkdir -p /opt/registry/auth
mkdir -p /opt/registry/certs
```

## Step 2: Generate a Basic Auth Password

```bash
# Debian/Ubuntu: install the htpasswd tool
apt-get install -y apache2-utils

# Create credentials file (you will be prompted for the password)
htpasswd -Bc /opt/registry/auth/htpasswd myuser
```

## Step 3: Create the Docker Compose File

Create `/opt/registry/docker-compose.yml`:

```yaml
services:
  # Private Docker Registry using the official Distribution image
  registry:
    image: registry:3
    container_name: docker-registry
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      # Enable basic authentication
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Docker Registry"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      # Storage backend (filesystem)
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
      # Enable deletion of images
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
      # Enable TLS for authenticated access
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
    volumes:
      - /opt/registry/data:/data
      - /opt/registry/auth:/auth
      - /opt/registry/certs:/certs
    networks:
      - registry-net

  # Portainer CE for container management
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      # Mount Docker socket for management
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - registry-net

volumes:
  portainer_data:

networks:
  registry-net:
    driver: bridge
```

## Step 4: Deploy the Stack

```bash
# Generate a self-signed cert for your registry hostname
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout /opt/registry/certs/domain.key \
  -x509 -days 365 \
  -out /opt/registry/certs/domain.crt \
  -subj "/CN=your-host" \
  -addext "subjectAltName = DNS:your-host"

# Deploy both services
cd /opt/registry
docker compose up -d

# Verify both containers are running
docker ps | grep -E "registry|portainer"
```

If you use a self-signed certificate, copy `domain.crt` to `/etc/docker/certs.d/your-host:5000/ca.crt` on each Docker host that will push to or pull from the registry. On some Docker versions, you may also need to trust it in the host OS certificate store.

## Step 5: Connect the Registry to Portainer

1. Open Portainer at `https://your-host:9443` (or `http://your-host:9000` if you intentionally keep legacy HTTP enabled)
2. Navigate to **Registries** in the left sidebar
3. Click **Add Registry** → **Custom Registry**
4. Fill in:
   - **Name**: My Private Registry
   - **Registry URL**: `https://your-host:5000`
   - **Username** and **Password** from your htpasswd file
5. Click **Add Registry**

## Step 6: Push an Image to Your Registry

```bash
# Tag an existing image for your registry
docker tag nginx:latest your-host:5000/mynginx:v1

# Log in to your registry
printf '%s\n' 'mypassword' | docker login your-host:5000 --username myuser --password-stdin

# Push the image
docker push your-host:5000/mynginx:v1

# Verify via API
curl --cacert /opt/registry/certs/domain.crt \
  -u myuser:mypassword \
  https://your-host:5000/v2/_catalog
```

## Step 7: Deploy from Your Private Registry via Portainer

1. In Portainer, go to **Images** → **Pull Image**
2. Select your registry from the dropdown
3. Enter the image name: `mynginx:v1`
4. Click **Pull the image**

You can now reference this image when creating containers or stacks.

## Using CA-Signed TLS in Production

For production, replace the self-signed certificate with one issued by Let's Encrypt or another trusted CA:

```bash
# Example filenames expected by the Compose file
/opt/registry/certs/domain.crt
/opt/registry/certs/domain.key
```

The Compose file above already mounts `/opt/registry/certs:/certs` and uses:

```yaml
environment:
  REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
  REGISTRY_HTTP_TLS_KEY: /certs/domain.key
volumes:
  - /opt/registry/certs:/certs
```

## Conclusion

You now have a fully functional private Docker Registry running alongside Portainer. This setup gives you a self-hosted image store with basic authentication, and the Portainer UI makes it easy to manage your images, deploy containers, and build stacks without ever leaving your infrastructure.
