# How to Install Terraform Enterprise on Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Linux, Installation, Self-Hosted

Description: Step-by-step guide to installing Terraform Enterprise on a Linux server including system requirements, Docker setup, and configuration.

---

Terraform Enterprise is the self-hosted version of HCP Terraform. You run it on your own infrastructure, giving you full control over data, networking, and compliance. Installing it on Linux is the most straightforward deployment option. This guide walks through the complete process from system requirements to a running installation.

## System Requirements

Before starting, make sure your Linux server meets these requirements:

- **OS:** A Linux distribution supported by your Terraform Enterprise release and container runtime
- **CPU:** Minimum 4 cores, recommended 8 cores
- **RAM:** Minimum 8 GB, recommended 16 GB
- **Disk:** Minimum 50 GB for the OS and application, plus additional storage for data
- **Runtime:** Docker Engine or Podman supported by your Terraform Enterprise version
- **Network:** Ports 80 (HTTP) and 443 (HTTPS) open

HashiCorp's supported operating systems, runtimes, and resource requirements vary by Terraform Enterprise release. Check the software product compatibility report for your target version before provisioning the server.

```bash
# Check system resources

nproc          # CPU cores
free -h        # Memory
df -h /        # Disk space
uname -r       # Kernel version
cat /etc/os-release  # OS version
```

## Step 1: Prepare the Server

Update the system and install prerequisites:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  curl \
  unzip \
  jq \
  ca-certificates \
  gnupg \
  lsb-release

# RHEL
sudo dnf update -y
sudo dnf install -y \
  curl \
  unzip \
  jq \
  ca-certificates
```

## Step 2: Install Docker

Terraform Enterprise runs as Docker containers. Install Docker Engine:

```bash
# Ubuntu - Install Docker from official repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# RHEL - Install Docker
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```bash
# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker is running
sudo docker info
```

## Step 3: Set Up TLS Certificates

Terraform Enterprise requires TLS. You can use a self-signed certificate, a certificate from your internal CA, or a certificate from a public CA like Let's Encrypt:

```bash
# Option 1: Generate a self-signed certificate (for testing only)
sudo mkdir -p /etc/terraform-enterprise/certs
sudo mkdir -p /var/lib/terraform-enterprise

sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /etc/terraform-enterprise/certs/key.pem \
  -out /etc/terraform-enterprise/certs/cert.pem \
  -subj "/CN=tfe.example.com" \
  -addext "subjectAltName=DNS:tfe.example.com"

sudo cp /etc/terraform-enterprise/certs/cert.pem \
  /etc/terraform-enterprise/certs/bundle.pem

# Option 2: Use certificates from your CA
# Copy your cert and key to:
# /etc/terraform-enterprise/certs/cert.pem
# /etc/terraform-enterprise/certs/key.pem
# /etc/terraform-enterprise/certs/bundle.pem
```

## Step 4: Pull the Terraform Enterprise Image

Authenticate with the Terraform Enterprise container registry:

```bash
# Log in to the HashiCorp container registry
# You need your Terraform Enterprise license for this
echo "$TFE_LICENSE" | sudo docker login images.releases.hashicorp.com \
  --username terraform \
  --password-stdin

# Pull the Terraform Enterprise image
export TFE_VERSION=vYYYYMM-N
sudo docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:${TFE_VERSION}
```

## Step 5: Create the Configuration

Create a Docker Compose file for Terraform Enterprise:

```yaml
# /etc/terraform-enterprise/compose.yaml
name: terraform-enterprise

services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:${TFE_VERSION}
    restart: always
    environment:
      # Required settings
      TFE_LICENSE: "${TFE_LICENSE}"
      TFE_HOSTNAME: "${TFE_HOSTNAME}"
      TFE_ENCRYPTION_PASSWORD: "${TFE_ENCRYPTION_PASSWORD}"
      TFE_OPERATIONAL_MODE: "disk"
      TFE_DISK_CACHE_VOLUME_NAME: "${COMPOSE_PROJECT_NAME}_terraform-enterprise-cache"

      # TLS configuration
      TFE_TLS_CERT_FILE: "/etc/ssl/private/terraform-enterprise/cert.pem"
      TFE_TLS_KEY_FILE: "/etc/ssl/private/terraform-enterprise/key.pem"
      TFE_TLS_CA_BUNDLE_FILE: "/etc/ssl/private/terraform-enterprise/bundle.pem"

      # Or use external PostgreSQL for production
      # TFE_OPERATIONAL_MODE: "external"
      # TFE_DATABASE_HOST: "postgres.internal.example.com"
      # TFE_DATABASE_USER: "terraform"
      # TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
      # TFE_DATABASE_NAME: "terraform_enterprise"

      # Object storage (for external mode)
      # TFE_OBJECT_STORAGE_TYPE: "s3"
      # TFE_OBJECT_STORAGE_S3_BUCKET: "tfe-data"
      # TFE_OBJECT_STORAGE_S3_REGION: "us-east-1"

    cap_add:
      - IPC_LOCK
    read_only: true
    tmpfs:
      - /tmp:mode=01777
      - /run
      - /var/log/terraform-enterprise
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Docker socket for the default Docker run pipeline driver
      - type: bind
        source: /var/run/docker.sock
        target: /run/docker.sock
      # TLS certificates
      - type: bind
        source: ./certs
        target: /etc/ssl/private/terraform-enterprise
      # Persistent data storage
      - type: bind
        source: /var/lib/terraform-enterprise
        target: /var/lib/terraform-enterprise
      # Terraform binary cache for runs
      - type: volume
        source: terraform-enterprise-cache
        target: /var/cache/tfe-task-worker/terraform

volumes:
  terraform-enterprise-cache:
```

## Step 6: Create an Environment File

Store sensitive values in an environment file:

```bash
# /etc/terraform-enterprise/.env
# This file contains sensitive values - secure it properly

TFE_VERSION=vYYYYMM-N
TFE_LICENSE=your-raw-hashicorp-license
TFE_ENCRYPTION_PASSWORD=a-strong-random-password
TFE_HOSTNAME=tfe.example.com
```

```bash
# Secure the environment file
sudo chmod 600 /etc/terraform-enterprise/.env
sudo chown root:root /etc/terraform-enterprise/.env
```

## Step 7: Start Terraform Enterprise

```bash
# Navigate to the configuration directory
cd /etc/terraform-enterprise

# Start Terraform Enterprise
sudo docker compose --env-file .env up -d

# Check the container status
sudo docker compose ps

# Follow the logs to monitor startup
sudo docker compose logs -f tfe
```

Startup takes a few minutes. Watch the logs for the message indicating the application is ready.

## Step 8: Initial Configuration

Once the container is running, open your browser and navigate to `https://tfe.example.com` to complete the setup:

1. Create the initial admin user
2. Set the organization name
3. Configure email settings (optional)
4. Verify the installation health

```bash
# Check readiness from inside the container
sudo docker compose exec tfe tfectl app health readiness
```

## Step 9: Configure DNS

Point your DNS record to the server:

```bash
# If using Route53, create an A record
# tfe.example.com -> <server-ip>

# Or add to /etc/hosts for testing
echo "10.0.1.100 tfe.example.com" | sudo tee -a /etc/hosts
```

## Running as a Systemd Service

For production, manage Terraform Enterprise through systemd:

```ini
# /etc/systemd/system/terraform-enterprise.service
[Unit]
Description=Terraform Enterprise
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/etc/terraform-enterprise
ExecStart=/usr/bin/docker compose --env-file .env up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable terraform-enterprise
sudo systemctl start terraform-enterprise

# Check status
sudo systemctl status terraform-enterprise
```

## Backup and Recovery

Set up regular backups of the Terraform Enterprise data:

```bash
#!/bin/bash
# backup-tfe.sh
# Backup Terraform Enterprise data

BACKUP_DIR="/var/backups/terraform-enterprise"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"

# Stop the application briefly for a consistent backup
cd /etc/terraform-enterprise
sudo docker compose stop

# Backup the data directory
sudo tar czf "$BACKUP_DIR/tfe-data-$DATE.tar.gz" \
  /var/lib/terraform-enterprise/

# Backup the Terraform cache volume
sudo docker run --rm \
  -v terraform-enterprise_terraform-enterprise-cache:/cache \
  -v "$BACKUP_DIR:/backup" \
  alpine \
  tar czf "/backup/tfe-cache-$DATE.tar.gz" -C /cache .

# Backup the configuration
sudo tar czf "$BACKUP_DIR/tfe-config-$DATE.tar.gz" \
  /etc/terraform-enterprise/

# Restart the application
sudo docker compose --env-file .env up -d

echo "Backup completed: $BACKUP_DIR/tfe-data-$DATE.tar.gz"
```

## Upgrading Terraform Enterprise

To upgrade, pull the new image and restart:

```bash
# Set and pull the target version
export TFE_VERSION=vYYYYMM-N
sudo docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:${TFE_VERSION}

# Restart with the new image
cd /etc/terraform-enterprise
sudo sed -i "s/^TFE_VERSION=.*/TFE_VERSION=${TFE_VERSION}/" .env
sudo docker compose --env-file .env down
sudo docker compose --env-file .env up -d

# Monitor the upgrade
sudo docker compose logs -f tfe
```

Always backup before upgrading, and test upgrades in a non-production environment first.

## Troubleshooting

```bash
# Check container status
sudo docker compose ps

# View application logs
sudo docker compose logs tfe

# Check health
curl -k https://tfe.example.com/_health_check

# Check readiness
sudo docker compose exec tfe tfectl app health readiness

# Check disk space (common issue)
df -h

# Check Docker resource usage
sudo docker stats terraform-enterprise-tfe-1
```

## Summary

Installing Terraform Enterprise on Linux involves preparing the server with Docker, configuring TLS certificates, setting up the application with Docker Compose, and completing the initial web-based setup. For production deployments, use external PostgreSQL and S3-compatible object storage instead of disk mode. Set up automated backups, monitor application readiness, and keep the application updated with regular upgrades.
