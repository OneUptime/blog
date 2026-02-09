# How to Automatically Remove a Container After It Exits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Cleanup, Docker CLI

Description: Learn how to use the --rm flag and other strategies to automatically remove Docker containers after they exit, keeping your system clean.

---

Docker containers pile up fast. Every time you run a test, debug a problem, or spin up a quick utility container, a stopped container gets left behind. Over time, these dead containers eat disk space and clutter your `docker ps -a` output. The good news is that Docker gives you several ways to clean up automatically.

## The --rm Flag: Your Best Friend

The simplest way to auto-remove a container is the `--rm` flag. When you pass this flag to `docker run`, Docker deletes the container and its anonymous volumes as soon as it exits.

Here is a basic example that runs an Alpine container, prints a message, and then removes itself:

```bash
# Run a container that removes itself after printing "hello"
docker run --rm alpine echo "hello from a temporary container"
```

After this command completes, run `docker ps -a` and you will not find the container. It is gone.

This works for interactive sessions too. The following command drops you into a bash shell inside an Ubuntu container, and the container disappears the moment you type `exit`:

```bash
# Start an interactive session that cleans up on exit
docker run --rm -it ubuntu:22.04 bash
```

## Why Containers Accumulate

Before diving deeper, it helps to understand why Docker keeps stopped containers by default. When a container exits, Docker preserves its filesystem, logs, and metadata. This lets you inspect what went wrong, copy files out of it, or restart it. That design choice makes sense for long-running services, but it creates a mess when you run lots of short-lived containers.

Check how many stopped containers are sitting on your system right now:

```bash
# List all containers including stopped ones, then count them
docker ps -a --filter "status=exited" | wc -l
```

If that number surprises you, keep reading.

## Combining --rm with Other Flags

The `--rm` flag plays nicely with most other docker run options. You can combine it with port mapping, volume mounts, environment variables, and network settings.

Here is an example that runs a temporary Nginx container with a port mapping:

```bash
# Run a temporary Nginx container accessible on port 8080
docker run --rm -d -p 8080:80 --name temp-nginx nginx:latest
```

Note that `-d` (detach) works with `--rm`. The container runs in the background and gets removed when you stop it:

```bash
# Stop the container - it will be removed automatically
docker stop temp-nginx
```

You can also mount volumes with `--rm`. Named volumes survive container removal, but anonymous volumes get deleted along with the container:

```bash
# Named volume persists after container removal
docker run --rm -v mydata:/data alpine touch /data/important-file.txt

# Anonymous volume gets removed with the container
docker run --rm -v /data alpine touch /data/temporary-file.txt
```

## Limitations of --rm

There are a few things to know about the `--rm` flag before you rely on it everywhere.

First, you cannot use `--rm` together with `--restart`. This makes sense if you think about it - a restart policy tells Docker to bring the container back, while `--rm` tells Docker to delete it. Those two instructions conflict.

```bash
# This will fail with an error
docker run --rm --restart=always nginx
```

Second, `--rm` only works when the container exits normally or is stopped. If the Docker daemon crashes or your host machine reboots unexpectedly, the cleanup might not happen. Orphaned containers can still accumulate after unclean shutdowns.

Third, once a container created with `--rm` exits, its logs disappear too. If you need to review logs after the fact, make sure you are shipping logs to an external system.

## Cleaning Up Containers That Already Exist

What about containers that are already sitting around? Docker provides the `prune` command for bulk cleanup.

Remove all stopped containers in one shot:

```bash
# Remove all stopped containers (will ask for confirmation)
docker container prune
```

If you want to skip the confirmation prompt, add the `-f` flag:

```bash
# Force-remove all stopped containers without confirmation
docker container prune -f
```

You can also filter which containers to prune. For example, remove only containers that stopped more than 24 hours ago:

```bash
# Remove containers that exited more than 24 hours ago
docker container prune -f --filter "until=24h"
```

Or remove containers with a specific label:

```bash
# Remove stopped containers that have the "environment=test" label
docker container prune -f --filter "label=environment=test"
```

## Automating Cleanup with a Cron Job

For production servers where you cannot always use `--rm`, a cron job works well. This approach catches containers that slip through other cleanup methods.

Create a cron job that prunes stopped containers every night at midnight:

```bash
# Open the crontab editor
crontab -e
```

Add this line to run container cleanup daily:

```bash
# Prune stopped containers every night at midnight
0 0 * * * /usr/bin/docker container prune -f >> /var/log/docker-prune.log 2>&1
```

## Using Docker Compose with Auto-Remove

In Docker Compose, you do not have a direct equivalent of `--rm`, but you can use the `docker compose run --rm` command for one-off tasks:

```bash
# Run a one-off migration command that cleans up after itself
docker compose run --rm web python manage.py migrate
```

For regular services defined in your compose file, you can add an `init` field and handle cleanup with `docker compose down`:

```yaml
# docker-compose.yml - services get removed with "docker compose down"
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"

  worker:
    image: python:3.11
    command: python worker.py
```

```bash
# Stop and remove all containers defined in the compose file
docker compose down

# Also remove volumes if you want a complete cleanup
docker compose down -v
```

## System-Wide Cleanup

Sometimes you want to go beyond just containers. Docker's system prune removes stopped containers, unused networks, dangling images, and build cache all at once:

```bash
# Remove all unused Docker resources
docker system prune -f

# Include unused volumes in the cleanup (be careful with this one)
docker system prune -f --volumes
```

Check how much space you will recover before pruning:

```bash
# Show how much disk space Docker is using
docker system df
```

This prints a table showing space used by images, containers, volumes, and build cache. The "RECLAIMABLE" column tells you how much you can free up.

## Best Practices

Here are some practical guidelines for keeping your Docker environment clean:

1. Always use `--rm` for throwaway containers - tests, debugging sessions, and one-off commands.
2. Set up a nightly prune cron job on servers that run many containers.
3. Ship container logs to an external system before relying on `--rm`, since logs vanish with the container.
4. Use `docker system df` periodically to monitor disk usage.
5. Label your containers so you can selectively prune by label when needed.
6. In CI/CD pipelines, always use `--rm` for build and test containers.

## Monitoring Container Sprawl

If you run Docker in production, consider monitoring the number of stopped containers as a metric. A sudden spike might indicate a misconfigured service or a deployment issue. Tools like OneUptime can help you track container counts and alert you when things go sideways.

The `--rm` flag is small but powerful. Make it a habit, and you will spend less time wrestling with container cleanup and more time building things that matter.
