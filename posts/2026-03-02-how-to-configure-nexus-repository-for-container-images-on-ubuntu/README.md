# How to Configure Nexus Repository for Container Images on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nexus, Container Registry, Docker, DevOps

Description: Learn how to install and configure Sonatype Nexus Repository Manager on Ubuntu to host private Docker container images for your organization.

---

Sonatype Nexus Repository Manager is a widely-used artifact repository that supports dozens of formats including Docker/OCI container images, Maven, npm, PyPI, Helm charts, and more. Running Nexus on-premises gives you a single platform to manage all your artifact types, proxy upstream registries, and enforce policies around what packages can be used in your builds. This guide focuses on getting Nexus running on Ubuntu and configuring it as a private Docker container registry.

## System Requirements

Nexus is a Java application with some specific requirements:
- Java 11 or 17 (use OpenJDK)
- At least 4GB RAM (8GB recommended for production)
- Sufficient disk space for your artifacts (Nexus stores blobs on the filesystem)

## Installing Java

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless

# Verify Java is installed correctly
java -version
```

## Downloading Nexus Repository

```bash
# Download the latest Nexus OSS
VERSION="3.63.0-01"
wget https://download.sonatype.com/nexus/3/nexus-${VERSION}-unix.tar.gz

# Extract to /opt
sudo tar xzf nexus-${VERSION}-unix.tar.gz -C /opt/

# Create a symlink for easier management
sudo ln -s /opt/nexus-${VERSION} /opt/nexus

# Create a dedicated service user
sudo useradd --system --no-create-home --shell /bin/bash nexus
sudo chown -R nexus:nexus /opt/nexus
sudo chown -R nexus:nexus /opt/sonatype-work
```

## Configuring Nexus Memory

Adjust JVM memory settings based on your server's RAM:

```bash
sudo nano /opt/nexus/bin/nexus.vmoptions
```

```text
# /opt/nexus/bin/nexus.vmoptions - JVM settings
-Xms2g
-Xmx2g
-XX:MaxDirectMemorySize=2g
-XX:+UnlockDiagnosticVMOptions
-XX:+LogVMOutput
-XX:LogFile=../sonatype-work/nexus3/log/jvm.log
-XX:-OmitStackTraceInFastThrow
-Djava.net.preferIPv4Stack=true
-Dkaraf.home=.
-Dkaraf.base=.
-Dkaraf.etc=etc/karaf
-Djava.util.logging.config.file=etc/karaf/java.util.logging.properties
-Dkaraf.data=../sonatype-work/nexus3
-Dkaraf.log=../sonatype-work/nexus3/log
-Djava.io.tmpdir=../sonatype-work/nexus3/tmp
```

## Creating the Systemd Service

```bash
sudo nano /etc/systemd/system/nexus.service
```

```ini
[Unit]
Description=Sonatype Nexus Repository Manager
After=network.target

[Service]
Type=forking
User=nexus
Group=nexus
ExecStart=/opt/nexus/bin/nexus start
ExecStop=/opt/nexus/bin/nexus stop
ExecReload=/opt/nexus/bin/nexus restart
Restart=on-failure
RestartSec=10
TimeoutStopSec=60
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexus
sudo systemctl start nexus

# Monitor startup (takes 1-2 minutes)
sudo tail -f /opt/sonatype-work/nexus3/log/nexus.log
```

## Initial Configuration

Access Nexus at `http://your-server:8081`. The initial admin password is in:

```bash
cat /opt/sonatype-work/nexus3/admin.password
```

Log in, change the password, and complete the setup wizard. Disable anonymous access for a private registry.

## Creating Docker Repositories

Nexus supports three types of Docker repositories:

1. **Hosted** - stores your own private images
2. **Proxy** - caches images from Docker Hub or other registries
3. **Group** - combines hosted and proxy repos behind a single URL

### Hosted Repository (Private Registry)

Via the Nexus web UI:
1. Go to **Administration** > **Repositories** > **Create repository**
2. Select **docker (hosted)**
3. Configure:
   - Name: `docker-private`
   - HTTP port: `8082` (images will be pushed/pulled on this port)
   - Enable Docker V1 API: checked (for older clients)
   - Blob store: default (or create a dedicated one)

### Proxy Repository (Docker Hub Cache)

1. Create repository > **docker (proxy)**
2. Configure:
   - Name: `docker-hub-proxy`
   - Remote storage URL: `https://registry-1.docker.io`
   - HTTP port: `8083`
   - Docker Index: Use Docker Hub

### Group Repository

1. Create repository > **docker (group)**
2. Add both `docker-private` and `docker-hub-proxy` as members
3. HTTP port: `8084`

## Configuring Docker to Use Nexus

Add Nexus as an insecure registry if not using HTTPS, or configure TLS:

```bash
# Option 1: Insecure registry (for development)
sudo nano /etc/docker/daemon.json
```

```json
{
  "insecure-registries": [
    "your-nexus-server:8082",
    "your-nexus-server:8083",
    "your-nexus-server:8084"
  ]
}
```

```bash
sudo systemctl restart docker
```

For production, set up TLS with a valid certificate. Put Nginx in front of Nexus:

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Create nginx config for Nexus Docker registry
sudo nano /etc/nginx/sites-available/nexus-docker
```

```nginx
# /etc/nginx/sites-available/nexus-docker
server {
    listen 443 ssl;
    server_name registry.example.com;

    ssl_certificate /etc/letsencrypt/live/registry.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/registry.example.com/privkey.pem;

    # Increase max body size for large images
    client_max_body_size 0;

    # Required for Docker push (chunked transfer)
    chunked_transfer_encoding on;

    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

## Pushing and Pulling Images

With Nexus configured and Docker set up:

```bash
# Log in to the private registry
docker login your-nexus-server:8082 -u admin -p your-password

# Tag an image for the Nexus registry
docker tag myapp:latest your-nexus-server:8082/myapp:latest

# Push the image
docker push your-nexus-server:8082/myapp:latest

# Pull an image through the proxy (gets it from Docker Hub, caches it)
docker pull your-nexus-server:8083/ubuntu:22.04

# Pull through the group (checks private first, then proxy)
docker pull your-nexus-server:8084/myapp:latest
```

## Setting Up Blob Stores

For large-scale use, create dedicated blob stores for Docker content:

Via UI: **Administration** > **Blob Stores** > **Create blob store**
- Type: File
- Name: `docker-blobs`
- Path: `/var/nexus-data/docker-blobs` (on a large, fast disk)

Assign this blob store when creating Docker repositories.

## Configuring Cleanup Policies

Prevent disk from filling up with old images:

1. Go to **Administration** > **Cleanup Policies** > **Create cleanup policy**
2. Select **docker** format
3. Set conditions:
   - "Is component's age" > 90 days
   - "Is component's last downloaded" > 30 days
4. Apply the policy to your hosted repository

Run cleanup manually:

Via UI: **Administration** > **System** > **Tasks** > Run "Docker - Delete incomplete uploads" and "Admin - Compact blob store"

Nexus is a heavy but comprehensive solution that makes sense when you need one tool to manage Docker images alongside your Maven JARs, npm packages, and Helm charts. For a Docker-only registry, the lighter Zot or Harbor might be better choices.
