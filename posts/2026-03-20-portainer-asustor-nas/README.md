# How to Install Portainer on ASUSTOR NAS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ASUSTOR, NAS, Docker, Self-Hosted, Home Lab

Description: Install Portainer on an ASUSTOR NAS to manage Docker containers with a full-featured web interface beyond what ASUSTOR's native Docker app provides.

## Introduction

Compatible ASUSTOR NAS models support Docker through the **Docker Engine** app in App Central. Like other NAS vendors, ASUSTOR's Docker UI is limited. Installing Portainer gives you stack management, environment templates, and a more capable container management experience.

## Prerequisites

- Compatible ASUSTOR NAS model with the Docker Engine app available in App Central
- Docker Engine installed from App Central
- SSH access enabled (Services > Terminal)

## Step 1: Enable Docker on ASUSTOR

1. Open **App Central**
2. Search for and install **Docker Engine**
3. Open Docker Engine to initialize it
4. Note the NAS volume you want to use for Portainer data (for example `/volume1/Docker/portainer`)

## Step 2: SSH into the NAS

```bash
ssh admin@<asustor-ip>
```

## Step 3: Install Portainer via CLI

```bash
# Create a directory on the NAS volume for Portainer data
mkdir -p /volume1/Docker/portainer

# Run Portainer
# Portainer serves the UI on HTTPS 9443 by default.
# Add -p 9000:9000 only if you explicitly need legacy HTTP access.
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /volume1/Docker/portainer:/data \
  portainer/portainer-ce:lts

# Verify
docker ps | grep portainer
```

## Step 4: Use Docker Compose

ASUSTOR's Docker Engine package includes Docker Compose v2. Create a compose file:

```bash
# Create the data and compose directories
mkdir -p /volume1/Docker/portainer

# Create the compose directory
mkdir -p /volume1/Docker/portainer-compose

cat > /volume1/Docker/portainer-compose/docker-compose.yml << 'EOF'
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
    volumes:
      # Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock
      # Persistent storage on NAS volume
      - /volume1/Docker/portainer:/data

EOF

# Deploy
cd /volume1/Docker/portainer-compose
docker compose up -d
```

## Step 5: Configure ADM Firewall

1. Open **ADM Defender**
2. Enable the firewall if not already enabled
3. Click **Edit Rules**
4. Add rules:
   - Protocol: TCP, Port: 9443, Action: Allow, Source: Local subnet
   - Optional if you exposed legacy HTTP: Protocol: TCP, Port: 9000, Action: Allow, Source: Local subnet
5. Move allow rules above any default deny rules

## Step 6: Access Portainer

Navigate to `https://<asustor-ip>:9443` and complete the initial setup wizard. Because Portainer uses a self-signed certificate by default, your browser may show a warning the first time you connect.

## Step 7: Configure Auto-Start via ADM

Docker containers with `--restart=unless-stopped` will restart automatically when the Docker service starts after reboot.

To verify:

```bash
# Check restart policy is set
docker inspect portainer | grep -A3 RestartPolicy
```

Output should show:
```json
"RestartPolicy": {
    "Name": "unless-stopped",
    "MaximumRetryCount": 0
}
```

## Troubleshooting ASUSTOR-Specific Issues

### Docker Socket Permission Issues

ASUSTOR only allows administrator-group users and `root` to log in over SSH. If `docker` commands fail, reconnect with an administrator account or `root` and retry.

```bash
# Check socket permissions
ls -la /var/run/docker.sock
```

### Container Not Starting After Reboot

Ensure Docker Engine is enabled and updated to the latest version available for your model in App Central.

1. Open **App Central > Docker Engine**
2. Verify **Docker Engine** is installed, enabled, and up to date

If Portainer was stopped manually, start it again:

```bash
docker start portainer
```

## Updating Portainer

```bash
ssh admin@<asustor-ip>

# Update Portainer
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts

# Portainer serves the UI on HTTPS 9443 by default.
# Add -p 9000:9000 only if you explicitly need legacy HTTP access.
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /volume1/Docker/portainer:/data \
  portainer/portainer-ce:lts
```

## Conclusion

Portainer transforms your ASUSTOR NAS into a capable container management platform. By storing data on the NAS volume, your Portainer configuration is part of your existing backup strategy. The Docker restart policy ensures Portainer comes back up automatically after reboots or power failures.
