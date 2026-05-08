# How to Configure Log Drivers in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Logging, Log Drivers

Description: Learn how to configure log drivers in Podman Quadlet container files to control how container logs are collected and stored.

---

> Control how container output is captured and stored by configuring log drivers in your Quadlet container files.

Podman supports multiple log drivers that determine how container stdout and stderr are captured. The default driver varies by configuration, but you can set it explicitly in Quadlet to ensure consistent logging behavior across your containers.

---

## Available Log Drivers

Podman supports these log drivers:

- **journald** - Logs to the systemd journal (default for systemd-managed containers)
- **k8s-file** - Logs to JSON files in Kubernetes format
- **none** - Disables logging
- **passthrough** - Passes container output directly to the service stdout/stderr
- **passthrough-tty** - Like passthrough, but allows use on a TTY

Podman also accepts **json-file** as an alias for k8s-file for scripting compatibility.

## Using the journald Log Driver

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=Application with journald logging

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
PublishPort=3000:3000

# Use journald for structured logging
LogDriver=journald

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

View logs with journalctl:

```bash
# View container logs through journald
journalctl --user -u myapp.service -f

# Filter by container name
journalctl --user CONTAINER_NAME=myapp
```

## Using the k8s-file Log Driver

```ini
[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
# Log to JSON files
LogDriver=k8s-file
```

View logs with podman:

```bash
# View logs stored in k8s-file format
podman logs myapp

# Follow logs
podman logs -f myapp

# Show timestamps
podman logs -t myapp
```

## Using the passthrough Log Driver

The passthrough driver is ideal for Quadlet services where you want logs to flow through systemd:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=Application with passthrough logging

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
# Pass logs directly to systemd
LogDriver=passthrough

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Disabling Logging

```ini
[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
# Disable logging entirely
LogDriver=none
```

## Configuring Log Options

Add log driver options with LogOpt:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
LogDriver=k8s-file
# Set maximum log file size
LogOpt=max-size=10mb
```

## Verify Log Configuration

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start myapp.service

# Check the configured log driver
podman inspect myapp --format '{{.HostConfig.LogConfig.Type}}'

# View logs with podman for journald or k8s-file
podman logs myapp
```

## Summary

Quadlet supports journald, k8s-file, passthrough, passthrough-tty, and none log drivers through the `LogDriver` directive. Use journald for integration with the systemd journal, k8s-file for JSON file logging, passthrough for direct systemd output, and configure log options with `LogOpt` entries. For Quadlet services, journald and passthrough are common choices.
