# How to Use docker container Commands Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Containers, Container Management, Container Lifecycle, DevOps

Description: Master Docker container commands to run, stop, inspect, debug, and manage the full container lifecycle in development and production.

---

Containers are the runtime units of Docker. While images are the blueprints, containers are the live processes that serve traffic, process data, and run your applications. The `docker container` command family gives you complete control over the container lifecycle, from creation to removal.

This guide covers every important `docker container` subcommand with real examples you can use in development and production.

## Running Containers

The `docker container run` command creates and starts a container from an image.

Run a container in detached mode (background):

```bash
docker container run -d --name web nginx:latest
```

Run interactively with a terminal:

```bash
docker container run -it --name debug ubuntu:22.04 /bin/bash
```

Run with port mapping, environment variables, and resource limits:

```bash
docker container run -d \
  --name api \
  -p 8080:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://db:5432/myapp \
  --memory 512m \
  --cpus 1.5 \
  --restart unless-stopped \
  my-api:latest
```

Run a one-off command and remove the container when done:

```bash
docker container run --rm alpine:latest ping -c 3 google.com
```

## Listing Containers

See running containers:

```bash
docker container ls
```

Include stopped containers:

```bash
docker container ls -a
```

Show only container IDs (useful for scripting):

```bash
docker container ls -q
```

Filter by status:

```bash
docker container ls --filter status=exited
docker container ls --filter status=running
```

Filter by name pattern:

```bash
docker container ls --filter name=api
```

Format output for custom views:

```bash
docker container ls --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}"
```

Show the last 5 containers regardless of state:

```bash
docker container ls -a -n 5
```

## Starting, Stopping, and Restarting

Stop a running container gracefully (sends SIGTERM, then SIGKILL after timeout):

```bash
docker container stop web
```

Stop with a custom timeout (30 seconds before SIGKILL):

```bash
docker container stop --time 30 web
```

Stop multiple containers at once:

```bash
docker container stop web api worker
```

Start a stopped container:

```bash
docker container start web
```

Restart a container (stop, then start):

```bash
docker container restart web
```

Pause a container (freezes all processes using cgroups):

```bash
docker container pause web
```

Unpause a paused container:

```bash
docker container unpause web
```

Kill a container immediately (sends SIGKILL):

```bash
docker container kill web
```

Send a specific signal:

```bash
docker container kill --signal SIGUSR1 web
```

## Inspecting Containers

Get the complete JSON metadata of a container:

```bash
docker container inspect web
```

Extract the IP address of a container:

```bash
docker container inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
```

Get the container's health status:

```bash
docker container inspect --format '{{.State.Health.Status}}' web
```

Get the restart count:

```bash
docker container inspect --format '{{.RestartCount}}' web
```

Check how the container exited:

```bash
docker container inspect --format '{{.State.ExitCode}}' web
```

## Viewing Logs

Container logs are your primary debugging tool. Docker captures stdout and stderr from the container process.

View all logs for a container:

```bash
docker container logs web
```

Follow logs in real time (like tail -f):

```bash
docker container logs -f web
```

Show timestamps with each log line:

```bash
docker container logs -t web
```

Show only the last 100 lines:

```bash
docker container logs --tail 100 web
```

Show logs since a specific time:

```bash
docker container logs --since 2026-02-08T10:00:00 web
```

Show logs from the last 30 minutes:

```bash
docker container logs --since 30m web
```

## Executing Commands in Running Containers

The `exec` command runs a new process inside a running container. This is essential for debugging.

Open a shell inside a running container:

```bash
docker container exec -it web /bin/bash
```

For Alpine-based images that do not have bash:

```bash
docker container exec -it web /bin/sh
```

Run a single command without an interactive session:

```bash
docker container exec web cat /etc/nginx/nginx.conf
```

Run a command as a specific user:

```bash
docker container exec -u root web apt-get update
```

Set environment variables for the exec session:

```bash
docker container exec -e DEBUG=true web python manage.py check
```

## Copying Files

Copy files between the host and containers without rebuilding images.

Copy a file from the host into a running container:

```bash
docker container cp ./nginx.conf web:/etc/nginx/nginx.conf
```

Copy a file from a container to the host:

```bash
docker container cp web:/var/log/nginx/error.log ./error.log
```

Copy an entire directory:

```bash
docker container cp web:/var/log/nginx/ ./nginx-logs/
```

## Viewing Resource Usage

Monitor resource consumption of running containers:

```bash
docker container stats
```

Show stats for specific containers:

```bash
docker container stats web api worker
```

Get a one-time snapshot without streaming:

```bash
docker container stats --no-stream
```

Format the output for monitoring scripts:

```bash
docker container stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

## Viewing Container Processes

See processes running inside a container:

```bash
docker container top web
```

This is equivalent to running `ps` inside the container but does not require any tools installed in the image.

## Viewing Port Mappings

List the port mappings for a container:

```bash
docker container port web
```

Check which host port maps to a specific container port:

```bash
docker container port web 80
```

## Viewing Filesystem Changes

See what files changed in a container compared to its image:

```bash
docker container diff web
```

The output marks files as Added (A), Changed (C), or Deleted (D).

## Creating Images from Containers

Save the current state of a container as a new image:

```bash
docker container commit web my-custom-nginx:v1
```

Add a commit message and author:

```bash
docker container commit \
  --author "Dev Team" \
  --message "Added custom config" \
  web my-custom-nginx:v1
```

This is useful for debugging but should not replace Dockerfiles for reproducible builds.

## Removing Containers

Remove a stopped container:

```bash
docker container rm web
```

Force remove a running container:

```bash
docker container rm -f web
```

Remove a container and its associated volumes:

```bash
docker container rm -v web
```

Remove all stopped containers:

```bash
docker container prune
```

Remove all stopped containers without confirmation:

```bash
docker container prune -f
```

## Practical Example: Debug a Failing Container

Here is a workflow for debugging a container that keeps crashing.

Step-by-step debugging workflow for containers that exit immediately:

```bash
# 1. Check the exit code
docker container inspect --format '{{.State.ExitCode}}' my-app

# 2. Check logs for error messages
docker container logs --tail 50 my-app

# 3. If the container exits too fast, override the entrypoint to keep it alive
docker container run -d --name debug-app \
  --entrypoint /bin/sh \
  my-app:latest \
  -c "sleep infinity"

# 4. Shell into the container to investigate
docker container exec -it debug-app /bin/sh

# 5. Try running the original command manually inside
# This lets you see errors in real time
/usr/local/bin/node /app/server.js

# 6. Check the filesystem for config issues
cat /app/.env
ls -la /app/

# 7. Clean up when done
docker container rm -f debug-app
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker container run` | Create and start a container |
| `docker container ls` | List containers |
| `docker container stop` | Stop a running container |
| `docker container start` | Start a stopped container |
| `docker container restart` | Restart a container |
| `docker container rm` | Remove a container |
| `docker container logs` | View container output |
| `docker container exec` | Run command in container |
| `docker container inspect` | Show container metadata |
| `docker container stats` | Show resource usage |
| `docker container cp` | Copy files to/from container |
| `docker container prune` | Remove stopped containers |

## Conclusion

The `docker container` commands cover the entire container lifecycle. Get comfortable with `run`, `logs`, `exec`, and `inspect` first, as those are the commands you will use daily. For production, make sure you set restart policies, resource limits, and health checks. Regular pruning of stopped containers keeps your host clean. These commands form the core of working with Docker, and mastering them makes everything else in the Docker ecosystem more approachable.
