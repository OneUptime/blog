# How to Fix Missing Stacks After Portainer Database Corruption - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Database, Recovery, Stack

Description: Recover missing stacks and configuration after Portainer's BoltDB database becomes corrupted, including database repair and data recovery techniques.

## Introduction

Portainer uses BoltDB (an embedded key-value database) to store all configuration, including stack definitions, user accounts, environment settings, and access control rules. If this database becomes corrupted - for example due to a truncated file, full disk, or storage/filesystem failure - stacks and other configuration disappear. This guide explains recovery options.

## Step 1: Identify Database Corruption

```bash
# Check Portainer logs for BoltDB errors

docker logs portainer 2>&1 | grep -iE "corrupt|bolt|database|invalid|panic" | head -20

# Common corruption indicators:
# "invalid database"
# "unexpected page type"
# "page 0: can't read page: unexpected EOF"
```

## Step 2: Check the Database File

```bash
# Check if the file exists and its size
docker run --rm \
  -v portainer_data:/data \
  alpine stat /data/portainer.db

# A zero-byte or very small portainer.db can indicate corruption or truncation
# Normal size: a few MB (varies with number of stacks/users/etc)

# Record a checksum before attempting recovery
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c "ls -lh /data/ && md5sum /data/portainer.db"
```

## Step 3: Stop Portainer Before Attempting Recovery

```bash
# IMPORTANT: Stop Portainer before any database operations
# Writing to a corrupt database can make it worse
docker stop portainer
```

## Step 4: Backup the Corrupt Database

```bash
# Always backup before attempting repairs
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine cp /data/portainer.db /backup/portainer.db.corrupt.$(date +%Y%m%d%H%M%S)

echo "Backup saved to /tmp/portainer.db.corrupt.*"
```

## Step 5: Attempt BoltDB Repair

BoltDB has built-in consistency checking. Use the `bbolt` tool to verify the file and, if it opens cleanly, compact it into a new file:

```bash
# Install bbolt (bbolt is the successor to bolt)

# Option A: Use a temporary container to install and run bbolt
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c "
    apk add --no-cache go &&
    go install go.etcd.io/bbolt/cmd/bbolt@latest &&
    /root/go/bin/bbolt check /data/portainer.db
  "

# Option B: Download a release binary from:
# https://github.com/etcd-io/bbolt/releases
# Run: bbolt check portainer.db
# If check passes, the database opens cleanly
# If you want to rewrite it into a new file, use:
# bbolt compact -o repaired.db portainer.db
```

## Step 6: Restore from Backup

The best recovery is from a known-good backup:

```bash
# Stop Portainer
docker stop portainer

# If you have a raw portainer.db backup, restore it in place
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c "
    cp /data/portainer.db /data/portainer.db.corrupt.$(date +%Y%m%d%H%M%S) 2>/dev/null || true
    cp /data/backups/portainer.db.bak /data/portainer.db
  "

# Start Portainer
docker start portainer

# If you have a Portainer-generated tar.gz configuration backup instead,
# restore it on a fresh Portainer instance during the initial setup screen.
# Do not extract the tar.gz manually into /data.
```

## Step 7: Recreate Stacks from Running Containers

If no backup exists but Docker workloads are still running:

```bash
# Docker Standalone / Compose-based stacks
docker compose ls --all --format json

docker ps \
  --filter "label=com.docker.compose.project" \
  --format '{{.Names}}: {{.Label "com.docker.compose.project"}} / {{.Label "com.docker.compose.service"}}' \
  | sort

# Docker Swarm stacks (run on a manager node)
docker stack ls
docker stack services STACK_NAME
```

## Step 8: Reset Portainer and Re-Add Everything

If recovery is not possible:

```bash
# Delete the corrupt database
docker run --rm \
  -v portainer_data:/data \
  alpine rm /data/portainer.db

# Start Portainer - it will initialize fresh
docker start portainer

# Portainer is now fresh - re-add:
# 1. Environments (Docker hosts, Kubernetes clusters)
# 2. Users and teams
# 3. Registries
# 4. Stacks (re-create from compose files if you have them)
```

## Step 9: Recover Stack Definitions

If you stored compose files in Git (recommended):

```bash
# Stack definitions were version-controlled
cd /opt/stacks-git
git log --oneline | head -20
git checkout HEAD -- .

# Re-deploy stacks via Portainer UI or CLI
docker compose -f mystack.yml up -d
```

If not in Git, use `docker inspect` to reconstruct:

```bash
# For each container in the stack
for CONTAINER in $(docker ps --format "{{.Names}}" | grep "stackname"); do
  echo "=== $CONTAINER ==="
  docker inspect $CONTAINER | jq '.[0] | {
    Image: .Config.Image,
    Env: .Config.Env,
    Ports: .HostConfig.PortBindings,
    Volumes: .HostConfig.Binds,
    Networks: [.NetworkSettings.Networks | keys[]]
  }'
done
```

## Step 10: Prevent Future Corruption

```bash
# 1. Enable live-restore so standalone containers stay running if the Docker daemon restarts
# Add "live-restore": true to /etc/docker/daemon.json, preserving any existing settings
sudoedit /etc/docker/daemon.json
# Minimal file if it does not already exist:
# {
#   "live-restore": true
# }

sudo systemctl reload docker

# 2. Use UPS or host-level graceful shutdown procedures
# live-restore does not protect against power loss, and it does not apply to Swarm services

# 3. Set up automated backups (see backup posts in this series)

# 4. Use a volume on reliable storage
```

## Conclusion

Portainer database corruption is serious but recoverable if you have backups. Without backups, the containers continue running independently of Portainer's database, so your workloads are safe - only the Portainer management metadata is lost. Prevent future issues by setting up automated backups of the `portainer_data` volume and using reliable storage. If you're running Portainer as a standalone container, `live-restore` can also reduce disruption during Docker daemon restarts, but it is not a substitute for backups.
