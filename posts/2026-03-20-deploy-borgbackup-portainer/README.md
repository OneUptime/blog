# How to Deploy BorgBackup with Borgmatic via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, BorgBackup, Borgmatic, Backup, Docker

Description: Deploy BorgBackup with Borgmatic configuration management using Portainer for efficient deduplicated backups.

## Introduction

BorgBackup (Borg) is a deduplicating backup program with compression and encryption. Borgmatic is a wrapper that drives Borg via a YAML configuration file and handles scheduling. This guide runs Borgmatic in a Docker container managed by Portainer.

## Prerequisites

- Portainer installed with Docker
- A remote SSH backup server or local backup destination

## Step 1: Prepare Configuration on the Host

```bash
mkdir -p /opt/borgmatic/config /opt/borgmatic/ssh

# Create borgmatic config

cat > /opt/borgmatic/config/config.yaml << 'EOF'
source_directories:
    - /backup/source

repositories:
    - path: ssh://user@backup-server:22/~/backups/myserver
      label: remote

encryption_passphrase: "your-encryption-passphrase"
compression: zstd,3
archive_name_format: '{hostname}-{now:%Y-%m-%dT%H:%M:%S}'

keep_daily: 7
keep_weekly: 4
keep_monthly: 6

checks:
    - name: repository
    - name: archives
      frequency: 2 weeks
EOF

# Set strict permissions (borgmatic warns on insecure permissions)
chmod 600 /opt/borgmatic/config/config.yaml

# Copy SSH key for the backup server
cp ~/.ssh/id_ed25519 /opt/borgmatic/ssh/id_ed25519
chmod 600 /opt/borgmatic/ssh/id_ed25519
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Borgmatic backup
version: "3.8"

services:
  borgmatic:
    image: ghcr.io/borgmatic-collective/borgmatic:1.8.14
    container_name: borgmatic
    restart: unless-stopped
    volumes:
      - /opt/borgmatic/config:/etc/borgmatic.d:ro
      - /opt/borgmatic/ssh:/root/.ssh:ro
      - /var/lib/docker/volumes:/backup/source:ro   # Back up Docker volumes
      - borgmatic_cache:/root/.cache/borg
    environment:
      - TZ=UTC
      - BACKUP_CRON=0 2 * * *
    networks:
      - borgmatic_net

volumes:
  borgmatic_cache:

networks:
  borgmatic_net:
    driver: bridge
```

## Step 3: Initialize the Borg Repository

On the first run, initialize the repository:

```bash
docker exec borgmatic borgmatic repo-create --encryption repokey-blake2
```

## Step 4: Run a Manual Backup

```bash
# Create a backup now
docker exec borgmatic borgmatic create --verbosity 1

# List archives in the repository
docker exec borgmatic borgmatic list

# Check repository integrity
docker exec borgmatic borgmatic check
```

## Step 5: Restore from Backup

```bash
# List files in a specific archive
docker exec borgmatic borgmatic list --archive latest

# Extract a specific directory from the latest archive
docker exec borgmatic borgmatic extract --archive latest \
  --path /backup/source/important-data \
  --destination /tmp/restore
```

## Step 6: Monitor Backup Health

```bash
# Check borgmatic logs inside the container
docker logs borgmatic --tail 50

# View cron schedule (borgmatic runs borgmatic on the CRON schedule)
docker exec borgmatic crontab -l
```

## Conclusion

Borgmatic's `config.yaml` drives all Borg operations - creation, pruning, checking, and restoration. The container runs Borgmatic on a cron schedule defined via environment variables. Set `encryption_passphrase` in the config or use a passphrase file. Mount only the directories you need to back up as read-only volumes to limit exposure.
