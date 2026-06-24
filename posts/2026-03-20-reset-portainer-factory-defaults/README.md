# How to Reset Portainer to Factory Defaults - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Administration, Reset, Factory Defaults, Recovery, Docker

Description: Learn how to completely reset Portainer to factory defaults by removing the data volume, while safely preserving your running containers and stacks.

---

A factory reset of Portainer wipes all users, settings, registries, and environment configurations. The underlying Docker containers and services keep running because they live in Docker, not in Portainer's database, but Portainer's own stack definitions and metadata are deleted with the data volume. This is useful after a corrupted database or when re-deploying from scratch.

## What Gets Deleted vs. What Is Preserved

| Deleted (Portainer Data) | Preserved (Docker) |
|---|---|
| Admin and user accounts | Running containers and services |
| Registered environments | Docker volumes |
| Stack configurations | Docker networks |
| Registry credentials | Docker images |
| Team and role settings | Compose labels on containers |
| OAuth/LDAP configuration | |

## Step 1: Back Up Before Resetting (Optional)

```bash
# Create a backup of the current Portainer data volume

docker run --rm -v portainer_data:/data alpine \
  tar czf - /data > portainer-backup-$(date +%Y%m%d-%H%M%S).tar.gz

# Store this off-host in case you need to recover
```

## Step 2: Stop and Remove Portainer

```bash
# Stop the Portainer container
docker stop portainer

# Remove the container (not the data volume yet)
docker rm portainer
```

## Step 3: Delete the Data Volume

```bash
# Remove the Portainer data volume - this is the factory reset
docker volume rm portainer_data

# Verify it is gone
docker volume ls --filter name=portainer_data
```

## Step 4: Redeploy Portainer

```bash
# Create a fresh Portainer deployment
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Complete Initial Setup

Open `https://<host>:9443` and create a new admin account. Portainer will automatically detect the local environment during the setup wizard.

## Step 6: Re-link Running Containers to Portainer

Your containers are still running. To manage them via Portainer:

1. During the initial setup wizard, Portainer automatically detects and adds the local environment.
2. After setup completes, Portainer will show your running containers in that environment.
3. If you previously deployed stacks through Portainer, re-deploy them from their Compose files if you want Portainer to manage them again.

## Partial Reset: Reset Admin Password Only

If you only need to reset the admin password (not a full factory reset):

```bash
docker stop portainer
docker pull portainer/helper-reset-password
docker run --rm -v portainer_data:/data portainer/helper-reset-password
docker start portainer
```
