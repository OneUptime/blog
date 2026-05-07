# How to Configure Default Log Driver in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Logging

Description: Learn how to configure the default container log driver in containers.conf to control how Podman captures and stores container output.

---

> Choosing the right log driver ensures your container logs are captured reliably and stored in a format that integrates with your monitoring infrastructure.

Podman supports multiple log drivers that control how container stdout and stderr are captured and stored. The default log driver can be set in `containers.conf`, affecting all containers unless overridden at runtime. This guide covers the common log drivers and helps you choose the right one for your environment.

---

## Understanding Available Log Drivers

Podman provides several log driver options.

```bash
# Check the current default log driver

podman info --format '{{.Host.LogDriver}}'

# Available log drivers:
# k8s-file  - Kubernetes-compatible JSON file logging
# journald  - Log to systemd journal
# none      - Disable logging entirely
# passthrough - Pass logs directly to the standard streams (Podman 4.0+)
# passthrough-tty - Like passthrough, but also allowed on a TTY
#
# Podman uses journald by default when the systemd journal is readable
# and writable; otherwise it uses k8s-file.
```

## Configuring the k8s-file Driver

The `k8s-file` driver writes JSON-formatted logs to files.

```bash
# Set k8s-file as the default log driver
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Use k8s-file for Kubernetes-compatible JSON logging
# Logs are stored as JSON files alongside the container storage
log_driver = "k8s-file"

# Maximum log file size before truncation (default: unlimited)
# log_size_max = 1048576
EOF

# Test the log driver
podman run --name log-test --rm alpine echo "Testing k8s-file log driver"

# View logs from a running container
podman run -d --name log-demo alpine sh -c 'for i in $(seq 1 5); do echo "Log entry $i"; sleep 1; done'
sleep 6
podman logs log-demo
podman rm log-demo
```

```bash
# Find where k8s-file logs are stored
podman run -d --name log-location alpine sleep 30
podman inspect log-location --format '{{.HostConfig.LogConfig.Path}}' 2>/dev/null
podman rm -f log-location
```

## Configuring the journald Driver

The `journald` driver integrates with systemd's journal.

```bash
# Set journald as the default log driver
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Use journald for integration with systemd logging
# Requires systemd-journald to be running
log_driver = "journald"
EOF

# Verify journald is available
systemctl is-active systemd-journald 2>/dev/null && echo "journald is running"

# Run a container with journald logging
podman run --name journal-test alpine echo "Testing journald driver"

# View logs via journalctl
journalctl CONTAINER_NAME=journal-test --no-pager 2>/dev/null | tail -5

# View logs via podman logs
podman logs journal-test
podman rm journal-test
```

## Configuring Log Size Limits

Prevent container logs from consuming excessive disk space.

```bash
# Configure a log size limit with k8s-file driver
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "k8s-file"

# Maximum size of each log file in bytes
# -1 = unlimited (default)
# Set to 10MB
log_size_max = 10485760
EOF

# Test log size limits
podman run -d --name log-size-test alpine sh -c '
    # Generate a lot of log output
    for i in $(seq 1 1000); do
        echo "Log line $i: $(date) - This is a test log entry with some padding text"
    done
'

# Check the log output
sleep 3
podman logs log-size-test | wc -l
podman rm -f log-size-test
```

## Disabling Logging

Use the `none` driver when logging is unnecessary.

```bash
# Disable logging for performance-sensitive workloads
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Disable all container logging
# Use for batch jobs or when external logging is configured
log_driver = "none"
EOF

# Containers will not store any logs
podman run -d --name no-logs alpine echo "This will not be logged"
podman logs no-logs 2>&1 || echo "No logs available as expected"
podman rm -f no-logs
```

## Overriding the Log Driver Per Container

Change the log driver for individual containers at runtime.

```bash
# Set a sensible default
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "k8s-file"
log_size_max = 10485760
EOF

# Override per container using --log-driver
podman run --rm --log-driver=journald alpine echo "Using journald for this container"
podman run --rm --log-driver=none alpine echo "No logging for this container"

# Override log options with --log-opt
podman run --rm --log-opt max-size=5m alpine echo "Custom log size"

# Verify the log driver for a specific container
podman run -d --name check-driver alpine sleep 30
podman inspect check-driver --format '{{.HostConfig.LogConfig.Type}}'
podman rm -f check-driver
```

## Comparing Log Drivers

Choose the best driver for your use case.

```bash
# k8s-file: Best for Kubernetes compatibility and file-based access
# - Logs stored as JSON files
# - Easy to parse and forward to log aggregators
# - Supports a log size limit

# journald: Best for systemd-based systems
# - Integrated with journalctl
# - Structured logging with metadata
# - Automatic log management by systemd

# none: Best for performance or external logging
# - Zero overhead from log capture
# - Use when application handles its own logging

# Verify your chosen driver works
podman info --format '{{.Host.LogDriver}}'
podman run --rm alpine echo "Log driver verification complete"
```

## Summary

The default log driver in `containers.conf` controls how Podman captures container output. Use `k8s-file` for Kubernetes-compatible JSON logging with optional size limits, `journald` for systemd integration, or `none` when logging is handled externally. Set the default in the `[containers]` section and override per container using `--log-driver` when needed. For file-based logging, configure `log_size_max` to prevent runaway log files from filling your disk.
