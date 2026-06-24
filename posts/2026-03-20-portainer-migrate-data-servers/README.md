# How to Migrate Portainer Data Between Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Docker, Administration, Data Volume, Server Move

Description: Learn how to migrate the Portainer data volume from one server to another, preserving all users, stacks, registries, and environment configurations.

---

Migrating Portainer to a new server involves copying the data volume and re-deploying the Portainer container. The migration preserves the Portainer data stored in `/data`, including users, settings, stack definitions, registry credentials, and Edge metadata. It does not move the containers, images, volumes, or application data from the environments Portainer manages. If the Portainer server URL changes, existing Edge Agent deployments must be redeployed because the server URL is encoded into the Edge key.

## Step 1: Prepare the Source Server

```bash
# On the SOURCE server: stop Portainer for a consistent backup

docker stop portainer

# Create a backup archive of the data volume
docker run --rm \
  -v portainer_data:/data \
  alpine \
  tar czpf - /data > /tmp/portainer-migration-$(date +%Y%m%d).tar.gz

# Verify the backup
ls -lh /tmp/portainer-migration-*.tar.gz
tar tzf /tmp/portainer-migration-*.tar.gz | grep portainer.db
```

## Step 2: Transfer the Backup to the Destination Server

```bash
# Transfer using scp
scp /tmp/portainer-migration-20260320.tar.gz user@new-server:/tmp/

# Or use rsync for large files with progress
rsync -avz --progress /tmp/portainer-migration-20260320.tar.gz user@new-server:/tmp/
```

## Step 3: Restore on the Destination Server

```bash
# On the DESTINATION server

# Create the Docker volume
docker volume create portainer_data

# Restore the backup into the volume
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine \
  tar xzpf /backup/portainer-migration-20260320.tar.gz -C /

# Verify files are present
docker run --rm -v portainer_data:/data alpine ls -la /data
```

## Step 4: Deploy Portainer on the New Server

```bash
# Use the same tag/version that is running on the source server
PORTAINER_TAG="lts"

docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:${PORTAINER_TAG}
```

## Step 5: Post-Migration Tasks

After migration:

1. **Log in** with your existing admin credentials.
2. **Update environment URLs** if agent host IPs changed.
3. **Redeploy Edge Agents** if the Portainer server URL, IP, or DNS name changed.
4. **Test agent connectivity** for each environment.
5. **Verify stacks** are visible and can be deployed.
6. **Update DNS** to point to the new server.

## Step 6: Clean Up Old Server

```bash
# After confirming the migration is successful
# Remove the old Portainer container and data from the source server
docker stop portainer && docker rm portainer
docker volume rm portainer_data
```
