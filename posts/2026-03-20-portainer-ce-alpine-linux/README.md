# How to Install Portainer CE on Alpine Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Alpine-linux, Docker, Installation, Lightweight

Description: A guide to installing Portainer Community Edition on Alpine Linux with Docker, ideal for minimal, resource-efficient container host deployments.

## Overview

Alpine Linux is an extremely lightweight distribution popular for container base images and minimal server deployments. Its small footprint makes it ideal for systems with limited resources. This guide covers installing Docker and Portainer CE on Alpine Linux 3.18+.

## Prerequisites

- Alpine Linux 3.18 or newer
- Minimum: 512MB RAM (1GB recommended), 5GB disk
- Root access
- Internet connectivity

## Step 1: Update Alpine and Install Dependencies

```bash
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
# Install Docker
apk add --no-cache docker docker-cli docker-compose

# Start Docker service
rc-update add docker default
service docker start

# Verify Docker is running
docker --version
docker info
```

## Step 3: Configure Cgroups (Alpine-Specific)

Alpine may need cgroup configuration for Docker:

```bash
# Edit /etc/rc.conf to enable cgroups
echo 'rc_cgroup_mode="unified"' >> /etc/rc.conf

# Or configure in boot options for older Alpine
echo "cgroup_enable=cpuset,cpu,cpuacct,blkio,memory,devices" >> /etc/default/grub
```

## Step 4: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

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
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Save rules
/etc/init.d/iptables save
rc-update add iptables
```

## Step 6: Access Portainer

```bash
# Get IP address
ip addr show eth0 | grep 'inet ' | awk '{print $2}'

# Navigate to https://<ip>:9443
```

Resource Usage on Alpine

Alpine's minimal footprint means Portainer runs very efficiently:

```bash
# Check memory usage
docker stats portainer --no-stream
# Typical: ~50-100MB RAM

# Check disk usage
docker system df
```

## Running Portainer as a Service with OpenRC

```bash
# Create OpenRC init script for Portainer
cat > /etc/init.d/portainer << 'EOF'
#!/sbin/openrc-run

name="portainer"
description="Portainer CE container manager"
command="/usr/bin/docker"
command_args="start portainer"
start_pre() {
    docker ps -a | grep -q portainer || docker run -d \
        -p 8000:8000 -p 9443:9443 \
        --name portainer \
        --restart=always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v portainer_data:/data \
        portainer/portainer-ce:latest
}
depend() {
    need docker
}
EOF

chmod +x /etc/init.d/portainer
rc-update add portainer default
service portainer start
```

## Conclusion

Alpine Linux makes an excellent lightweight host for Portainer CE. The minimal Alpine base means the entire system can run with very little RAM and disk space. The main difference from other distributions is the use of OpenRC instead of systemd and `apk` instead of `apt`/`yum`. Once running, Portainer behaves identically to any other platform.
