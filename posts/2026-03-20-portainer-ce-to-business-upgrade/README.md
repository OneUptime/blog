# How to Upgrade from Portainer CE to Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Upgrade, Business-edition, Migration, License

Description: A step-by-step guide to upgrading from Portainer Community Edition to Portainer Business Edition, preserving all your data and configuration.

## Overview

Upgrading from Portainer CE to Business Edition is straightforward because Portainer supports switching from the CE image to the BE image without losing your existing data. The upgrade involves switching the Docker image from `portainer-ce` to `portainer-ee` and entering your license key. Your existing environments, stacks, accounts, and most settings remain in place after the upgrade.

## Prerequisites

- Portainer CE currently installed
- Portainer Business Edition license key
- Backup of your Portainer data (recommended before any upgrade)

## Step 1: Backup Your Portainer Data

Before upgrading, create a backup of your Portainer data volume:

```bash
# Create a backup of the Portainer data volume

docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/portainer-backup-$(date +%Y%m%d).tar.gz -C /data .

# Verify backup was created
ls -lh portainer-backup-*.tar.gz
```

## Step 2: Note Your Current Configuration

```bash
# Document your current Portainer container settings
docker inspect portainer --format='{{.Config.Cmd}}'
docker inspect portainer --format='{{json .HostConfig.PortBindings}}'
docker inspect portainer --format='{{json .HostConfig.Binds}}'

# Save the image name for reference
docker inspect portainer --format='{{.Config.Image}}'
# Output: portainer/portainer-ce:latest
```

## Step 3: Pull the Business Edition Image

```bash
# Pull the Portainer Business Edition image
docker pull portainer/portainer-ee:latest

# Verify the image was pulled
docker images | grep portainer-ee
```

## Step 4: Stop and Remove CE Container

```bash
# Stop the running CE container
docker stop portainer

# Remove the CE container (data volume is NOT deleted)
docker rm portainer
```

## Step 5: Start Portainer Business Edition

```bash
# Start Portainer BE using the SAME volume (portainer_data)
# This is what preserves your Portainer data
# and switches the image from portainer-ce to portainer-ee
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest
```

## Step 6: Activate Your License

1. Open `https://your-server:9443` in your browser
2. Log in with your admin credentials (these are preserved from CE)
3. You'll be prompted to enter your license key
4. Enter the license key from your email
5. Click "Submit"

Portainer will verify the license and enable all Business Edition features.

## Step 7: Verify the Upgrade

```bash
# Check Portainer BE is running
docker ps | grep portainer

# Check logs for any errors
docker logs portainer

# Verify the edition in the UI
# Portainer UI → verify "Business Edition" appears in the bottom-left corner
```

## What's Preserved During Upgrade

All of the following is preserved:

- Admin and user accounts
- Environment/endpoint configurations
- Stacks and their configurations
- Volumes and networks
- Container configurations
- Registry configurations
- Custom templates
- User settings and preferences

## What Changes After Upgrade

- New BE features become available in the UI
- License-locked features (RBAC, LDAP, audit logging) can now be configured
- Existing users with the Standard User role are changed to the Read-Only User role during the upgrade
- "Business Edition" appears in the bottom-left corner of the UI

## Rollback to CE (if needed)

If you need to roll back, and this instance was originally upgraded from CE to BE, back up your data, stop BE, roll back the Portainer database, then start CE again:

```bash
# Stop and remove BE container
docker stop portainer
docker rm portainer

# Roll the database back to the CE format
docker run -it --name portainer-database-rollback \
  -v portainer_data:/data \
  portainer/portainer-ee:latest --rollback-to-ce

# Start CE container (data is still in the volume)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Upgrade via Docker Compose

If you're using Docker Compose:

```yaml
# Update docker-compose.yml - change one line:
services:
  portainer:
    image: portainer/portainer-ee:latest  # Changed from portainer-ce to portainer-ee
    # ... rest remains the same
```

```bash
docker compose pull
docker compose up -d
```

## Conclusion

Upgrading from Portainer CE to Business Edition is a low-risk process because Portainer reuses your existing data volume during the upgrade. The key steps are: backup your data, stop the CE container, start the BE container using the same volume, and activate your license. Your existing configuration is available in Portainer BE, with new enterprise features unlocked according to your license tier.
