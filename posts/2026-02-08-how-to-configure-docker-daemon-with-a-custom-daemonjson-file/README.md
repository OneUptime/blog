# How to Configure Docker Daemon with a Custom daemon.json File

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Configuration, daemon.json, Linux, DevOps, Containers, Logging, Storage, Networking

Description: A comprehensive guide to configuring the Docker daemon through the daemon.json file, covering logging, storage, networking, security, and performance tuning options.

---

The `daemon.json` file is Docker's primary configuration file. It controls everything from log management to storage drivers, networking defaults, security settings, and runtime behavior. Understanding this file is essential for anyone running Docker in production. This guide covers the most important configuration options with practical examples.

## Where Is daemon.json?

The file lives at `/etc/docker/daemon.json` on Linux. If it does not exist, create it.

```bash
# Create the Docker config directory and an empty daemon.json
sudo mkdir -p /etc/docker
sudo touch /etc/docker/daemon.json
```

On macOS (Docker Desktop), the file is at `~/.docker/daemon.json` or managed through the Docker Desktop GUI.

On Windows (Docker Desktop), it is at `%USERPROFILE%\.docker\daemon.json`.

## Basic Structure

The file uses standard JSON format.

```json
{
  "key": "value",
  "nested-key": {
    "sub-key": "sub-value"
  }
}
```

Every change to `daemon.json` requires a Docker restart to take effect.

```bash
# Apply changes by reloading systemd and restarting Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Some options support live reload (without restarting). Trigger a live reload with:

```bash
# Send SIGHUP to reload compatible settings
sudo kill -SIGHUP $(pidof dockerd)
```

Options that support live reload include `debug`, `labels`, and `shutdown-timeout`. Most other options require a full restart.

## Log Configuration

Logging is one of the most important production settings. Without limits, container logs can fill your disk.

### JSON File Logging with Rotation

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5",
    "compress": "true"
  }
}
```

This keeps a maximum of 5 log files per container, each capped at 10 MB, with gzip compression on rotated files. Total maximum log storage per container: 50 MB.

### Syslog Driver

Send container logs to the system syslog daemon.

```json
{
  "log-driver": "syslog",
  "log-opts": {
    "syslog-address": "udp://localhost:514",
    "syslog-facility": "daemon",
    "tag": "docker/{{.Name}}"
  }
}
```

### Journald Driver

On systemd-based systems, send logs to journald.

```json
{
  "log-driver": "journald",
  "log-opts": {
    "tag": "docker/{{.Name}}"
  }
}
```

View logs with `journalctl`.

```bash
# View logs for a specific container
journalctl CONTAINER_NAME=my-app --no-pager -n 50
```

### Fluentd Driver

For centralized logging with Fluentd:

```json
{
  "log-driver": "fluentd",
  "log-opts": {
    "fluentd-address": "localhost:24224",
    "tag": "docker.{{.Name}}",
    "fluentd-async": "true"
  }
}
```

## Storage Driver Configuration

The storage driver controls how Docker stores image layers and container data.

### Overlay2 (Recommended for Most Systems)

```json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
```

### Btrfs (For Btrfs Filesystems)

```json
{
  "storage-driver": "btrfs"
}
```

### Custom Data Directory

Move Docker's data to a different disk or partition.

```json
{
  "data-root": "/mnt/docker-data"
}
```

Before changing this, stop Docker and move existing data.

```bash
# Stop Docker
sudo systemctl stop docker

# Copy existing data to the new location
sudo rsync -aP /var/lib/docker/ /mnt/docker-data/

# Update daemon.json with the new data-root
# Then start Docker
sudo systemctl start docker
```

## Networking Configuration

### Default Bridge Network Subnet

Avoid IP conflicts with your corporate network by changing Docker's default subnet.

```json
{
  "bip": "172.26.0.1/16",
  "default-address-pools": [
    {
      "base": "172.80.0.0/16",
      "size": 24
    },
    {
      "base": "172.90.0.0/16",
      "size": 24
    }
  ]
}
```

The `bip` setting controls the default bridge network (`docker0`). The `default-address-pools` setting controls the IP ranges used for user-defined networks.

### DNS Configuration

Set DNS servers for all containers.

```json
{
  "dns": ["8.8.8.8", "1.1.1.1"],
  "dns-search": ["example.com"],
  "dns-opts": ["ndots:2"]
}
```

### IPv6 Support

Enable IPv6 networking for Docker containers.

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/80"
}
```

### Disable Automatic iptables Management

If you manage firewall rules manually:

```json
{
  "iptables": false
}
```

Warning: disabling iptables management means Docker will not create NAT rules for port mapping. You must handle this yourself.

## Security Configuration

### Userns Remap

Run container processes as non-root on the host for better security isolation.

```json
{
  "userns-remap": "default"
}
```

This maps container root (UID 0) to a high UID on the host, limiting the damage if a container breakout occurs.

### Seccomp Profile

Use a custom seccomp profile to restrict system calls.

```json
{
  "seccomp-profile": "/etc/docker/seccomp-custom.json"
}
```

### Disable Inter-Container Communication

Prevent containers on the default bridge from communicating with each other.

```json
{
  "icc": false
}
```

Containers must then be explicitly linked or use user-defined networks to communicate.

### TLS Configuration

Secure the Docker daemon socket with TLS.

```json
{
  "tls": true,
  "tlsverify": true,
  "tlscacert": "/etc/docker/tls/ca.pem",
  "tlscert": "/etc/docker/tls/server-cert.pem",
  "tlskey": "/etc/docker/tls/server-key.pem"
}
```

## Runtime and Performance

### Cgroup Driver

Match Docker's cgroup driver with your init system. For systemd-based systems:

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
```

### Default ulimits

Set resource limits for all containers.

```json
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 32768
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 2048
    }
  }
}
```

### Live Restore

Keep containers running during Docker daemon restarts.

```json
{
  "live-restore": true
}
```

This is critical for production environments. Without it, restarting Docker kills all running containers.

### Default Runtime

If you use multiple container runtimes (for example, `runc` and `nvidia` for GPU containers):

```json
{
  "default-runtime": "runc",
  "runtimes": {
    "nvidia": {
      "path": "/usr/bin/nvidia-container-runtime",
      "runtimeArgs": []
    }
  }
}
```

### Shutdown Timeout

Control how long Docker waits for containers to stop during shutdown.

```json
{
  "shutdown-timeout": 30
}
```

The default is 15 seconds. Increase this for containers that need more time for graceful shutdown.

## Registry and Image Configuration

### Insecure Registries

Allow Docker to connect to registries without TLS (for development only).

```json
{
  "insecure-registries": [
    "registry.local:5000",
    "10.0.0.50:5000"
  ]
}
```

### Registry Mirrors

Speed up image pulls by using a mirror.

```json
{
  "registry-mirrors": [
    "https://mirror.example.com"
  ]
}
```

## Monitoring and Metrics

### Prometheus Metrics

Expose Docker daemon metrics for Prometheus scraping.

```json
{
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true
}
```

Scrape metrics at `http://your-host:9323/metrics`.

### Debug Mode

Enable debug logging for troubleshooting.

```json
{
  "debug": true
}
```

This increases log verbosity significantly. Turn it off after debugging.

## A Complete Production Configuration

Here is a comprehensive `daemon.json` for production servers.

```json
{
  "storage-driver": "overlay2",
  "data-root": "/var/lib/docker",
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5",
    "compress": "true"
  },
  "live-restore": true,
  "shutdown-timeout": 30,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 32768
    }
  },
  "default-address-pools": [
    {
      "base": "172.80.0.0/16",
      "size": 24
    }
  ],
  "dns": ["8.8.8.8", "1.1.1.1"],
  "metrics-addr": "127.0.0.1:9323",
  "experimental": false,
  "icc": false
}
```

## Validating daemon.json

A syntax error in `daemon.json` will prevent Docker from starting. Always validate the file before restarting Docker.

```bash
# Validate JSON syntax with Python
python3 -m json.tool /etc/docker/daemon.json

# Or with jq
jq . /etc/docker/daemon.json
```

If either command prints the formatted JSON, the syntax is valid. If it prints an error, fix the issue before restarting Docker.

## Troubleshooting

### Docker fails to start after editing daemon.json

Check the journal for specific errors.

```bash
# View Docker daemon startup errors
sudo journalctl -u docker --no-pager -n 20
```

Common issues:
- **Trailing comma** in the last key-value pair
- **Conflicting options** between daemon.json and command-line flags
- **Invalid values** for configuration keys

### Conflicting command-line flags

Docker will refuse to start if the same option is set both in `daemon.json` and as a command-line flag in the systemd unit. Check for conflicts.

```bash
# Check Docker's systemd unit for command-line flags
systemctl cat docker.service | grep ExecStart
```

If you see flags like `--storage-driver` or `--log-driver` in the ExecStart line, remove them from either the unit file or `daemon.json`.

### Changes not taking effect

Some settings only apply to new containers, not existing ones. For example, changing the default log driver only affects containers created after the change. Existing containers keep their original log driver.

## Summary

The `daemon.json` file is the single point of configuration for the Docker daemon. The most impactful settings for production are log rotation (to prevent disk exhaustion), `live-restore` (to keep containers running during daemon restarts), the cgroup driver (to match systemd), and network address pools (to avoid IP conflicts). Always validate the JSON syntax before restarting Docker, and remember that most changes require a daemon restart to take effect.
