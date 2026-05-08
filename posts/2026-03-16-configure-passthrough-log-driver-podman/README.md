# How to Configure the passthrough Log Driver in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Configuration

Description: Learn how to use Podman's passthrough log driver to bypass log storage entirely, sending container output directly to the terminal or parent process for minimal overhead.

---

> The passthrough log driver tells Podman to skip log capture entirely, letting output flow directly to the parent process with zero storage overhead.

The passthrough log driver in Podman is a specialized option that does not store logs at all. Instead, container stdout and stderr pass directly through to the terminal or parent process. This is useful for foreground containers, CI/CD pipelines, or situations where an external system handles logging. For TTY-based interactive containers, use `passthrough-tty`.

---

## Basic passthrough Usage

```bash
# Run a container with the passthrough log driver

podman run -d \
  --log-driver passthrough \
  --name my-app \
  my-image:latest

# Note: podman logs will NOT work with passthrough
podman logs my-app
# Error: this container is using the "passthrough" log driver, cannot read logs

# The output goes directly to the terminal or parent process
# For detached containers, output is lost unless captured externally
```

## When to Use passthrough

The passthrough driver is appropriate in specific scenarios.

```bash
# Scenario 1: Interactive TTY containers where you see output directly
podman run -it --log-driver passthrough-tty alpine sh

# Scenario 2: CI/CD pipelines where output goes to the build log
podman run --log-driver passthrough my-test-image:latest npm test

# Scenario 3: Applications that handle their own logging
podman run -d \
  --log-driver passthrough \
  -v /var/log/app:/app/logs \
  my-app:latest
# The app writes to /app/logs, Podman does not need to capture stdout

# Scenario 4: High-throughput containers where log overhead matters
podman run -d \
  --log-driver passthrough \
  --name data-processor \
  my-processor:latest
```

## passthrough vs none

Both drivers avoid storing logs, but they behave differently.

```bash
# passthrough: actual stdio file descriptors are passed directly to the container
# If run in foreground, you see the output
podman run --log-driver passthrough alpine echo "You see this"
# Output: You see this

# none: output is still visible on the terminal but not stored
podman run --log-driver none alpine echo "You see this but it is not stored"
# Output: You see this but it is not stored

# Verify the difference:
# passthrough - stdio is passed directly to the container
podman run --rm --log-driver passthrough alpine echo "passthrough test"

# none - output is visible in foreground mode but not stored for later retrieval
podman run --rm --log-driver none alpine echo "none test"

# Both fail with podman logs:
podman run -d --log-driver passthrough --name test1 alpine sleep 60
podman run -d --log-driver none --name test2 alpine sleep 60
podman logs test1  # Error: cannot read logs
podman logs test2  # Error: cannot read logs
podman rm -f test1 test2
```

## Capture passthrough Output Externally

Since Podman does not store logs, capture them yourself if needed.

```bash
# Capture output to a file when running in foreground
podman run --log-driver passthrough my-image:latest > output.log 2>&1

# Capture output with tee (see output and save to file)
podman run --log-driver passthrough my-image:latest 2>&1 | tee output.log

# Redirect to an external logging system
podman run --log-driver passthrough my-image:latest 2>&1 | \
  logger -t my-container -p local0.info

# Redirect to a file with rotation using rotatelogs
podman run --log-driver passthrough my-image:latest 2>&1 | \
  rotatelogs /var/log/my-container-%Y%m%d.log 86400
```

## Use passthrough with systemd Services

When running Podman containers as systemd services, passthrough output goes to journald via systemd.

```bash
# Create a systemd service file
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/my-container.service << 'EOF'
[Unit]
Description=My Container
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/podman run \
  --rm \
  --log-driver passthrough \
  --name my-container \
  my-image:latest
ExecStop=/usr/bin/podman stop my-container
Restart=always

[Install]
WantedBy=default.target
EOF

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable --now my-container

# With passthrough, container output goes through systemd to journald
journalctl --user -u my-container -f
```

## passthrough in Podman Compose

```yaml
# podman-compose.yml
services:
  # Foreground or self-logging service
  data-processor:
    image: my-processor:latest
    logging:
      driver: passthrough
    volumes:
      - ./logs:/app/logs  # App writes its own logs

  # Service that needs logs (uses default driver)
  web:
    image: nginx:latest
    # Uses the configured default log driver
```

## Performance Considerations

```bash
# Measure the difference between log drivers
# Test with a high-output container

# With the k8s-file log driver
time podman run --rm --log-driver k8s-file \
  alpine sh -c 'for i in $(seq 1 10000); do echo "line $i"; done' > /dev/null 2>&1

# With passthrough (no log processing overhead)
time podman run --rm --log-driver passthrough \
  alpine sh -c 'for i in $(seq 1 10000); do echo "line $i"; done' > /dev/null 2>&1

# With none (no log storage)
time podman run --rm --log-driver none \
  alpine sh -c 'for i in $(seq 1 10000); do echo "line $i"; done' > /dev/null 2>&1

# passthrough and none should be faster for high-volume output
```

## Set passthrough as Default

```bash
# Set passthrough as default (only if you have external logging in place)
mkdir -p ~/.config/containers

cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "passthrough"
EOF

# Override for specific containers that need logs
podman run -d --log-driver k8s-file --name needs-logs my-image:latest
```

## Summary

The passthrough log driver bypasses Podman's log storage, sending output directly to the parent process. Use it for foreground containers, CI/CD pipelines, applications that manage their own logging, or high-throughput scenarios where log processing overhead matters. Use `passthrough-tty` when you need the same behavior with a TTY. Remember that `podman logs` will not work with passthrough, so ensure you have an alternative log capture mechanism in place. When running as systemd services, passthrough output flows naturally through systemd to journald.
