# How to Deploy Restic with REST Server via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Restic, Backup, Docker, Self-Hosted

Description: Deploy Restic backup client with REST Server backend using Portainer for fast, encrypted, deduplicated backups.

## Introduction

Restic is a fast, secure backup program. It supports multiple backends (S3, SFTP, REST, local) and provides content-addressed, deduplicated, encrypted backups. This guide deploys the Restic REST Server as a backup destination and runs Restic as a backup client container.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Restic + REST Server

services:
  rest-server:
    image: restic/rest-server:0.13.0
    container_name: restic_rest_server
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - restic_repos:/data
      - /opt/restic/htpasswd:/data/.htpasswd:ro
    environment:
      - OPTIONS=--private-repos
    networks:
      - restic_net

  restic-client:
    image: restic/restic:0.16.4
    container_name: restic_client
    restart: unless-stopped
    volumes:
      - /var/lib/docker/volumes:/source:ro    # Source data to back up
      - restic_cache:/root/.cache/restic
    environment:
      - RESTIC_REPOSITORY=rest:http://restic:${REST_SERVER_PASSWORD}@rest-server:8000/restic/backups
      - RESTIC_PASSWORD=${RESTIC_PASSWORD}
    entrypoint: /bin/sh -c "until restic snapshots || restic init; do sleep 5; done; while true; do restic backup /source --tag docker-volumes; restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune; sleep 86400; done"
    depends_on:
      - rest-server
    networks:
      - restic_net

volumes:
  restic_repos:
  restic_cache:

networks:
  restic_net:
    driver: bridge
```

## Step 2: Create the htpasswd File

```bash
# Create credentials for the REST Server
mkdir -p /opt/restic
docker run --rm httpd:alpine htpasswd -Bbn restic your-restic-password > /opt/restic/htpasswd
```

## Step 3: Set Environment Variables in Portainer

```text
REST_SERVER_PASSWORD=your-restic-password   # REST Server HTTP auth password
RESTIC_PASSWORD=your-repo-encryption-password  # Restic repository encryption password
```

## Step 4: Initialize and Run Backups Manually

```bash
# Initialize the repository if it does not exist yet
docker exec restic_client sh -c 'restic snapshots >/dev/null 2>&1 || restic init'

# Run a backup
docker exec restic_client restic backup /source --tag docker-volumes

# List snapshots
docker exec restic_client restic snapshots

# Check repository integrity
docker exec restic_client restic check
```

## Step 5: Restore from a Snapshot

```bash
# List files in the latest snapshot
docker exec restic_client restic ls latest

# Restore the latest snapshot to /tmp/restore
docker exec restic_client restic restore latest --target /tmp/restore

# Restore a specific path
docker exec restic_client restic restore latest \
  --include /source/myapp_data \
  --target /tmp/restore
```

## Step 6: Prune Old Snapshots

```bash
# Keep 7 daily, 4 weekly, 6 monthly snapshots and remove the rest
docker exec restic_client restic forget \
  --keep-daily 7 --keep-weekly 4 --keep-monthly 6 \
  --prune
```

## Conclusion

Restic encrypts all data before sending it to the backend using AES-256-CTR with Poly1305-AES authentication. The `RESTIC_PASSWORD` unlocks the repository encryption; if lost, data is unrecoverable. The REST Server's `--private-repos` flag ensures each user can only access repositories under their own URL prefix, such as `/restic/backups`. This example uses HTTP Basic Authentication over plain HTTP, so add TLS or keep the service on a trusted network before exposing it beyond your LAN. For automated backups, replace the sleep loop with a cron-based container like `restic-cron` or a Kubernetes CronJob.
