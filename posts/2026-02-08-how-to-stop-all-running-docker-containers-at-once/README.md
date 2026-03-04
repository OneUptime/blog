# How to Stop All Running Docker Containers at Once

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Stop, Cleanup, DevOps, Docker Commands

Description: Learn multiple methods to stop all running Docker containers at once, including graceful shutdowns, force kills, and selective stopping.

---

Sometimes you need to stop everything. Maybe you are resetting your development environment, preparing for a system restart, or cleaning up after a testing session. Stopping containers one by one is tedious when you have a dozen running. Docker provides several ways to stop all containers in a single command.

This guide covers every practical approach, from simple one-liners to selective strategies that stop only what you intend.

## The Quick One-Liner

The most common approach combines `docker ps` with `docker stop`.

```bash
# Stop all running containers
docker stop $(docker ps -q)
```

Here is what happens:
- `docker ps -q` lists the IDs of all running containers (the `-q` flag outputs only IDs)
- `docker stop` receives those IDs and stops each container

Docker sends SIGTERM to each container's main process, waits 10 seconds for a graceful shutdown, then sends SIGKILL if the process is still running.

## Handling the Empty List Case

If no containers are running, the previous command produces an error because `docker stop` receives an empty argument. Handle this gracefully.

```bash
# Stop all running containers, handling the case where none are running
docker ps -q | xargs -r docker stop
```

The `-r` flag (or `--no-run-if-empty`) tells `xargs` to skip the command if there is no input. On macOS, xargs does not support `-r`, so use this alternative:

```bash
# macOS-compatible version
CONTAINERS=$(docker ps -q)
if [ -n "$CONTAINERS" ]; then
    docker stop $CONTAINERS
fi
```

## Adjusting the Grace Period

The default 10-second timeout might be too long or too short depending on your containers. Adjust it with the `-t` flag.

```bash
# Stop all containers with a 30-second grace period
docker stop -t 30 $(docker ps -q)

# Stop all containers with a 5-second grace period for faster shutdown
docker stop -t 5 $(docker ps -q)

# Stop immediately with no grace period (sends SIGKILL right away)
docker stop -t 0 $(docker ps -q)
```

Applications that need time to flush buffers, close database connections, or finish processing requests benefit from longer timeouts.

## Force Killing All Containers

When you do not care about graceful shutdown, `docker kill` sends SIGKILL immediately.

```bash
# Kill all running containers immediately (no grace period)
docker kill $(docker ps -q)
```

Use this when containers are unresponsive or when you know the applications inside handle abrupt termination without data loss.

## Using Docker Compose

If your containers were started with Docker Compose, use Compose to stop them.

```bash
# Stop all services defined in docker-compose.yml
docker compose stop

# Stop and remove all services, networks, and anonymous volumes
docker compose down

# Stop with a custom timeout
docker compose stop -t 30
```

Compose stops services in the correct order, respecting dependencies. Services that depend on others stop first.

## Stopping Containers by Filter

Sometimes you want to stop a subset of containers rather than everything. Docker supports filtering.

```bash
# Stop all containers with a specific label
docker stop $(docker ps -q --filter "label=environment=dev")

# Stop all containers running a specific image
docker stop $(docker ps -q --filter "ancestor=nginx")

# Stop all containers whose name matches a pattern
docker stop $(docker ps -q --filter "name=test-")

# Stop all containers created in the last hour
docker stop $(docker ps -q --filter "since=$(docker ps -q | tail -1)")
```

## Stopping All Except Specific Containers

Protect critical containers while stopping everything else.

```bash
#!/bin/bash
# stop-except.sh - Stop all containers except specified ones
# Usage: ./stop-except.sh container1 container2

KEEP_LIST="$@"

docker ps -q | while read container_id; do
    CONTAINER_NAME=$(docker inspect --format '{{.Name}}' "$container_id" | sed 's/\///')

    SKIP=false
    for keep in $KEEP_LIST; do
        if [ "$CONTAINER_NAME" = "$keep" ]; then
            SKIP=true
            break
        fi
    done

    if [ "$SKIP" = true ]; then
        echo "Keeping: $CONTAINER_NAME"
    else
        echo "Stopping: $CONTAINER_NAME"
        docker stop "$container_id"
    fi
done
```

Use it like this:

```bash
# Stop everything except the database and redis containers
./stop-except.sh postgres redis
```

## Stopping and Removing in One Step

If you want to stop containers and remove them immediately, combine the operations.

```bash
# Stop and remove all containers
docker stop $(docker ps -q) && docker rm $(docker ps -aq)

# Or use the force remove flag which stops running containers first
docker rm -f $(docker ps -aq)
```

The `docker rm -f` approach sends SIGKILL rather than SIGTERM, so there is no graceful shutdown period.

## Checking the Results

After stopping containers, verify the state.

```bash
# Confirm no containers are running
docker ps

# Show all containers including stopped ones
docker ps -a

# Show a count of containers by status
docker ps -a --format '{{.Status}}' | cut -d' ' -f1 | sort | uniq -c
```

## Automating Periodic Stops

On development machines, you might want to stop all containers at the end of the workday to free up resources.

```bash
# Create an alias for quick cleanup
alias docker-stopall='docker stop $(docker ps -q) 2>/dev/null; echo "All containers stopped"'

# Or add a cron job to stop containers at midnight
# crontab -e
0 0 * * * /usr/bin/docker stop $(/usr/bin/docker ps -q) 2>/dev/null
```

## Stopping Containers on Specific Networks

When working with multiple projects, stop only the containers on a specific Docker network.

```bash
# List containers on a specific network
docker network inspect myproject_default --format '{{range .Containers}}{{.Name}} {{end}}'

# Stop all containers on a specific network
docker network inspect myproject_default -f '{{range .Containers}}{{.Name}} {{end}}' | xargs docker stop
```

## Understanding Stop Signals

Different containers handle shutdown signals differently. Some applications listen for SIGTERM, others use custom signals.

```bash
# Check what stop signal a container is configured to use
docker inspect --format '{{.Config.StopSignal}}' my-container
```

For containers that need a specific signal:

```bash
# Send a custom signal to all containers
docker kill --signal SIGQUIT $(docker ps -q)
```

Nginx, for example, performs a graceful shutdown on SIGQUIT, closing existing connections before stopping.

## Monitoring the Shutdown Process

Watch the shutdown progress in real time.

```bash
# Monitor container status during shutdown
watch -n 1 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

In another terminal, run the stop command:

```bash
docker stop $(docker ps -q)
```

You will see containers transition from "Up" to "Exited" in the watch output.

## Best Practices

1. Always prefer `docker stop` over `docker kill` unless containers are unresponsive. Graceful shutdown prevents data corruption.
2. Set appropriate `STOPSIGNAL` and `stop_grace_period` in your Dockerfiles and Compose files.
3. Test that your applications handle SIGTERM properly. Many applications need explicit signal handling code.
4. Use Docker Compose for project-scoped stops rather than stopping all containers globally.
5. Keep important containers labeled so you can filter them during bulk operations.

```dockerfile
# In your Dockerfile, set appropriate stop handling
STOPSIGNAL SIGTERM

# In docker-compose.yml, set the grace period
services:
  web:
    image: myapp
    stop_grace_period: 30s
```

## Conclusion

Stopping all Docker containers at once is straightforward with `docker stop $(docker ps -q)`. Add filters for selective stopping, adjust timeouts for graceful shutdowns, and use Docker Compose for project-scoped operations. Build aliases and scripts to make cleanup a single-command task. Whether you are resetting your dev environment or preparing for maintenance, these techniques give you full control over container shutdown.
