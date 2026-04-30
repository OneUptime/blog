# How to Fix Missing Stacks After Portainer Database Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Database Corruption, BoltDB, Stack, Recovery

Description: Learn how to recover missing stacks after Portainer's BoltDB database becomes corrupted, including inspection, partial recovery, and prevention strategies.

---

Portainer uses BoltDB for persistent storage. Power failures, OOM kills, or disk errors can corrupt the database file, causing all stacks, users, and settings to disappear after restart. This guide covers recovery strategies.

## Detecting Database Corruption

```bash
# Check Portainer logs for BoltDB errors

docker logs portainer 2>&1 | grep -i "bolt\|corrupt\|database\|unexpected"

# Common corruption messages:
# "unexpected end of file"
# "bolt: database file might be corrupted"
# "panic: db file size has grown without permission"
```

## Step 1: Attempt BoltDB Consistency Check

```bash
# If database encryption is enabled, use /data/portainer.edb instead of /data/portainer.db

# Run the bbolt CLI in a temporary container
docker run --rm -v portainer_data:/data golang:alpine \
  sh -lc 'go run go.etcd.io/bbolt/cmd/bbolt@latest check /data/portainer.db'

# Or install the bbolt CLI locally
go install go.etcd.io/bbolt/cmd/bbolt@latest
$(go env GOPATH)/bin/bbolt check /path/to/portainer.db

# Output will indicate if the file is consistent or not
```

## Step 2: Try to Salvage Data from Corrupted DB

```bash
# Inspect the page table if the file is still readable
docker run --rm -v portainer_data:/data golang:alpine \
  sh -lc 'go run go.etcd.io/bbolt/cmd/bbolt@latest pages /data/portainer.db | head -50'

# If the file opens, list readable top-level buckets
docker run --rm -v portainer_data:/data golang:alpine \
  sh -lc 'go run go.etcd.io/bbolt/cmd/bbolt@latest buckets /data/portainer.db'

# Portainer stores stack records in the "stacks" bucket
```

## Step 3: Recover from a Backup

The cleanest recovery path is from a raw backup of the `/data` volume. If you used Portainer's built-in `tar.gz` backup feature instead, restore it on a fresh instance during the initial setup flow.

```bash
# Stop Portainer
docker stop portainer

# Restore a raw /data backup into the volume
docker run --rm \
  -v portainer_data:/data \
  -v /path/to/backup:/backup \
  alpine \
  tar xzf /backup/portainer-backup.tar.gz -C /

# Start Portainer
docker start portainer
```

## Step 4: Rebuild by Re-deploying Stacks from Git

If stacks were deployed from Git repositories, recovery is straightforward:

1. Start Portainer fresh (new empty database).
2. Create an admin user.
3. Re-add environments.
4. Re-deploy each stack from its Git repository.

The containers and volumes are still running - only the Portainer metadata is lost.

## Step 5: Extract Compose from Running Containers

For stacks not stored in Git, use running container labels as a starting point to reconstruct the compose:

```bash
# List all containers with their compose project labels
docker ps -a --format '{{.Names}}' | while read name; do
  project=$(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null)
  [ -n "$project" ] && echo "Container: $name, Project: $project"
done
```

## Prevention Strategy

Schedule automated backups before this ever happens again:

```bash
# Add to crontab: daily backup at 2 AM
0 2 * * * docker run --rm -v portainer_data:/data alpine tar czf - /data \
  > /mnt/backups/portainer-$(date +\%Y\%m\%d).tar.gz
```
