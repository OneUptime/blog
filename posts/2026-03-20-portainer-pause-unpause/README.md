# How to Pause and Unpause Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Operation, DevOps

Description: Learn how to pause and unpause Docker containers in Portainer to temporarily freeze container execution without stopping or losing its state.

## Introduction

Pausing a container is different from stopping it. On Linux, when paused, the container's processes are frozen using the `cgroup freezer` mechanism - they stop executing but remain in memory with their state intact. Unpausing resumes execution where it left off. This is useful for maintenance, debugging, and performance isolation. On Windows, Docker only supports pausing Hyper-V containers.

## Prerequisites

- Portainer installed with a connected Docker environment
- Running containers

## How Docker Pause Works

On Linux, the pause mechanism uses the `cgroup freezer` mechanism:

```text
Normal state:     Container processes executing → freeze state: not frozen
Paused state:     Container processes frozen    → freeze state: frozen
Unpaused state:   Container processes resume    → freeze state: not frozen
```

When paused:
- Processes are suspended (no CPU time allocated).
- Memory contents are preserved.
- Open file handles remain open.
- The application stops processing network traffic; existing connections may remain open but can time out.
- The container appears as **Paused** in Portainer.

## Step 1: Pause a Container

### Via the Container List

1. Navigate to **Containers** in Portainer.
2. Find the running container.
3. Click the **Pause** button (two vertical bars icon).

### Via the Container Details Page

1. Click on the container name.
2. Look for the **Pause** button in the action bar.

```bash
# Equivalent Docker CLI:

docker pause my-container

# Verify the container is paused:
docker ps --filter name=my-container
# Status shows: Up X minutes (Paused)
```

## Step 2: Unpause a Container

### Via the Container List

1. Find the paused container (shown with "Paused" status).
2. Click the **Unpause** button (or Resume button).

### Via the Container Details Page

1. Click on the paused container.
2. Click **Unpause**.

```bash
# Equivalent Docker CLI:
docker unpause my-container
```

## When to Use Pause vs. Stop

| Scenario | Action | Why |
|----------|--------|-----|
| Temporary maintenance | **Pause** | Fast resume, no data loss |
| Reducing load during peak hours | **Pause** | Release CPU without losing state |
| Debugging a running container's state | **Pause** | Freeze state for inspection |
| Short filesystem-level copy | **Pause** | Reduces in-flight writes; app-native backup tools may still be required |
| Shutting down permanently | **Stop** | Clean shutdown with SIGTERM |
| Applying configuration changes | **Recreate** | New container with new config |

## Use Case 1: Short Filesystem-Level Backup Window

Pause a stateful container to reduce in-flight writes while taking a filesystem-level copy of a named volume. For databases, prefer database-native backup tools or storage-level snapshots.

```bash
#!/bin/bash
# Backup script: pause container, back up a named volume, unpause

CONTAINER="stateful-app"
VOLUME_NAME="myapp_data"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

# Pause the container to reduce writes during the copy
echo "Pausing ${CONTAINER}..."
docker pause "${CONTAINER}"
trap 'docker unpause "${CONTAINER}" >/dev/null 2>&1 || true' EXIT

# Back up the named volume using a temporary helper container
echo "Backing up ${VOLUME_NAME}..."
docker run --rm \
    -v "${VOLUME_NAME}:/volume:ro" \
    -v "${BACKUP_DIR}:/backup" \
    ubuntu \
    tar -czf "/backup/${VOLUME_NAME}-${TIMESTAMP}.tar.gz" -C /volume .

# Resume the container
echo "Unpausing ${CONTAINER}..."
docker unpause "${CONTAINER}"
trap - EXIT

echo "Backup complete: ${VOLUME_NAME}-${TIMESTAMP}.tar.gz"
```

In Portainer:
1. Navigate to the stateful container.
2. Click **Pause**.
3. Perform your backup operation.
4. Click **Unpause**.

## Use Case 2: Performance Isolation

Temporarily pause non-critical containers during a high-load event:

```bash
#!/bin/bash
# pause-non-critical.sh
# Pause background workers during peak hours

NON_CRITICAL_CONTAINERS=(
  "report-generator"
  "email-digest-sender"
  "analytics-processor"
)

for container in "${NON_CRITICAL_CONTAINERS[@]}"; do
  echo "Pausing ${container}..."
  docker pause "${container}" 2>/dev/null || echo "  ${container} could not be paused"
done

echo "Non-critical containers paused. Run unpause-non-critical.sh to resume."
```

## Use Case 3: Development Debugging

Freeze a container at a specific moment to inspect its state:

```bash
# Pause a container mid-execution
docker pause my-app

# Inspect its state while frozen
# In Portainer: view logs, inspect, network connections all still visible

# Review published ports from the host:
docker port my-app

# Check memory usage while frozen:
docker stats --no-stream my-app

# Resume when done debugging
docker unpause my-app
```

## Step 3: Bulk Pause/Unpause in Portainer

For multiple containers:

1. Navigate to **Containers**.
2. Check the checkboxes next to the containers.
3. Click **Pause** or **Unpause** in the bulk action bar.

## Monitoring Paused Containers

In Portainer, paused containers:
- Show **Paused** status in the container list.
- Still consume memory (processes remain in RAM).
- Do not consume CPU.
- Are not removed by `docker container prune`.

```bash
# List paused containers:
docker ps --filter status=paused

# Check container state:
docker inspect --format '{{.State.Paused}}' my-container
# Returns: true
```

## Important Limitations

- **Paused containers still consume memory** - don't pause as a memory optimization.
- **Network connections may time out** - if paused too long, TCP connections may be dropped by the peer.
- **Healthchecks can time out** - a paused container may become `unhealthy` if its healthcheck cannot complete while paused.
- **Not ideal for long-term suspension** - use stop when you need a clean shutdown or plan to leave the workload idle for an extended period.

## Conclusion

The pause/unpause functionality in Portainer provides a way to temporarily freeze container execution without losing state. It's most valuable for reducing CPU contention during peak periods, creating a short write-quiesce window for certain filesystem-level copy operations, and debugging container behavior. For anything requiring a longer interruption, stop the container instead - paused containers still hold memory and may have connection issues after an extended pause.
