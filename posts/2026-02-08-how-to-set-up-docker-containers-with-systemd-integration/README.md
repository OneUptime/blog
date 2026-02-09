# How to Set Up Docker Containers with Systemd Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Systemd, Linux, Production, Service Management, DevOps

Description: Integrate Docker containers with systemd for proper service ordering, dependency management, and system-level lifecycle control.

---

Docker has its own restart policies, but they only cover basic process restart logic. Systemd brings a much richer set of capabilities: dependency ordering between services, proper boot-time startup sequencing, resource controls, watchdog timers, and integration with the rest of your Linux system. Connecting Docker containers to systemd gives you production-grade service management that works the way Linux administrators expect.

## Why Use Systemd with Docker

Docker's built-in restart policies handle simple cases. Container crashes, Docker restarts it. But production systems need more:

- Start container A only after container B is healthy
- Wait for network to be available before starting any containers
- Integrate container logs with journald
- Set CPU and memory limits at the systemd level
- Get proper status reporting through `systemctl status`
- Support clean shutdown ordering during system reboot

Systemd handles all of this through its unit file system.

## Basic Systemd Unit for a Docker Container

Create a systemd unit file that manages a Docker container:

```ini
# /etc/systemd/system/docker-redis.service
# Systemd unit file to manage a Redis Docker container

[Unit]
Description=Redis Docker Container
# Only start after Docker is ready
After=docker.service
Requires=docker.service
# Wait for network to be available
After=network-online.target

[Service]
Type=simple
# Always restart on failure
Restart=always
RestartSec=10

# Remove any existing container with this name before starting
ExecStartPre=-/usr/bin/docker rm -f redis

# Start the container in the foreground (no -d flag)
ExecStart=/usr/bin/docker run \
  --name redis \
  --rm \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes

# Gracefully stop the container
ExecStop=/usr/bin/docker stop -t 30 redis

# Timeout for stop operation
TimeoutStopSec=35

[Install]
WantedBy=multi-user.target
```

Key points in this unit file:

- `Type=simple` because Docker run in the foreground (no `-d`) is a simple process
- `ExecStartPre=-` with the dash prefix means the pre-start command can fail (the container might not exist yet)
- `--rm` flag removes the container on stop, and ExecStartPre ensures cleanup of any stale container
- No `-d` flag on `docker run`, so systemd can track the process directly

Enable and start the service:

```bash
# Reload systemd to pick up the new unit file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable docker-redis.service

# Start the service now
sudo systemctl start docker-redis.service

# Check the status
sudo systemctl status docker-redis.service
```

## Service Dependencies

The real power of systemd shows when you define dependencies between containers. A web application that depends on Redis and PostgreSQL should not start until those services are ready.

Create the PostgreSQL service:

```ini
# /etc/systemd/system/docker-postgres.service
[Unit]
Description=PostgreSQL Docker Container
After=docker.service
Requires=docker.service
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10

ExecStartPre=-/usr/bin/docker rm -f postgres
ExecStart=/usr/bin/docker run \
  --name postgres \
  --rm \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=secretpass \
  -e POSTGRES_DB=myapp \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine

ExecStop=/usr/bin/docker stop -t 30 postgres
TimeoutStopSec=35

[Install]
WantedBy=multi-user.target
```

Create the application service that depends on both:

```ini
# /etc/systemd/system/docker-app.service
[Unit]
Description=Application Docker Container
After=docker.service
Requires=docker.service
# This is the key: depend on Redis and PostgreSQL services
After=docker-redis.service docker-postgres.service
Requires=docker-redis.service docker-postgres.service

[Service]
Type=simple
Restart=always
RestartSec=10

# Wait for the database to actually accept connections
ExecStartPre=/bin/bash -c 'until docker exec postgres pg_isready -U postgres; do sleep 2; done'
ExecStartPre=-/usr/bin/docker rm -f app

ExecStart=/usr/bin/docker run \
  --name app \
  --rm \
  -p 8080:8080 \
  -e DATABASE_URL=postgresql://postgres:secretpass@host.docker.internal:5432/myapp \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  myapp:latest

ExecStop=/usr/bin/docker stop -t 30 app
TimeoutStopSec=35

[Install]
WantedBy=multi-user.target
```

The `After=` and `Requires=` directives ensure proper ordering. The `ExecStartPre` with `pg_isready` adds an application-level readiness check beyond just the container being started.

## Using Docker Networks with Systemd

When containers need to communicate, create a shared Docker network managed by its own systemd unit:

```ini
# /etc/systemd/system/docker-network-app.service
# Creates the Docker network before any application containers start

[Unit]
Description=Docker Network for App Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes

# Create the network if it does not exist
ExecStart=/bin/bash -c '/usr/bin/docker network inspect app-net > /dev/null 2>&1 || /usr/bin/docker network create app-net'
# Remove the network on stop
ExecStop=/usr/bin/docker network rm app-net

[Install]
WantedBy=multi-user.target
```

Update your container services to use this network and depend on it:

```ini
# Updated docker-redis.service to use the app-net network
[Unit]
Description=Redis Docker Container
After=docker.service docker-network-app.service
Requires=docker.service docker-network-app.service

[Service]
Type=simple
Restart=always
RestartSec=10

ExecStartPre=-/usr/bin/docker rm -f redis
ExecStart=/usr/bin/docker run \
  --name redis \
  --rm \
  --network app-net \
  redis:7-alpine \
  redis-server --appendonly yes

ExecStop=/usr/bin/docker stop -t 30 redis
TimeoutStopSec=35

[Install]
WantedBy=multi-user.target
```

With a shared Docker network, containers can reach each other by name (e.g., `redis:6379` instead of `host.docker.internal:6379`).

## Resource Limits Through Systemd

Systemd can enforce resource limits on Docker containers at the system level:

```ini
# /etc/systemd/system/docker-app.service with resource limits
[Unit]
Description=Application Docker Container
After=docker-redis.service docker-postgres.service
Requires=docker-redis.service docker-postgres.service

[Service]
Type=simple
Restart=always
RestartSec=10

# CPU limit: 200% (2 full cores)
CPUQuota=200%

# Memory limit: 1GB hard, 768MB soft
MemoryMax=1G
MemoryHigh=768M

# I/O weight (relative priority, 1-10000)
IOWeight=500

# Limit number of processes
TasksMax=512

ExecStartPre=-/usr/bin/docker rm -f app
ExecStart=/usr/bin/docker run \
  --name app \
  --rm \
  --network app-net \
  -p 8080:8080 \
  myapp:latest

ExecStop=/usr/bin/docker stop -t 30 app
TimeoutStopSec=35

[Install]
WantedBy=multi-user.target
```

These systemd-level limits work in addition to any Docker-level resource constraints. The stricter limit wins.

## Logging Integration with Journald

Configure Docker containers to send logs to journald for centralized log management:

```ini
# Updated ExecStart with journald-compatible logging
ExecStart=/usr/bin/docker run \
  --name app \
  --rm \
  --log-driver=journald \
  --log-opt tag="docker-app" \
  --network app-net \
  -p 8080:8080 \
  myapp:latest
```

View container logs through journalctl:

```bash
# View logs for the app container
sudo journalctl -u docker-app.service -f

# View logs from the last hour
sudo journalctl -u docker-app.service --since "1 hour ago"

# View logs from all Docker services
sudo journalctl -u "docker-*.service" --since today
```

## Watchdog Integration

Systemd's watchdog feature can detect frozen containers:

```ini
# Service with watchdog timer
[Service]
Type=notify
WatchdogSec=60
Restart=always

ExecStart=/usr/local/bin/docker-watchdog-wrapper.sh
```

The wrapper script pings systemd's watchdog while the container is healthy:

```bash
#!/bin/bash
# /usr/local/bin/docker-watchdog-wrapper.sh
# Runs a Docker container and pings systemd watchdog based on health checks

CONTAINER_NAME="app"
HEALTH_URL="http://localhost:8080/health"

# Start the container
docker run --name "$CONTAINER_NAME" --rm -p 8080:8080 myapp:latest &
DOCKER_PID=$!

# Notify systemd that we have started
systemd-notify --ready

# Ping the watchdog as long as the container is healthy
while kill -0 $DOCKER_PID 2>/dev/null; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        systemd-notify WATCHDOG=1
    fi
    sleep 15
done

# Container exited
exit 1
```

If the health check fails and the watchdog is not pinged within the WatchdogSec window, systemd will restart the service automatically.

## Managing the Full Stack

Common operations with the systemd-managed Docker stack:

```bash
# Start all application services (dependencies start automatically)
sudo systemctl start docker-app.service

# Stop the entire stack in the correct order
sudo systemctl stop docker-app.service docker-redis.service docker-postgres.service

# Restart a single service (dependents will be notified)
sudo systemctl restart docker-redis.service

# Check the status of all Docker services
sudo systemctl list-units "docker-*.service"

# View resource usage
systemctl status docker-app.service
```

Systemd integration turns your Docker containers into first-class Linux services. They start in the right order, stop gracefully, restart on failure, and integrate with the tools that every Linux administrator already knows. For single-server deployments and small clusters, this approach gives you robust service management without the overhead of a container orchestrator.
