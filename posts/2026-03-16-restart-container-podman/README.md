# How to Restart a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Lifecycle, Container Management

Description: Learn how to restart containers in Podman with configurable timeouts, and set up automatic restart policies for resilient services.

---

> Restarting containers is the quickest way to apply configuration changes or recover from transient failures without recreating the container.

The `podman restart` command stops and then starts a container in a single operation. It preserves the container's configuration, volumes, and network settings while giving the main process a fresh start. This guide covers all aspects of restarting containers in Podman.

---

## Basic Container Restart

```bash
# Start a container

podman run -d --name my-nginx -p 8080:80 docker.io/library/nginx:latest

# Restart the container
podman restart my-nginx

# Verify it is running
podman ps --filter name=my-nginx
```

## Restart with Custom Timeout

Control how long Podman waits for the container to stop before force-killing it.

```bash
# Restart with a 30-second grace period for shutdown
podman restart --time 30 my-nginx

# Restart with immediate kill (no grace period)
podman restart -t 0 my-nginx
```

## Restarting by Container ID

```bash
# Get the container ID and restart
CONTAINER_ID=$(podman ps -q --filter name=my-nginx)
podman restart "$CONTAINER_ID"
```

## Restarting Multiple Containers

```bash
# Start multiple containers
podman run -d --name svc-web docker.io/library/nginx:latest
podman run -d --name svc-cache docker.io/library/redis:7

# Restart both at once
podman restart svc-web svc-cache

# Verify
podman ps --format "{{.Names}}\t{{.Status}}"
```

## Restarting All Running Containers

```bash
# Restart every running container
podman restart --running

# Alternative: restart only specific containers
podman ps -q | xargs -r podman restart
```

## Restart vs Stop + Start

For a running container, the `podman restart` command is equivalent to running `podman stop` followed by `podman start`, but in a single operation.

```bash
# These two approaches are equivalent:

# Approach 1: restart
podman restart my-nginx

# Approach 2: stop + start
podman stop my-nginx && podman start my-nginx
```

The key difference is that `restart` is shorter to run and also starts stopped containers, while `podman stop my-nginx && podman start my-nginx` only reaches `start` if the stop command succeeds.

## Automatic Restart Policies

Configure containers to restart automatically when they exit or when the system reboots.

```bash
# Always restart when the container exits
podman run -d \
  --name always-up \
  --restart always \
  docker.io/library/nginx:latest

# Restart on failure, up to 5 attempts
podman run -d \
  --name resilient-app \
  --restart on-failure:5 \
  docker.io/library/alpine:latest \
  sh -c 'exit 1'

# Restart unless manually stopped
podman run -d \
  --name unless-stopped \
  --restart unless-stopped \
  docker.io/library/nginx:latest
```

Available restart policies:

- `no` - Do not restart (default)
- `always` - Always restart when the container exits
- `on-failure[:max]` - Restart only on non-zero exit codes, with optional retry limit
- `unless-stopped` - Restart unless explicitly stopped by the user

## Checking Restart Count

```bash
# Check how many times a container has restarted
podman inspect my-nginx --format '{{.RestartCount}}'

# Check the restart policy
podman inspect my-nginx --format '{{.HostConfig.RestartPolicy.Name}}'
```

## Restarting Containers After Host Reboot

Use Quadlet unit files to create systemd services that restart containers on boot. Note that `podman generate systemd` is deprecated in favor of Quadlet.

```bash
# Create a Quadlet container unit file
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/my-nginx.container << 'EOF'
[Container]
Image=docker.io/library/nginx:latest
PublishPort=8080:80
ContainerName=my-nginx

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Reload systemd to pick up the new unit
systemctl --user daemon-reload

# Allow the user service manager to start at boot without an active login session
loginctl enable-linger "$USER"

# Enable and start the service
systemctl --user enable --now my-nginx.service
```

## Scripting Rolling Restarts

```bash
#!/bin/bash
# rolling-restart.sh - Restart containers one at a time

CONTAINERS=("web-1" "web-2" "web-3")

for container in "${CONTAINERS[@]}"; do
  echo "Restarting $container..."
  podman restart -t 15 "$container"

  # Wait for the container to become healthy
  sleep 5

  STATUS=$(podman inspect "$container" --format '{{.State.Status}}')
  if [ "$STATUS" = "running" ]; then
    echo "$container is running"
  else
    echo "WARNING: $container is in state $STATUS"
    exit 1
  fi
done

echo "Rolling restart complete"
```

## Restart After Configuration Change

A common use case is restarting after updating a mounted configuration file.

```bash
# Run nginx with a mounted config
podman run -d --name configured-nginx \
  -v /tmp/nginx.conf:/etc/nginx/nginx.conf:z,ro \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Edit the config file on the host
# ... make changes to /tmp/nginx.conf ...

# Restart to pick up changes
podman restart configured-nginx

# Clean up
podman rm -f configured-nginx
```

## Summary

The `podman restart` command combines stop and start into a single operation, preserving all container configuration. Use `-t` to control the shutdown grace period, and configure `--restart` policies for automatic recovery from failures. For production services, combine restart policies with systemd integration for full lifecycle management.
