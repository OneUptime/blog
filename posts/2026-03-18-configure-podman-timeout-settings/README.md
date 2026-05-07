# How to Configure Podman Timeout Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Performance, Timeout

Description: Learn how to configure timeout settings in Podman for container operations, service idle time, and network connections to optimize reliability and performance.

---

> Properly configured timeouts prevent hung operations from blocking your workflows while giving slow operations enough time to complete.

Podman has several timeout and retry settings that affect container shutdown, API service idle time, health checks, and image pulls. Getting these right is important: too short and legitimate operations fail; too long and hung processes waste resources. This guide covers the main timeout-related settings you can configure in Podman and how to set them for your environment.

---

## Service Timeout

The Podman system service has an idle timeout that controls how long it runs without activity.

```bash
# Start the service with the default 5-second idle timeout

podman system service --time 5

# Run the service indefinitely (no timeout)
podman system service --time 0

# Set a 60-second idle timeout
podman system service --time 60

# Set a 5-minute idle timeout
podman system service --time 300

# For systemd-managed service, override via drop-in
mkdir -p ~/.config/systemd/user/podman.service.d
cat > ~/.config/systemd/user/podman.service.d/timeout.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/podman system service --time 0
EOF
systemctl --user daemon-reload
systemctl --user restart podman.service
```

## Container Stop Timeout

Control how long Podman waits for a container to stop gracefully before sending SIGKILL.

```bash
# Stop a container with the default timeout (10 seconds)
podman stop my-container

# Stop with a custom timeout (30 seconds)
podman stop --time 30 my-container

# Stop immediately (send SIGKILL right away)
podman stop --time 0 my-container

# Wait indefinitely for a graceful stop
podman stop --time -1 my-container

# Set the default stop timeout when creating a container
podman run -d --stop-timeout 30 --name graceful-app nginx:alpine

# Set the default stop timeout in containers.conf
cat >> ~/.config/containers/containers.conf << 'EOF'
[engine]
stop_timeout = 30
EOF
```

## Container Init Binary

Configure the init binary Podman uses when `--init` is enabled.

```bash
# Run a container with an init process
podman run -d --init --name init-app nginx:alpine

# The init binary path can be configured in containers.conf
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
# Path to the container init binary
init_path = "/usr/libexec/podman/catatonit"
EOF
```

## Pull Retry Settings

Configure retry behavior for image pull operations. Podman does not expose a dedicated per-pull timeout flag, but retries and retry delays help with transient registry or network failures.

```bash
# Pull with a retry count (helps with slow connections)
podman pull --retry 3 docker.io/library/nginx:latest

# Configure pull retry delay
podman pull --retry-delay 5s docker.io/library/nginx:latest

# Set pull-related retry defaults in containers.conf
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[engine]
retry = 3
retry_delay = "5s"
EOF

# For one-off pull retry defaults, use a custom containers.conf
CONTAINERS_CONF=~/.config/containers/containers.conf \
    podman pull large-image:latest
```

## HTTP Timeout for API Calls

Configure timeouts for Podman REST API client connections.

```bash
# Set a timeout when calling the API with curl
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    --max-time 30 \
    --connect-timeout 5 \
    http://localhost/v4.0.0/libpod/containers/json

# For remote connections, set SSH timeout
podman --remote \
    --url ssh://user@host/run/user/1000/podman/podman.sock \
    ps

# Or use a named connection
podman --connection remote-host ps

# Configure SSH connection timeout in ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'
Host podman-*
    ConnectTimeout 10
    ServerAliveInterval 30
    ServerAliveCountMax 3
EOF
```

## Healthcheck Timeout

Configure timeouts for container health check operations.

```bash
# Run a container with a health check and specific timeout
podman run -d \
    --name web-server \
    --health-cmd "curl -f http://localhost/ || exit 1" \
    --health-interval 30s \
    --health-timeout 10s \
    --health-retries 3 \
    --health-start-period 15s \
    nginx:alpine

# Check the health status
podman healthcheck run web-server

# Inspect health check configuration
podman inspect web-server --format '{{.Config.Healthcheck}}'
```

## Exec Timeout

Control timeouts for exec operations inside running containers.

```bash
# Execute a command with a time limit using timeout inside the container
podman exec my-container timeout 30 long-running-command

# For the exec operation itself, use the detach-keys to exit if needed
podman exec -it --detach-keys="ctrl-q" my-container bash
```

## Systemd Unit Timeouts

Configure timeouts for Podman-managed systemd units.

```bash
# Set timeouts in the Podman systemd service unit
mkdir -p ~/.config/systemd/user/podman.service.d
cat > ~/.config/systemd/user/podman.service.d/timeouts.conf << 'EOF'
[Service]
# Time to wait for the service to start
TimeoutStartSec=60

# Time to wait for the service to stop
TimeoutStopSec=30

# Maximum time a service can run (0 = unlimited)
RuntimeMaxSec=0

# Watchdog timeout (service must notify within this interval)
WatchdogSec=0
EOF

systemctl --user daemon-reload
```

## Network Connection Timeouts

Configure DNS settings for containers and use command-level timeouts for network checks. Podman does not expose a general container network timeout setting in `containers.conf`.

```bash
# Set DNS servers in containers.conf
mkdir -p ~/.config/containers
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
# DNS servers for containers
dns_servers = ["8.8.8.8", "8.8.4.4"]
EOF

# Test network connectivity with timeout from inside a container
podman run --rm alpine timeout 5 wget -q -O- http://example.com
```

## Creating a Timeout Configuration Script

Automate timeout configuration for consistent settings across hosts.

```bash
#!/bin/bash
# configure-timeouts.sh - Set up Podman timeout configuration

CONFIG_DIR="$HOME/.config/containers"
SYSTEMD_DIR="$HOME/.config/systemd/user"
mkdir -p "$CONFIG_DIR" "$SYSTEMD_DIR/podman.service.d"

# Configure container timeouts
cat > "$CONFIG_DIR/containers.conf" << 'EOF'
[engine]
# Default stop timeout for containers (seconds)
stop_timeout = 30
service_timeout = 0
retry = 3
retry_delay = "5s"

[containers]
dns_servers = ["8.8.8.8", "8.8.4.4"]
EOF

# Configure systemd service timeouts
cat > "$SYSTEMD_DIR/podman.service.d/timeouts.conf" << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/podman system service --time 0
TimeoutStartSec=60
TimeoutStopSec=30
Restart=on-failure
RestartSec=10
EOF

# Reload systemd
systemctl --user daemon-reload

echo "Timeout configuration applied:"
echo "  Container stop timeout: 30s"
echo "  Service idle timeout: disabled (runs forever)"
echo "  Pull retries: 3 with 5s delay"
echo "  Service start timeout: 60s"
echo "  Service stop timeout: 30s"
echo "  Restart delay: 10s"
```

## Summary

Timeout configuration is a critical aspect of running Podman reliably. Configure the system service timeout based on your usage pattern (0 for always-on, shorter for on-demand), set container stop timeouts to match application shutdown requirements, and tune health check timeouts for accurate monitoring. Use containers.conf for container-level and engine-level settings and systemd drop-in files for service-level controls to build a timeout strategy that balances responsiveness with reliability.
