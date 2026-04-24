# How to Install Portainer CE on Alpine Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Alpine-linux, Docker, Installation, Lightweight

Description: A guide to installing Portainer Community Edition on Alpine Linux with Docker, ideal for minimal, resource-efficient container host deployments.

## Overview

Alpine Linux is an extremely lightweight distribution popular for container base images and minimal server deployments. Its small footprint makes it ideal for systems with limited resources. This guide covers installing Docker and Portainer CE on Alpine Linux 3.18+.

## Prerequisites

- Alpine Linux 3.18 or newer
- Sufficient RAM and disk space for Alpine Linux, Docker, and Portainer data
- Root access
- Internet connectivity

## Step 1: Update Alpine and Install Dependencies

```bash
# Enable the community repository if it is not already enabled
setup-apkrepos -c

# Update package index
apk update && apk upgrade

# Install required tools
apk add --no-cache \
  curl \
  bash \
  openssl
```

## Step 2: Install Docker on Alpine

```bash
# Install Docker and the Compose plugin
apk add --no-cache docker docker-cli-compose

# Start Docker service
rc-update add docker default
service docker start

# Verify Docker is running
docker --version
docker compose version
docker info
```

## Step 3: Configure Cgroups (Alpine-Specific)

Standard Docker installs on Alpine 3.19+ usually do not need extra cgroup configuration. For Alpine 3.18 or rootless Docker setups, enable unified cgroups and start the `cgroups` service:

```bash
# For Alpine 3.18 or rootless Docker setups
echo 'rc_cgroup_mode="unified"' >> /etc/rc.conf

# Enable and start the cgroups service
rc-update add cgroups
rc-service cgroups start
```

## Step 4: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
# Remove -p 8000:8000 if you do not use Edge Agents
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Verify deployment
docker ps
```

## Step 5: Configure Alpine Firewall (iptables)

Alpine uses iptables/nftables:

```bash
# Install iptables if not present
apk add --no-cache iptables

# Allow Portainer ports
iptables -A INPUT -p tcp --dport 9443 -j ACCEPT
# Optional: allow the Edge tunnel port if you use Edge Agents
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Save rules
rc-update add iptables
rc-service iptables save
```

## Step 6: Access Portainer

```bash
# Get IPv4 address
ip -4 addr show scope global | awk '/inet/ {print $2}' | cut -d/ -f1

# Navigate to https://<ip>:9443
```

Resource Usage on Alpine

Alpine's minimal footprint means Portainer runs very efficiently:

```bash
# Check memory usage
docker stats portainer --no-stream
# Actual RAM usage depends on your environment and workload

# Check disk usage
docker system df
```

## Running Portainer as a Service with OpenRC

With `--restart=always`, Portainer will start automatically when the Docker daemon starts, so a separate OpenRC service is usually unnecessary.

```bash
# Ensure Docker starts at boot
rc-update add docker default

# Start Portainer manually if you stop it
docker start portainer
```

## Conclusion

Alpine Linux makes an excellent lightweight host for Portainer CE. The minimal Alpine base means the entire system can run with very little RAM and disk space. The main difference from other distributions is the use of OpenRC instead of systemd and `apk` instead of `apt`/`yum`. Once running, Portainer behaves identically to any other platform.
