# How to Migrate Portainer Data to a New Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Docker, Backup, DevOps, Server Management

Description: Learn how to safely back up and restore your Portainer configuration, environments, users, and stacks when moving to a new server.

---

Migrating Portainer to a new server means preserving your environments, user accounts, teams, registries, and stack definitions. Portainer stores all of this in a single data volume, making migration straightforward - but there are important steps to follow to avoid data loss or broken environment connections.

---

## What Lives in Portainer's Data Volume

Portainer's persistent data is stored in the `portainer_data` Docker volume, which contains:

- `portainer.db` - the main BoltDB database (users, environments, stacks, settings)
- `certs/` - TLS certificates
- `compose/` - stack files
- `docker_config/` - registry credentials

---

## Step 1: Stop Portainer on the Old Server

Always stop Portainer before copying its data to ensure a consistent backup.

```bash
# Stop the Portainer container (do NOT use --rm)

docker stop portainer

# Verify it has stopped
docker ps | grep portainer
```

---

## Step 2: Back Up the Portainer Data Volume

Use a temporary container to create a compressed archive of the data volume.

```bash
# Create a tar archive of the portainer_data volume
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/portainer-backup-$(date +%Y%m%d).tar.gz -C /data .

# Confirm the backup file was created
ls -lh portainer-backup-*.tar.gz
```

---

## Step 3: Transfer the Backup to the New Server

Use `scp` or `rsync` to transfer the backup securely.

```bash
# Transfer backup to the new server using scp
scp portainer-backup-20260320.tar.gz user@new-server:/home/user/

# Alternatively, use rsync for large files (resumes on interruption)
rsync -avz --progress portainer-backup-20260320.tar.gz user@new-server:/home/user/
```

---

## Step 4: Install Docker on the New Server

```bash
# Install Docker on the new server (Ubuntu)
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group
sudo usermod -aG docker $USER
```

---

## Step 5: Restore the Portainer Data on the New Server

On the new server, create the volume and restore your backup into it.

```bash
# Create the portainer_data volume on the new server
docker volume create portainer_data

# Restore the backup into the new volume
docker run --rm \
  -v portainer_data:/data \
  -v /home/user:/backup \
  alpine \
  tar xzf /backup/portainer-backup-20260320.tar.gz -C /data

# Verify the restore
docker run --rm \
  -v portainer_data:/data \
  alpine \
  ls -la /data
```

---

## Step 6: Start Portainer on the New Server

```bash
# Start Portainer with the restored data
docker run -d \
  --name portainer \
  --restart=always \
  -p 9000:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

---

## Step 7: Update Environment Endpoints

After migration, agent-based environments will still point to old addresses. Update them in the Portainer UI.

1. Go to **Environments** in the left sidebar
2. Click the environment to edit
3. Update the **Environment URL** field to the new agent address
4. Click **Update environment**

---

## Step 8: Verify Stacks and Users

Log in and confirm:

- [ ] All users and teams are present
- [ ] All environments are connected
- [ ] All stacks are listed (redeploy any that show as inactive)
- [ ] Registries and credentials are intact

---

## Summary

Portainer migration comes down to: stop, archive the data volume, transfer, restore, start. The single `portainer.db` file contains your entire configuration, making it a reliable unit of backup and restore. Always update environment endpoint URLs after moving to a new host.
