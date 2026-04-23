# How to Restore Portainer from a Backup - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Restore, Docker, Disaster Recovery

Description: Step-by-step guide to restoring Portainer from a backup archive or database file after data loss or a failed upgrade.

---

Whether you're recovering from a failed upgrade, migrating to a new server, or restoring after data loss, Portainer can be restored from a backup archive in minutes.

## Prerequisites

- A valid backup archive (`.tar.gz`) or database file (`.db`)
- Portainer stopped or not yet installed on the target host
- Docker running on the target host

## Restore from a Tar Archive Backup

### Step 1: Stop Portainer

```bash
# Stop the running Portainer container (if it exists)

docker stop portainer 2>/dev/null || true
docker container rm portainer 2>/dev/null || true
```

### Step 2: Clear or Create the Data Volume

```bash
# Option A: Clear existing volume (if restoring over a broken install)
docker volume rm portainer_data 2>/dev/null || true
docker volume create portainer_data

# Option B: Create fresh volume (new server)
docker volume create portainer_data
```

### Step 3: Restore the Backup Archive

```bash
# Restore the tar archive into the portainer_data volume
# Replace portainer_backup_20260320.tar.gz with your actual backup filename
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)/backups":/backup \
  alpine \
  tar xzf /backup/portainer_backup_20260320.tar.gz -C /data

echo "Restore complete. Verifying..."

# Verify key files are present
docker run --rm \
  -v portainer_data:/data \
  alpine \
  ls -la /data/
```

### Step 4: Start Portainer

```bash
# Start Portainer pointing to the restored volume
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Restore Just the Database File

If you only backed up the `portainer.db` file:

```bash
# Stop Portainer
docker stop portainer

# Copy the backup database into the volume
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine \
  cp /backup/portainer_20260320.db /data/portainer.db

# Set correct permissions on the database file
docker run --rm \
  -v portainer_data:/data \
  alpine \
  chmod 600 /data/portainer.db

# Restart Portainer
docker start portainer
```

## Restore via Portainer API

On a fresh, uninitialized Portainer instance, restore using the API:

```bash
# Restore from a Portainer backup archive
# Omit the password field if the backup was not encrypted
curl -X POST \
  https://localhost:9443/api/restore \
  -H "Content-Type: multipart/form-data" \
  -F "file=@portainer_backup_20260320.tar.gz" \
  -F "password=optionalEncryptionPassword" \
  --insecure
```

## Verify the Restore

After starting Portainer, log in and check:

1. Navigate to `https://localhost:9443`
2. Log in with existing admin credentials from the backup
3. Verify **Environments** are listed correctly
4. Check **Stacks** are visible and in the expected state

```bash
# Confirm the database file exists and has content
docker run --rm -v portainer_data:/data alpine ls -lh /data/portainer.db
```

---

*Use [OneUptime](https://oneuptime.com) to monitor Portainer availability and get alerted when it goes offline.*
