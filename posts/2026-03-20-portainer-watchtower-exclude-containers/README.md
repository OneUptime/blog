# How to Exclude Containers from Watchtower Updates via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Exclusion, Auto-Update, Configuration

Description: Learn the different methods to exclude specific containers from Watchtower automatic updates when managing your infrastructure through Portainer, protecting critical services from unplanned restarts.

## Introduction

Not every container should be auto-updated. Databases with data migrations, containers in production during business hours, or management tools like Portainer itself all benefit from manual update control. Watchtower provides multiple exclusion mechanisms: label-based, name-based filtering, and the global label-enable mode. This guide covers all exclusion methods with real-world examples.

## Prerequisites

- Watchtower deployed as a Portainer stack
- Containers managed through Portainer
- Understanding of which containers should and shouldn't auto-update

## Step 1: Label-Based Exclusion (Recommended)

The cleanest method - add a label to any container you want to exclude:

```yaml
# In any Portainer stack

services:
  postgres:
    image: postgres:15-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
    labels:
      # This label prevents Watchtower from ever updating this container
      - "com.centurylinklabs.watchtower.enable=false"

  portainer:
    image: portainer/portainer-ce:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "com.centurylinklabs.watchtower.enable=false"    # Protect Portainer

volumes:
  db_data:
  portainer_data:
```

## Step 2: Add Exclusion Label to Running Container

If a container is already running without the exclusion label, you need to recreate it with the label or update the Portainer stack and redeploy:

```bash
# Method 1: For standalone containers, stop, remove, and recreate with the label
docker stop postgres
docker rm postgres
docker run -d \
  --name postgres \
  --label "com.centurylinklabs.watchtower.enable=false" \
  -v db_data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:15-alpine

# Method 2: For Portainer-managed stacks, update the stack definition
# Edit the stack in Portainer to add the label, then redeploy
```

## Step 3: Name-Based Container Exclusion

Exclude containers by their actual container names without adding labels to each one:

```yaml
# Watchtower stack configuration
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: "86400"
      WATCHTOWER_CLEANUP: "true"
      # Exclude specific container names (comma-separated)
      WATCHTOWER_DISABLE_CONTAINERS: "postgres,portainer,redis-master,watchtower"
```

Or use an include list instead of an exclude list:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    # Specify which actual container names to watch (include list instead of exclude)
    # This updates ONLY nginx and myapp:
    command: --interval 3600 --cleanup nginx myapp
```

## Step 4: Opt-In Mode (Safest for Production)

Instead of opt-out (exclude specific), use opt-in (must explicitly include):

```yaml
# Watchtower: only update containers with watchtower.enable=true
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_LABEL_ENABLE: "true"    # Opt-in mode
      WATCHTOWER_POLL_INTERVAL: "86400"
      WATCHTOWER_CLEANUP: "true"
```

```yaml
# Containers without the label are NOT updated
services:
  # Updated: has opt-in label
  nginx:
    image: nginx:alpine
    labels:
      - "com.centurylinklabs.watchtower.enable=true"    # Explicitly included

  # NOT updated: no label (in opt-in mode)
  postgres:
    image: postgres:15
    # No Watchtower labels - excluded by default in opt-in mode

  # NOT updated: explicitly excluded
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=false"    # Redundant in opt-in mode but explicit
```

## Step 5: Time-Based Exclusion

Prevent updates during business hours using a schedule:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Only update at 2 AM on weekdays
      WATCHTOWER_SCHEDULE: "0 0 2 * * 1-5"    # Mon-Fri at 02:00
      TZ: "America/New_York"
```

For containers that should never be updated automatically (only during maintenance windows), combine the time-based schedule with exclusion labels for the most critical services.

## Step 6: Exclude Watchtower Itself

Watchtower can accidentally update itself. While it generally handles self-updates gracefully, you may want to pin the version and exclude the Watchtower container itself:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:1.7.1    # Pin to specific version
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: "86400"
    labels:
      - "com.centurylinklabs.watchtower.enable=false"    # Don't self-update
```

## Step 7: Verify Exclusions Are Working

```bash
# Check Watchtower logs to confirm containers are being skipped
docker logs watchtower 2>&1 | grep -i "skip\|ignor\|exclud"

# Run a one-off check with debug logging
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --run-once \
  --debug
# Shows which containers are checked vs skipped
```

## Step 8: Audit Which Containers Are Excluded

```bash
#!/bin/bash
# audit-watchtower-exclusions.sh

echo "=== Container Watchtower Update Status ==="
echo ""
echo "Excluded containers (com.centurylinklabs.watchtower.enable=false):"
docker ps -a --format '{{.Names}}' | while read name; do
  LABEL=$(docker inspect "$name" | jq -r '.[0].Config.Labels["com.centurylinklabs.watchtower.enable"] // "not-set"')
  if [ "$LABEL" = "false" ]; then
    echo "  EXCLUDED: $name"
  fi
done

echo ""
echo "Opted-in containers (com.centurylinklabs.watchtower.enable=true):"
docker ps -a --format '{{.Names}}' | while read name; do
  LABEL=$(docker inspect "$name" | jq -r '.[0].Config.Labels["com.centurylinklabs.watchtower.enable"] // "not-set"')
  if [ "$LABEL" = "true" ]; then
    echo "  INCLUDED: $name"
  fi
done
```

## Conclusion

Excluding containers from Watchtower is critical for protecting stateful services, databases, and management tools like Portainer from unplanned restarts. The `com.centurylinklabs.watchtower.enable=false` label is the most portable exclusion method since it travels with the container definition. For large teams where containers are frequently added, opt-in mode (`WATCHTOWER_LABEL_ENABLE=true`) provides the safest default by requiring explicit inclusion rather than explicit exclusion of each new container.
