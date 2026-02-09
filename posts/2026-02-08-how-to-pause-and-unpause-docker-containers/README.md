# How to Pause and Unpause Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Pause, Unpause, Freeze, DevOps, Resource Management

Description: Learn how to pause and unpause Docker containers to temporarily freeze processes without stopping them, preserving state and connections.

---

Stopping a Docker container terminates its processes, closes network connections, and requires a full restart. Sometimes you need a lighter touch. Docker's pause and unpause commands freeze a container's processes in place without terminating anything. When you unpause, the container resumes exactly where it left off.

This is useful for temporarily freeing up CPU resources, taking consistent filesystem snapshots, debugging, and more. This guide covers how pausing works, when to use it, and practical scenarios where it shines.

## How Pause Works Under the Hood

Docker pause uses Linux cgroups freezer to suspend all processes in a container. The processes are not terminated or signaled. They simply stop executing. Memory remains allocated, network connections stay open (though no data flows), and the filesystem state is preserved.

Think of it like pressing pause on a video. Everything stops in place and resumes from the same point.

## Basic Pause and Unpause

The commands are straightforward.

```bash
# Start a container to work with
docker run -d --name myapp -p 8080:80 nginx:latest

# Pause the container (freezes all processes)
docker pause myapp

# Check the status - it shows "Paused"
docker ps

# Unpause the container (resumes all processes)
docker unpause myapp
```

When you run `docker ps` while a container is paused, the STATUS column shows "(Paused)":

```
CONTAINER ID   IMAGE          STATUS                  NAMES
a1b2c3d4e5f6   nginx:latest   Up 5 minutes (Paused)   myapp
```

## Pausing Multiple Containers

You can pause several containers at once.

```bash
# Pause multiple containers by name
docker pause web api worker

# Pause all running containers
docker pause $(docker ps -q)

# Unpause all paused containers
docker unpause $(docker ps -q --filter "status=paused")
```

## What Happens During Pause

When a container is paused:

- **CPU usage drops to zero** - No process cycles are consumed
- **Memory stays allocated** - The container's memory footprint does not change
- **Network connections persist** - TCP connections remain open but idle. Clients may see timeouts if they have short timeout settings
- **Disk I/O stops** - No reads or writes from the container's processes
- **Signals are deferred** - Signals sent to paused processes are delivered when unpaused

```bash
# Demonstrate CPU dropping to zero when paused
# Terminal 1: Watch resource usage
docker stats myapp

# Terminal 2: Pause the container
docker pause myapp
# CPU % will drop to 0.00%

# Terminal 2: Unpause
docker unpause myapp
# CPU % returns to normal
```

## Practical Use Case: Consistent Backups

Pausing a container ensures the filesystem is in a consistent state before taking a backup or snapshot.

```bash
#!/bin/bash
# backup-container.sh - Create a consistent backup of container data
# Usage: ./backup-container.sh container_name volume_path backup_dir

CONTAINER=$1
VOLUME_PATH=$2
BACKUP_DIR=$3
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Pausing container $CONTAINER for backup..."
docker pause "$CONTAINER"

# Create backup while the container is paused (filesystem is consistent)
echo "Creating backup..."
docker cp "$CONTAINER:$VOLUME_PATH" "$BACKUP_DIR/${CONTAINER}_${TIMESTAMP}"

echo "Resuming container..."
docker unpause "$CONTAINER"

echo "Backup complete: $BACKUP_DIR/${CONTAINER}_${TIMESTAMP}"
```

Use it like this:

```bash
# Backup the data directory of a running database container
./backup-container.sh postgres /var/lib/postgresql/data /backups/
```

Without the pause, files could be written mid-copy, resulting in an inconsistent backup.

## Practical Use Case: Resource Management

When a system is under heavy load, pause non-critical containers to free CPU for the ones that matter.

```bash
#!/bin/bash
# manage-priority.sh - Pause low-priority containers when CPU is high
# Requires: containers labeled with priority=low or priority=high

CPU_THRESHOLD=80

# Get current CPU usage percentage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')

if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    echo "CPU at ${CPU_USAGE}%, pausing low-priority containers..."
    docker ps -q --filter "label=priority=low" | xargs -r docker pause
else
    echo "CPU at ${CPU_USAGE}%, resuming low-priority containers..."
    docker ps -q --filter "status=paused" --filter "label=priority=low" | xargs -r docker unpause
fi
```

Run this on a schedule or trigger it from a monitoring system.

## Practical Use Case: Debugging

Pause a container to freeze its state while you inspect it. This prevents the application from changing state while you look at it.

```bash
# Freeze the container's state
docker pause myapp

# Inspect the filesystem without the application writing new files
docker exec myapp ls -la /tmp/
docker exec myapp cat /app/state.json

# Note: docker exec works on paused containers for read operations
# The exec process itself is not paused since it starts after the pause

# Resume when done investigating
docker unpause myapp
```

Actually, there is an important caveat here. `docker exec` on a paused container creates a new process that is also immediately frozen. You need to unpause briefly to run exec commands, or use alternative inspection methods:

```bash
# Alternative: Inspect from the host filesystem
# Find the container's filesystem on the host
CONTAINER_ID=$(docker inspect --format '{{.Id}}' myapp)
sudo ls /var/lib/docker/overlay2/$(docker inspect --format '{{.GraphDriver.Data.MergedDir}}' myapp | xargs basename)/

# Or use docker cp which works on paused containers
docker cp myapp:/app/state.json ./state-snapshot.json
```

## Practical Use Case: Testing Resilience

Test how your application handles a dependency becoming unresponsive by pausing the dependency container.

```bash
# Start your application stack
docker compose up -d

# Pause the database to simulate it becoming unresponsive
docker pause mystack-postgres-1

# Observe how your application handles the frozen database
# Check application logs for timeout handling
docker logs -f mystack-api-1

# After testing, resume the database
docker unpause mystack-postgres-1

# Check if the application recovers gracefully
docker logs --tail 20 mystack-api-1
```

This is a better simulation of network issues than stopping the container, because the TCP connection stays open. Your application will experience timeouts on an open connection rather than a connection refused error.

## Pause vs Stop: When to Use Each

| Scenario | Use Pause | Use Stop |
|----------|-----------|----------|
| Free up CPU temporarily | Yes | Overkill |
| Take a filesystem snapshot | Yes | Yes |
| Maintenance window | Depends | Yes |
| Application not needed anymore | No | Yes |
| Simulate dependency failure | Yes | Different behavior |
| Release memory | No | Yes |
| Reboot the host | No | Yes |

Key differences:
- Pause preserves all state and connections; stop terminates them
- Pause keeps memory allocated; stop releases it
- Pause is instant; stop has a grace period
- Pause is invisible to the container; stop signals the application

## Monitoring Paused Containers

Track paused containers to make sure nothing stays frozen accidentally.

```bash
# List all paused containers
docker ps --filter "status=paused"

# Count paused containers
docker ps --filter "status=paused" -q | wc -l

# Alert if containers have been paused for too long
docker ps --filter "status=paused" --format '{{.Names}} {{.Status}}' | while read name status; do
    echo "WARNING: $name is $status"
done
```

## Docker Compose Pause

Docker Compose supports pausing services.

```bash
# Pause a specific service
docker compose pause postgres

# Pause all services
docker compose pause

# Unpause a specific service
docker compose unpause postgres

# Unpause all services
docker compose unpause
```

## Scripting with Pause State Checks

Check if a container is paused before performing operations on it.

```bash
#!/bin/bash
# check-and-act.sh - Perform action based on container pause state

CONTAINER=$1

STATE=$(docker inspect --format '{{.State.Paused}}' "$CONTAINER" 2>/dev/null)

case "$STATE" in
    true)
        echo "$CONTAINER is paused"
        ;;
    false)
        echo "$CONTAINER is running"
        ;;
    *)
        echo "$CONTAINER not found or not running"
        ;;
esac
```

## Conclusion

Docker pause and unpause give you a freeze-and-resume capability that sits between running and stopped. Use it for consistent backups, temporary resource management, resilience testing, and debugging. It preserves connections and state that stopping would destroy. Remember that paused containers still consume memory, so it is not a substitute for stopping containers you no longer need. Add pause state monitoring to your workflow to catch accidentally frozen containers before they cause problems.
