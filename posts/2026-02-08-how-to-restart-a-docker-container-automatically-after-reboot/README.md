# How to Restart a Docker Container Automatically After Reboot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Restart Policy, Systemd, DevOps, Uptime, Reliability

Description: Configure Docker containers to start automatically after a system reboot using restart policies, systemd, and Docker Compose settings.

---

Your server reboots. Maybe it was a kernel update, a power outage, or planned maintenance. When it comes back up, are your Docker containers running? Without explicit configuration, they are not. Docker does not automatically restart containers after a system reboot unless you tell it to.

This guide covers every method for ensuring your containers survive reboots, from Docker's built-in restart policies to systemd integration and Docker Compose configurations.

## Docker Restart Policies

Docker provides four restart policies that control container behavior when the container exits or the Docker daemon restarts.

### always

The container restarts under all circumstances, including after a daemon restart (which happens after a reboot).

```bash
# Start a container with the "always" restart policy
docker run -d --restart always --name web -p 80:80 nginx:latest
```

With `always`, the container restarts:
- When the process inside exits (regardless of exit code)
- When the Docker daemon restarts
- After a system reboot (as long as Docker itself starts)

### unless-stopped

Similar to `always`, but respects manual stops. If you explicitly stop a container with `docker stop`, it stays stopped after a reboot.

```bash
# Start a container with the "unless-stopped" restart policy
docker run -d --restart unless-stopped --name web -p 80:80 nginx:latest
```

This is generally the best choice for production services. It survives reboots but respects your intent when you deliberately stop a container.

### on-failure

Restarts only when the container exits with a non-zero exit code. You can optionally limit the number of restart attempts.

```bash
# Restart on failure, up to 5 times
docker run -d --restart on-failure:5 --name worker myapp-worker:latest

# Restart on failure with no limit
docker run -d --restart on-failure --name worker myapp-worker:latest
```

This policy does restart after a reboot, but only if the container was running when the system went down.

### no (default)

No automatic restarts. This is the default behavior.

```bash
# Explicitly set no restart (same as default)
docker run -d --restart no --name temp-service myapp:latest
```

## Comparing Restart Policies

Here is a quick reference for when each policy restarts a container:

| Scenario | no | on-failure | always | unless-stopped |
|----------|-------|-------|-------|-------|
| Container exits with code 0 | No | No | Yes | Yes |
| Container exits with error | No | Yes | Yes | Yes |
| Docker daemon restarts | No | No | Yes | Yes* |
| System reboot | No | No | Yes | Yes* |

*Unless the container was manually stopped before the reboot.

## Updating an Existing Container's Restart Policy

You do not need to recreate a container to change its restart policy. Use `docker update`.

```bash
# Change the restart policy of a running container
docker update --restart unless-stopped web

# Change the restart policy of multiple containers at once
docker update --restart unless-stopped web api worker

# Change all running containers to restart unless stopped
docker update --restart unless-stopped $(docker ps -q)
```

Verify the change:

```bash
# Check the restart policy of a container
docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' web
```

## Ensuring Docker Starts on Boot

Restart policies only work if the Docker daemon itself starts after a reboot. On most Linux distributions, Docker needs to be enabled as a systemd service.

```bash
# Enable Docker to start on boot (systemd-based systems)
sudo systemctl enable docker

# Verify Docker is enabled
sudo systemctl is-enabled docker

# Check Docker's current status
sudo systemctl status docker
```

On older systems using SysVinit:

```bash
# Enable Docker on boot (SysVinit)
sudo chkconfig docker on
```

## Docker Compose Restart Policies

In Docker Compose, set the restart policy in the service definition.

```yaml
# docker-compose.yml with restart policies
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    restart: unless-stopped

  api:
    image: myapp-api:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  pgdata:
```

Start the stack:

```bash
# Start all services with their configured restart policies
docker compose up -d
```

## Using systemd for Fine-Grained Control

For more control over startup order, dependencies, and failure handling, manage your Docker containers through systemd service units.

```ini
# /etc/systemd/system/myapp-web.service
[Unit]
Description=MyApp Web Container
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
RestartSec=10

# Stop and remove any existing container, then start fresh
ExecStartPre=-/usr/bin/docker stop myapp-web
ExecStartPre=-/usr/bin/docker rm myapp-web
ExecStart=/usr/bin/docker run --rm --name myapp-web \
  -p 80:80 \
  nginx:latest

ExecStop=/usr/bin/docker stop myapp-web

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd to pick up the new unit file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable myapp-web

# Start the service now
sudo systemctl start myapp-web

# Check status
sudo systemctl status myapp-web
```

The advantage of systemd units over Docker restart policies includes proper logging through journald, dependency ordering, and integration with the system's service management.

## Managing Dependencies Between Containers

Some containers depend on others. A web application needs its database running first. Docker restart policies do not guarantee startup order, but systemd can handle this.

```ini
# /etc/systemd/system/myapp-db.service
[Unit]
Description=MyApp Database
After=docker.service
Requires=docker.service

[Service]
Restart=always
ExecStartPre=-/usr/bin/docker stop myapp-db
ExecStartPre=-/usr/bin/docker rm myapp-db
ExecStart=/usr/bin/docker run --rm --name myapp-db \
  -v pgdata:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine
ExecStop=/usr/bin/docker stop myapp-db

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/myapp-web.service
[Unit]
Description=MyApp Web
After=docker.service myapp-db.service
Requires=docker.service myapp-db.service

[Service]
Restart=always
RestartSec=5
ExecStartPre=-/usr/bin/docker stop myapp-web
ExecStartPre=-/usr/bin/docker rm myapp-web
ExecStart=/usr/bin/docker run --rm --name myapp-web \
  --link myapp-db:db \
  -p 80:80 \
  myapp:latest
ExecStop=/usr/bin/docker stop myapp-web

[Install]
WantedBy=multi-user.target
```

## Testing Restart Behavior

Verify your configuration works by simulating a reboot.

```bash
# Method 1: Restart the Docker daemon (simulates daemon restart)
sudo systemctl restart docker

# Wait a moment, then check which containers are running
sleep 10
docker ps

# Method 2: Check container restart counts
docker inspect --format '{{.RestartCount}}' web

# Method 3: Check the last time the container started
docker inspect --format '{{.State.StartedAt}}' web
```

## Monitoring Restart Events

Keep track of container restarts to detect problems like crash loops.

```bash
# View restart history for a container
docker inspect --format '{{.RestartCount}} restarts since {{.Created}}' web

# Check if a container is in a restart loop
docker events --filter 'event=restart' --filter 'container=web'
```

A container that keeps restarting indicates an application problem. Check its logs:

```bash
# View logs from the most recent start
docker logs --since 5m web
```

## Handling Crash Loops

If a container keeps crashing and restarting, Docker's restart policy will keep trying. With `on-failure:N`, you can limit this.

```bash
# Limit restart attempts to prevent infinite crash loops
docker run -d --restart on-failure:10 --name worker myapp-worker:latest
```

After 10 failed restarts, Docker stops trying. You can then investigate and fix the issue.

## Conclusion

Making Docker containers survive reboots requires two things: enabling the Docker daemon to start on boot with `systemctl enable docker`, and setting a restart policy on your containers. Use `unless-stopped` for most services since it automatically restarts after reboots while respecting manual stops. For complex multi-container setups with strict ordering requirements, systemd service units give you the most control. Test your configuration by restarting the Docker daemon and verifying containers come back up correctly.
