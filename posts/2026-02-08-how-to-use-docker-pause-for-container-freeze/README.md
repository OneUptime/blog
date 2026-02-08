# How to Use Docker Pause for Container Freeze

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker pause, containers, cgroups, freezer, resource management, debugging

Description: Learn how to freeze and unfreeze Docker containers with docker pause and unpause for debugging and resource control.

---

The `docker pause` command freezes all processes in a container without stopping it. The container stays running in the eyes of Docker, keeps its allocated resources, and maintains all network connections in a suspended state. When you unpause it, everything resumes exactly where it left off.

This is different from `docker stop`, which sends a SIGTERM signal and shuts down the container. Pausing is more like pressing the pause button on a video player. The state is preserved, and resumption is instant.

## How Docker Pause Works Under the Hood

Docker pause uses the Linux cgroup freezer subsystem. When you pause a container, the kernel moves all of the container's processes into the `FROZEN` state. Frozen processes do not receive any CPU time at all. They do not execute instructions, they do not respond to signals (except SIGKILL), and they do not consume CPU resources.

This is fundamentally different from reducing a container's CPU priority. Paused processes are completely suspended at the kernel level.

Verify the cgroup freezer state:

```bash
# Check if cgroup freezer is available on your system
cat /sys/fs/cgroup/freezer/docker/*/freezer.state 2>/dev/null || \
  echo "Using cgroup v2 (freezer is integrated)"
```

## Basic Pause and Unpause

The syntax is as simple as it gets:

```bash
# Start a container that does continuous work
docker run -d --name busy-worker alpine sh -c "while true; do echo working; sleep 1; done"

# Freeze the container
docker pause busy-worker

# Check the container status - it will show "Paused"
docker ps --filter name=busy-worker
```

Output shows the paused state:

```
CONTAINER ID   IMAGE    COMMAND                  STATUS                  NAMES
a1b2c3d4e5f6   alpine   "sh -c 'while true;..."  Up 2 minutes (Paused)  busy-worker
```

Resume the container:

```bash
# Unfreeze the container to resume all processes
docker unpause busy-worker
```

After unpausing, the container continues exactly from where it stopped. The `while true` loop picks up from its next iteration without missing a beat.

## Pausing Multiple Containers

Pause several containers at once by listing them:

```bash
# Pause multiple containers in a single command
docker pause container1 container2 container3
```

Unpause them all:

```bash
# Resume multiple containers at once
docker unpause container1 container2 container3
```

Pause all running containers with a shell command:

```bash
# Freeze every running container on the host
docker pause $(docker ps -q)
```

Resume all paused containers:

```bash
# Unfreeze every paused container
docker unpause $(docker ps -q --filter status=paused)
```

## Use Case: Debugging a Running Service

One of the most practical uses of `docker pause` is freezing a misbehaving container while you investigate. The container keeps its state, including memory contents, open files, and network connections.

Scenario: A container is consuming excessive CPU and you want to stop it temporarily while you check the logs and resource usage.

```bash
# Freeze the runaway container immediately
docker pause runaway-service

# Now safely inspect its state without it consuming more resources
docker logs runaway-service --tail 100

# Check what the container was doing
docker top runaway-service

# Inspect resource usage stats (the container still reports its last stats)
docker stats runaway-service --no-stream

# After investigation, either resume or stop it
docker unpause runaway-service
# or
docker stop runaway-service
```

The key advantage over `docker stop` is that stopping a container triggers cleanup processes, flushes buffers, and closes connections. If you need to examine the exact state of a misbehaving service, pausing preserves that state.

## Use Case: Consistent Backups

Taking a backup of a database volume while the database is writing data can produce an inconsistent snapshot. Pausing the database container freezes all I/O, giving you a clean backup window.

```bash
# Pause the database to ensure data consistency
docker pause postgres-db

# Take a snapshot of the volume while no writes are happening
sudo cp -a /var/lib/docker/volumes/pgdata/_data /backup/pgdata-$(date +%Y%m%d)

# Resume the database
docker unpause postgres-db
```

The pause duration should be as short as possible to minimize downtime. For large volumes, consider using filesystem snapshots (LVM or ZFS) which complete nearly instantly:

```bash
# Pause, snapshot, unpause - minimal downtime
docker pause postgres-db
sudo lvcreate --snapshot --name pgsnap --size 5G /dev/vg0/pgdata
docker unpause postgres-db

# Now mount and copy the snapshot at your leisure
sudo mount /dev/vg0/pgsnap /mnt/snapshot
sudo cp -a /mnt/snapshot/* /backup/
```

## Use Case: Resource Throttling During Peak Hours

Pause non-critical background workers during peak traffic hours so the critical web services get all available resources.

```bash
#!/bin/bash
# peak-mode.sh - Pause background workers during business hours

WORKERS="analytics-worker report-generator data-sync"

case "$1" in
  on)
    echo "Peak mode ON - pausing background workers"
    for worker in $WORKERS; do
      docker pause "$worker" 2>/dev/null && echo "Paused $worker"
    done
    ;;
  off)
    echo "Peak mode OFF - resuming background workers"
    for worker in $WORKERS; do
      docker unpause "$worker" 2>/dev/null && echo "Resumed $worker"
    done
    ;;
  *)
    echo "Usage: $0 {on|off}"
    exit 1
    ;;
esac
```

Schedule this with cron:

```bash
# Pause workers at 9 AM, resume at 6 PM on weekdays
0 9 * * 1-5 /usr/local/bin/peak-mode.sh on
0 18 * * 1-5 /usr/local/bin/peak-mode.sh off
```

## What Happens to Network Connections

Paused containers maintain their TCP connections, but they cannot process any incoming or outgoing data. This means:

- TCP connections stay open but become unresponsive
- Clients will experience timeouts if the pause exceeds their timeout settings
- Short pauses (a few seconds) are usually transparent to clients that have reasonable retry logic
- UDP packets sent to a paused container are dropped

Test this behavior:

```bash
# Start an nginx container
docker run -d --name web -p 8080:80 nginx

# Verify it responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080

# Pause it and try again - the connection will hang
docker pause web
curl --max-time 5 http://localhost:8080
# This will timeout after 5 seconds

# Unpause and verify recovery
docker unpause web
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
```

## Docker Pause in Compose

Docker Compose does not have a built-in `pause` subcommand, but you can pause services by their container names:

```bash
# Find the container name for a Compose service
docker compose ps --format "{{.Name}}" web

# Pause a specific Compose service container
docker pause myproject-web-1

# Or use docker compose's container naming pattern
docker pause $(docker compose ps -q web)
```

To pause all containers in a Compose project:

```bash
# Pause every container in the current Compose project
docker compose ps -q | xargs docker pause
```

## Monitoring Paused Containers

Keep track of which containers are paused:

```bash
# List all currently paused containers
docker ps --filter status=paused

# Get just the names of paused containers
docker ps --filter status=paused --format "{{.Names}}"

# Count paused containers
docker ps --filter status=paused -q | wc -l
```

Set up a simple alert for containers that stay paused too long:

```bash
#!/bin/bash
# check-paused.sh - Alert if any container has been paused for more than 1 hour

PAUSED=$(docker ps --filter status=paused --format "{{.Names}}\t{{.Status}}")

if [ -n "$PAUSED" ]; then
  echo "WARNING: The following containers are paused:"
  echo "$PAUSED"
  # Add your alerting mechanism here (email, Slack, etc.)
fi
```

## Pause vs Stop vs Kill

Understanding the differences helps you choose the right command:

| Action | Signal | State Preserved | Resume Speed | Connections |
|--------|--------|----------------|--------------|-------------|
| `docker pause` | None (cgroup freeze) | Yes, completely | Instant | Kept open |
| `docker stop` | SIGTERM, then SIGKILL | No | Slow (cold start) | Closed gracefully |
| `docker kill` | SIGKILL | No | Slow (cold start) | Dropped immediately |

Use `pause` when you need to temporarily suspend a container and resume it quickly. Use `stop` for graceful shutdown. Use `kill` only when a container is unresponsive to SIGTERM.

## Limitations

There are some things `docker pause` cannot do:

- You cannot exec into a paused container. `docker exec` will fail with "container is paused."
- You cannot pause a container that is already stopped.
- Health checks do not run while the container is paused, which may trigger orchestrator restarts if you use Docker Swarm or Kubernetes.
- The cgroup freezer does not work on all storage drivers equally. Overlay2 (the default) works fine.

```bash
# This will fail on a paused container
docker pause busy-worker
docker exec busy-worker ls
# Error: container is paused

# You must unpause first
docker unpause busy-worker
docker exec busy-worker ls
```

## Summary

`docker pause` freezes container processes at the kernel level using the cgroup freezer, preserving the complete state including memory and open connections. It is useful for creating consistent backup windows, debugging misbehaving containers without losing state, and temporarily freeing up CPU for higher-priority services. Unlike `docker stop`, paused containers resume instantly with no cold start penalty. Remember that network connections stay open but become unresponsive during the pause, so keep pause durations short for user-facing services.
