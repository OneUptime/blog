# How to Configure the Log Driver for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Configuration

Description: Learn how to configure and switch between different log drivers in Podman, including k8s-file, journald, json-file, and passthrough, to control how container logs are stored and accessed.

---

> Choosing the right log driver determines where your container logs go, how they are stored, and what tools you can use to access them.

Podman supports multiple log drivers that control how container stdout and stderr output is captured and stored. Each driver has different trade-offs for performance, features, and integration with external logging systems.

---

## Available Log Drivers

Podman supports the following log drivers:

- **journald** (default on systems where the systemd journal is available): Sends logs to the systemd journal.
- **k8s-file**: Writes logs to a file in Kubernetes log format.
- **json-file**: Alias for k8s-file (provided for Docker scripting compatibility).
- **passthrough**: No log storage by Podman; output passes directly through to the parent process.
- **none**: Disables log storage; output is still visible in interactive sessions but cannot be replayed with `podman logs`.

## Check the Current Log Driver

```bash
# Check the default log driver for new containers

podman info --format '{{.Host.LogDriver}}'

# Check the log driver for an existing container
podman inspect --format '{{.HostConfig.LogConfig.Type}}' my-container

# Check the log driver and its options
podman inspect --format '{{json .HostConfig.LogConfig}}' my-container | python3 -m json.tool
```

## Set the Log Driver at Container Creation

```bash
# Use the journald log driver
podman run -d --log-driver journald --name my-app my-image:latest

# Use the json-file log driver
podman run -d --log-driver json-file --name my-app my-image:latest

# Use the k8s-file log driver
podman run -d --log-driver k8s-file --name my-app my-image:latest

# Use passthrough (no log capture)
podman run -d --log-driver passthrough --name my-app my-image:latest

# Disable logging entirely
podman run -d --log-driver none --name my-app my-image:latest
```

## Set Log Driver Options

Podman supports driver-specific options via `--log-opt`.

```bash
# json-file with a max size
podman run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --name my-app my-image:latest

# journald with a custom tag
podman run -d \
  --log-driver journald \
  --log-opt tag="{{.Name}}" \
  --name my-app my-image:latest

# k8s-file with max size
podman run -d \
  --log-driver k8s-file \
  --log-opt max-size=50m \
  --name my-app my-image:latest
```

## Change the Default Log Driver

Set the default log driver for all new containers system-wide.

```bash
# Edit the containers.conf file
# For rootless: ~/.config/containers/containers.conf
# For root: /etc/containers/containers.conf

mkdir -p ~/.config/containers

cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
log_driver = "journald"
EOF

# Verify the new default
podman info --format '{{.Host.LogDriver}}'
```

## Compare Log Drivers

```bash
# Test each log driver and compare behavior

# k8s-file: logs are stored as plain text files
podman run -d --log-driver k8s-file --name test-k8s alpine sh -c 'echo "hello from k8s-file"'
podman logs test-k8s
podman inspect --format '{{.HostConfig.LogConfig.Path}}' test-k8s

# journald: logs go to systemd journal
podman run -d --log-driver journald --name test-journald alpine sh -c 'echo "hello from journald"'
podman logs test-journald
journalctl CONTAINER_NAME=test-journald --no-pager

# json-file: alias for k8s-file, so logs use the Kubernetes log format
podman run -d --log-driver json-file --name test-json alpine sh -c 'echo "hello from json-file"'
podman logs test-json
podman inspect --format '{{.HostConfig.LogConfig.Path}}' test-json

# Clean up
podman rm test-k8s test-journald test-json
```

## Log Driver in Podman Compose

Set the log driver in your compose file.

```yaml
# podman-compose.yml
services:
  web:
    image: nginx:latest
    logging:
      driver: journald
      options:
        tag: "{{.Name}}"

  api:
    image: my-api:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"

  worker:
    image: my-worker:latest
    logging:
      driver: k8s-file
      options:
        max-size: "50m"
```

## Choosing the Right Log Driver

Here is a quick decision guide:

```bash
# Use k8s-file when:
# - You want simple file-based logs
# - You are running Podman-generated Kubernetes YAML
# - You want logs accessible via podman logs

# Use journald (default) when:
# - You want centralized system logging
# - You need structured metadata (container name, ID, image)
# - You want to query logs with journalctl

# Use json-file (alias for k8s-file) when:
# - You need Docker-compatible scripting
# - You want logs in the same Kubernetes log format as k8s-file
# - You want size limits via max-size

# Use passthrough when:
# - You are running interactive containers
# - The application handles its own logging
# - You want minimal overhead

# Use none when:
# - The container generates excessive, unneeded logs
# - You want to minimize disk I/O
# - Note: output is still visible in interactive sessions, just not stored
```

## Summary

Podman's log driver configuration gives you control over where container logs are stored and how they are formatted. Set the driver per container with `--log-driver`, pass options with `--log-opt`, or change the system-wide default in `containers.conf`. The default log driver is journald on systems where the systemd journal is available. Choose between journald for system integration, k8s-file for file-based logs, json-file (alias for k8s-file) for Docker compatibility, or passthrough for minimal overhead.
