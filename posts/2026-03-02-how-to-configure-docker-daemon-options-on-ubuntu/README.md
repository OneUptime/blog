# How to Configure Docker Daemon Options on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Configuration, DevOps

Description: Configure Docker daemon options on Ubuntu using daemon.json to set storage drivers, log limits, DNS, registry mirrors, and other daemon-level settings.

---

The Docker daemon (`dockerd`) controls container execution, networking, storage, and logging across your entire Docker environment. Most daemon settings are configured through `/etc/docker/daemon.json`. Getting these settings right from the start avoids issues like runaway log files consuming all disk space, DNS resolution failures inside containers, or the default storage driver creating performance bottlenecks.

## The daemon.json File

Docker reads its daemon configuration from `/etc/docker/daemon.json`. This file does not exist by default - you create it:

```bash
# Check if it exists
cat /etc/docker/daemon.json

# Create it if missing
sudo mkdir -p /etc/docker
sudo touch /etc/docker/daemon.json

# Set initial content
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

# Apply and verify
sudo systemctl restart docker
sudo docker info | grep -A5 "Logging Driver"
```

After any change to `daemon.json`, restart Docker:

```bash
sudo systemctl restart docker
```

## Log Configuration

This is the most important setting for production systems. Without log limits, container logs grow indefinitely and fill your disk:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5",
    "compress": "true"
  }
}
```

- `max-size`: Maximum size of a single log file (e.g., `100m`, `1g`)
- `max-file`: Maximum number of log files to keep (rotated)
- `compress`: Compress rotated log files

For high-volume environments, consider using `journald` instead:

```json
{
  "log-driver": "journald"
}
```

With journald, container logs integrate with systemd and can be viewed with `journalctl`:

```bash
# View logs for a specific container via journald
journalctl CONTAINER_NAME=mycontainer -f
```

## Storage Driver

The storage driver controls how container layers are managed:

```json
{
  "storage-driver": "overlay2"
}
```

`overlay2` is the default and correct choice for Ubuntu with a kernel 4.0+ and ext4 or xfs filesystem. Avoid `devicemapper` in loopback mode (the old default) - it is deprecated and performs poorly.

```bash
# Verify storage driver in use
docker info | grep "Storage Driver"
# Storage Driver: overlay2
```

If you have a specific filesystem requirement:

```json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
```

## DNS Configuration

Containers sometimes have DNS resolution issues, especially in corporate environments with split DNS. Configure explicit DNS servers:

```json
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-search": ["internal.example.com", "example.com"],
  "dns-opts": ["ndots:2", "timeout:3"]
}
```

To use your local network's DNS (common for corporate environments):

```bash
# Find your host's DNS server
resolvectl status | grep "DNS Server" | head -3

# Use it in daemon.json
```

```json
{
  "dns": ["192.168.1.1"],
  "dns-search": ["corp.example.com"]
}
```

## Registry Mirrors

Speed up image pulls and reduce egress costs by using a registry mirror:

```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://your-internal-registry.example.com"
  ]
}
```

For self-hosted mirror, set up a registry with pull-through cache:

```json
{
  "registry-mirrors": ["https://registry-cache.internal.example.com:5000"],
  "insecure-registries": ["registry-cache.internal.example.com:5000"]
}
```

## Insecure Registries

For internal registries without TLS (development only - not recommended for production):

```json
{
  "insecure-registries": [
    "myregistry.local:5000",
    "192.168.1.100:5000"
  ]
}
```

## IP Address Pools

Docker's default bridge uses `172.17.0.0/16` and Docker Compose networks use `172.18-172.31.x.x`. These ranges sometimes conflict with corporate networks. Configure custom ranges:

```json
{
  "default-address-pools": [
    {
      "base": "10.10.0.0/16",
      "size": 24
    }
  ]
}
```

This makes all Docker networks use `10.10.x.x/24` subnets, avoiding conflicts with typical corporate `172.x` ranges.

## Live Restore

Live restore allows containers to keep running when the Docker daemon restarts (for daemon updates):

```json
{
  "live-restore": true
}
```

With this enabled, `sudo systemctl restart docker` restarts only the daemon without stopping running containers.

## Experimental Features

Enable experimental features for access to unreleased capabilities:

```json
{
  "experimental": true
}
```

Check what experimental features are available:

```bash
docker info | grep Experimental
```

## Setting Data Directory

Move Docker's data directory if your root partition is small:

```json
{
  "data-root": "/mnt/docker-data"
}
```

After changing this:

```bash
# Create the new directory
sudo mkdir -p /mnt/docker-data

# Stop Docker
sudo systemctl stop docker

# Move existing data (optional, preserves images)
sudo rsync -aP /var/lib/docker/ /mnt/docker-data/

# Update daemon.json with the new path
# Restart Docker
sudo systemctl start docker

# Verify
docker info | grep "Docker Root Dir"
```

## Complete Production daemon.json Example

Here is a comprehensive production configuration:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5",
    "compress": "true"
  },
  "storage-driver": "overlay2",
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-opts": ["ndots:2", "timeout:3"],
  "default-address-pools": [
    {
      "base": "10.10.0.0/16",
      "size": 24
    }
  ],
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-level": "warn",
  "max-concurrent-downloads": 5,
  "max-concurrent-uploads": 5
}
```

Additional settings explained:
- `userland-proxy: false` - disable the userspace proxy for port forwarding (use iptables directly, slightly better performance)
- `no-new-privileges: true` - prevent containers from gaining new privileges via setuid binaries
- `log-level: warn` - reduce daemon log verbosity
- `max-concurrent-downloads/uploads` - control parallel layer transfers

## Validating daemon.json Syntax

JSON syntax errors in daemon.json are easy to make and cause Docker to fail to start:

```bash
# Validate JSON syntax before applying
python3 -c "import json; json.load(open('/etc/docker/daemon.json')); print('Valid JSON')"

# Or use jq
jq . /etc/docker/daemon.json && echo "Valid JSON"

# After changes, restart and check for errors
sudo systemctl restart docker
sudo systemctl status docker

# If Docker fails to start, check the log
sudo journalctl -u docker.service -n 50
```

## Applying Settings Dynamically

Some settings can be changed without a full daemon restart using the Docker API:

```bash
# Enable debug mode temporarily (without modifying daemon.json)
sudo kill -SIGUSR1 $(pidof dockerd)

# Check current daemon configuration
sudo docker info

# Reload after daemon.json changes (some settings support reload vs full restart)
sudo kill -SIGHUP $(pidof dockerd)
```

Note: full restart is safer for configuration changes - SIGHUP only reloads a subset of settings.

## Systemd Override for Daemon Flags

For options not available in daemon.json, use a systemd override:

```bash
# Create override directory
sudo mkdir -p /etc/systemd/system/docker.service.d

# Create override file
sudo tee /etc/systemd/system/docker.service.d/override.conf <<'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --host=fd:// --containerd=/run/containerd/containerd.sock
EOF

# Apply
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Most options should go in `daemon.json` rather than systemd overrides - daemon.json is the documented and supported configuration interface.
