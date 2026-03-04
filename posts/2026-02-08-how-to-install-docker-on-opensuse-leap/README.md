# How to Install Docker on openSUSE Leap

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, openSUSE, Leap, Linux, Installation, DevOps, Containers, Zypper

Description: Complete walkthrough for installing Docker on openSUSE Leap, from repository setup to container networking and Btrfs storage driver configuration.

---

openSUSE Leap provides a stable, enterprise-grade Linux platform with the benefit of being freely available. It shares its codebase with SUSE Linux Enterprise, which means excellent hardware support and a predictable release cycle. Docker works well on Leap, but the installation path differs from Debian-based distributions. This guide covers the complete process.

## Prerequisites

- An openSUSE Leap 15.4+ system
- Root or sudo access
- An active internet connection

## Step 1: Update the System

Always start with a fresh package database.

```bash
# Refresh repositories and update the system
sudo zypper refresh
sudo zypper update -y
```

## Step 2: Install Docker

Docker is available from the official openSUSE repositories.

```bash
# Install Docker and Docker Compose
sudo zypper install -y docker docker-compose docker-buildx
```

openSUSE packages Docker directly, so no external repository is needed. The version may be slightly behind Docker's official releases.

If you prefer the latest Docker CE version from Docker's own repository:

```bash
# Alternative: Add Docker's official repository
sudo zypper addrepo https://download.docker.com/linux/sles/docker-ce.repo
sudo zypper refresh
sudo zypper install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 3: Start and Enable Docker

```bash
# Start the Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

Verify.

```bash
# Check Docker status
sudo systemctl status docker
```

## Step 4: Run Docker Without Sudo

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
```

Log out and back in, then verify.

```bash
# Test non-root access
docker run hello-world
```

## Step 5: Verify the Installation

```bash
# Run the standard test
docker run hello-world

# Check Docker version and system info
docker version
docker info
```

## Btrfs Storage Driver

openSUSE Leap defaults to the Btrfs filesystem for many installations. Docker supports Btrfs natively through its `btrfs` storage driver, which leverages Btrfs snapshots for image layers.

Check your filesystem.

```bash
# Check the filesystem under Docker's data directory
df -Th /var/lib/docker
```

If it shows Btrfs, configure Docker to use the Btrfs driver.

```bash
# Configure Docker for Btrfs
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "storage-driver": "btrfs",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
sudo systemctl restart docker
```

Verify the change.

```bash
# Confirm the storage driver
docker info | grep "Storage Driver"
```

The Btrfs driver works by creating a Btrfs subvolume for each image layer and container. This is efficient for snapshotting but can consume more disk space than overlay2 due to how Btrfs handles copy-on-write.

### Btrfs Maintenance

Btrfs requires periodic maintenance to stay healthy. Set up a cron job or systemd timer for balance operations.

```bash
# Run a Btrfs balance (can take a while on large volumes)
sudo btrfs balance start -dusage=50 /var/lib/docker

# Check filesystem usage
sudo btrfs filesystem usage /var/lib/docker
```

If you prefer overlay2 even on Btrfs (it works, though it is not the optimal pairing), you can force it.

```bash
# Force overlay2 on Btrfs
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

## Configuring Container Networking

### Bridge Networking

Docker creates a bridge network (`docker0`) by default. Verify it exists.

```bash
# List Docker networks
docker network ls

# Inspect the default bridge
docker network inspect bridge
```

### Custom Networks

For multi-container applications, create custom networks.

```bash
# Create a custom bridge network
docker network create --driver bridge --subnet 172.20.0.0/16 my-app-network

# Run a container on the custom network
docker run -d --name web --network my-app-network nginx

# Containers on the same network can reach each other by name
docker run --rm --network my-app-network alpine ping -c 3 web
```

### DNS Configuration

If containers cannot resolve hostnames, configure DNS in the daemon.

```bash
# Set DNS servers for all containers
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"],
  "storage-driver": "btrfs",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Firewall Configuration

openSUSE Leap uses `firewalld` by default. Docker manipulates iptables directly, which can conflict.

```bash
# Trust the Docker bridge interface
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload

# Open specific ports for container access
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

If you experience networking issues after a firewalld restart, restart Docker as well.

```bash
# Restart Docker after firewall changes
sudo systemctl restart docker
```

## YaST Integration

openSUSE's YaST management tool can also manage Docker to some extent. However, command-line management is more reliable and gives you full control. YaST is useful for initial system setup, but for Docker-specific configuration, stick with `systemctl` and manual config files.

## Using Docker with Snapper

openSUSE uses Snapper for system snapshots on Btrfs. Docker's data lives under `/var/lib/docker`, which is typically excluded from Snapper snapshots. This is intentional because Docker data changes frequently and would bloat your snapshot storage.

Verify that Docker's data directory is excluded.

```bash
# Check Snapper configuration for excluded paths
sudo snapper get-config | grep ALLOW
```

If snapshots are growing too large, check that `/var/lib/docker` is on its own subvolume.

```bash
# Check Btrfs subvolumes
sudo btrfs subvolume list /
```

## Docker Compose Example

Test Docker Compose with a simple application stack.

```yaml
# docker-compose.yml - simple web app with Redis
services:
  web:
    image: python:3.12-alpine
    command: >
      sh -c "pip install flask redis &&
             python -c \"
      from flask import Flask
      import redis
      app = Flask(__name__)
      r = redis.Redis(host='redis', port=6379)
      @app.route('/')
      def hello():
          r.incr('hits')
          return f'Hits: {r.get(\"hits\").decode()}'
      app.run(host='0.0.0.0', port=5000)
      \""
    ports:
      - "5000:5000"
    depends_on:
      - redis

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

```bash
# Start the application
docker compose up -d

# Check the running services
docker compose ps

# Test the web app
curl http://localhost:5000

# Clean up
docker compose down -v
```

## Troubleshooting

### Docker fails to start with "bridge-nf-call-iptables" error

Enable the required kernel parameters.

```bash
# Enable bridge netfilter
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/br_netfilter.conf

sudo sysctl -w net.bridge.bridge-nf-call-iptables=1
sudo sysctl -w net.bridge.bridge-nf-call-ip6tables=1
echo "net.bridge.bridge-nf-call-iptables = 1" | sudo tee -a /etc/sysctl.d/99-docker.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" | sudo tee -a /etc/sysctl.d/99-docker.conf
sudo sysctl --system
```

### Zypper cannot find docker package

Make sure the OSS repository is enabled.

```bash
# Check repository list
sudo zypper repos | grep -i oss
```

If missing, add it.

```bash
# Add the main OSS repository
sudo zypper addrepo https://download.opensuse.org/distribution/leap/15.5/repo/oss/ openSUSE-Leap-OSS
sudo zypper refresh
```

### Btrfs "no space left" even with free disk space

Btrfs can report no space available when metadata is full even if data space remains. Run a balance.

```bash
# Balance Btrfs metadata
sudo btrfs balance start -musage=50 /var/lib/docker
```

## Summary

openSUSE Leap provides Docker through its standard repositories, making installation a simple `zypper install` command. The Btrfs filesystem integration is a unique advantage, providing efficient snapshots for Docker layers. Combined with firewalld, YaST, and Snapper, openSUSE Leap offers a full-featured platform for running Docker containers with enterprise-grade tools already built in.
