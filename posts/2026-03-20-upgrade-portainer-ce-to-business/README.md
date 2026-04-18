# How to Upgrade from Portainer CE to Business Edition - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Upgrade, Business Edition, Migration

Description: Step-by-step instructions for upgrading an existing Portainer Community Edition installation to Business Edition while preserving all data and configuration.

---

Upgrading from Portainer CE to Business Edition is a straightforward process that replaces the container image while keeping your existing data volume intact. All environments, stacks, users, and settings are preserved.

## Before You Begin

Back up your Portainer data volume before proceeding:

```bash
# Create a backup tar of the Portainer data volume before upgrading

docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/portainer_backup_$(date +%Y%m%d).tar.gz -C /data .
```

## Step 1: Stop and Remove the CE Container

The upgrade process replaces only the container, not the data volume:

```bash
# Stop the running Portainer CE container
docker stop portainer

# Remove the container (data volume is NOT deleted)
docker container rm portainer
```

## Step 2: Pull the Business Edition Image

```bash
# Pull the latest Portainer Business Edition image
docker pull portainer/portainer-ee:latest
```

## Step 3: Start Portainer Business Edition

Use the same volume and port configuration as your previous CE installation:

```bash
# Start Portainer BE pointing to the same data volume
# The existing data from CE will be automatically migrated
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest
```

## Step 4: Activate the License

1. Navigate to `https://localhost:9443`
2. Log in with your existing admin credentials
3. Portainer will prompt you to enter a Business Edition license key
4. Enter your license key and click **Activate**

If you don't have a license, visit portainer.io to register for a free 3-node license.

## Verify the Upgrade

After logging in, check the Portainer version and license status:

```bash
# Confirm the BE image is running
docker inspect portainer --format '{{.Config.Image}}'
# Expected: portainer/portainer-ee:latest
```

In the UI, navigate to **Settings > About** to confirm the Business Edition version is shown.

## Rollback (if needed)

If you need to roll back to CE:

```bash
# Stop BE container
docker stop portainer && docker container rm portainer

# Restart with CE image - data volume is compatible
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

---

*Keep your infrastructure monitored with [OneUptime](https://oneuptime.com) uptime monitoring and alerting.*
