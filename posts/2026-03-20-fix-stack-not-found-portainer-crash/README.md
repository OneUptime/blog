# How to Fix 'Stack Not Found' After a Portainer Crash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Stack, Recovery, Database, Crash

Description: Learn how to recover from 'Stack Not Found' errors after a Portainer crash by restoring stack metadata from the database or re-importing running stacks.

---

Because Portainer stores its configuration separately from the Docker workloads it manages, a crash or failed upgrade can leave Portainer unable to find a stack even though the containers are still running. This guide covers supported recovery options.

## Understanding the Problem

Portainer stores its configuration in the BoltDB database (`portainer.db`) inside the `/data` volume. Stack definitions created in Portainer are part of that configuration, while the actual running containers continue to exist in Docker independently of Portainer.

## Step 1: Verify Containers Are Still Running

```bash
# Check if your stack containers are still running despite the error

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# List Docker-managed networks (Compose usually creates a project-specific network)
docker network ls --filter name=<stack-name>
```

## Step 2: Check Portainer Logs

```bash
docker logs portainer --tail 50 | grep -Ei "stack|error|database"
```

## Step 3: Restore from Backup

If you have a Portainer backup:

1. Stop and remove the current Portainer container, then start a fresh Portainer instance with an empty data volume.
2. On the initialization page, expand **Restore Portainer from backup**.
3. Select the `.tar.gz` backup file, enter the password if it was encrypted, and click **Restore Portainer**.

Portainer will restore its saved configuration, including stack definitions created in Portainer.

## Step 4: Re-associate Orphaned Stacks

If the crash forced you to remove and re-add the Docker environment in Portainer, the stacks may appear as orphaned instead of missing:

1. In the recovered environment, go to **Stacks**.
2. Click the three dots in the top right and select **Show all orphaned stacks**.
3. Open the stack and click **Associate**.

This reconnects the existing stack record to the recreated environment.

## Step 5: Restore `portainer.db.bak` for Failed Upgrades

If the crash occurred during a Portainer upgrade:

```bash
# Stop and remove Portainer, but keep the portainer_data volume
docker stop portainer
docker rm portainer

# Restore the automatic database backup created during the upgrade
docker run --rm -v portainer_data:/data alpine sh -c '
  cd /data &&
  mv portainer.db portainer.db.oldversion &&
  cp backups/portainer.db.bak portainer.db
'

# Start the previous Portainer version
docker run -d \
  -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<previous-version>
```

The Portainer image version must match the version that created `backups/portainer.db.bak`.

## Prevention: Back Up Before Updates

Use **Settings > Back up Portainer** to download a `.tar.gz` backup before updates. This is the backup format Portainer documents for restore during initial setup.
