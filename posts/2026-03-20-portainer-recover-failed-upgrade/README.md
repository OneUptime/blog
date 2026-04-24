# How to Recover Portainer After a Failed Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Upgrade, Recovery, Troubleshooting, Rollback, Administration

Description: Learn how to recover Portainer after a failed upgrade by rolling back to the previous version or restoring from a pre-upgrade backup.

---

A failed Portainer upgrade can leave the UI inaccessible or the database unusable. This guide provides step-by-step recovery procedures.

The examples below use Portainer's current default ports: `9443` for HTTPS and `8000` for the Edge Agent tunnel server. Add `-p 9000:9000` only if you intentionally keep legacy HTTP enabled.

## Signs of a Failed Upgrade

```bash
# Check Portainer logs for migration-related failures
docker logs portainer 2>&1 | grep -Ei "migrat|panic|fatal|error|bolt"
```

## Option 1: Roll Back to Previous Image Version

If you have a backup:

```bash
# 1. Stop the broken Portainer
docker stop portainer && docker rm portainer

# 2. Restore the pre-upgrade data volume backup
docker volume rm portainer_data
docker volume create portainer_data
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine sh -c 'tar xzpf /backup/portainer-pre-upgrade.tar.gz -C /data'

# 3. Start the previous version
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<previous-version>   # Use the exact version that was working before the upgrade
```

## Option 2: Restore the Automatic Database Backup

If you do not have a manual backup, Portainer keeps an automatic backup of `portainer.db` during the upgrade:

```bash
# Stop Portainer but keep the data volume
docker stop portainer && docker rm portainer

# Restore the automatic database backup created during the upgrade
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c 'if [ -f /data/portainer.db ]; then \
                  mv /data/portainer.db /data/portainer.db.failed-upgrade; \
                fi && \
                cp /data/backups/portainer.db.bak /data/portainer.db'

# Start the previous version again
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<previous-version>   # Must match the version of the restored database backup
```

## Option 3: Retry the Migration with Debug Logging

If the failure was caused by a transient issue, retrying with debug logging can help identify the exact error:

```bash
docker stop portainer && docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<target-version> \
  --log-level DEBUG

# Watch for migration progress or the specific error
docker logs -f portainer
```

## Prevention: Always Backup Before Upgrading

```bash
# Pre-upgrade backup script
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine sh -c 'cd /data && tar czpf /backup/portainer-pre-upgrade.tar.gz .'
echo "Backup ready. Proceeding with upgrade..."
```
