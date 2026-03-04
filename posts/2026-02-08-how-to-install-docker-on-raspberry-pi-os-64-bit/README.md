# How to Install Docker on Raspberry Pi OS (64-bit)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Raspberry Pi, ARM, Linux, Installation, IoT, Containers, Edge Computing

Description: Learn how to install Docker on Raspberry Pi OS 64-bit, with guidance on ARM image compatibility, resource optimization, and practical project examples.

---

The Raspberry Pi has evolved from a hobbyist's toy into a legitimate computing platform. With the 64-bit version of Raspberry Pi OS (based on Debian Bookworm), you can run Docker containers natively on ARM64 hardware. This opens the door to self-hosted services, IoT gateways, home automation, and lightweight development servers. Here is how to get Docker running on your Pi.

## Prerequisites

- Raspberry Pi 4 or 5 with at least 2 GB of RAM (4 GB or 8 GB recommended)
- Raspberry Pi OS (64-bit) installed and updated
- SSH or direct terminal access
- A reliable power supply (underpowered Pis cause strange issues)
- A quality microSD card or USB SSD (SSD strongly recommended for Docker workloads)

## Step 1: Update the System

Start with a full system update.

```bash
# Update package lists and upgrade all packages
sudo apt-get update && sudo apt-get upgrade -y
```

## Step 2: Install Docker Using the Convenience Script

Docker provides an official convenience script that detects your OS and architecture, then installs the appropriate packages. This is the recommended method for Raspberry Pi.

```bash
# Download and run the official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

The script adds Docker's repository, imports the GPG key, and installs `docker-ce`, `docker-ce-cli`, and `containerd.io`. It detects the ARM64 architecture automatically.

After installation, remove the script.

```bash
# Clean up the install script
rm get-docker.sh
```

## Step 3: Add Your User to the Docker Group

The default `pi` user (or whatever user you created) needs Docker group membership.

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
```

Log out and log back in, or run `newgrp docker` to apply immediately.

## Step 4: Verify the Installation

```bash
# Test Docker with the hello-world container
docker run hello-world
```

Also check that the architecture is detected correctly.

```bash
# Verify Docker platform info
docker info | grep Architecture
```

This should show `aarch64`, confirming you are running the 64-bit version.

## Step 5: Enable Docker at Boot

```bash
# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl enable containerd
```

## ARM64 Image Compatibility

Not every Docker image on Docker Hub supports ARM64. When pulling images, check for multi-architecture support. Most official images (nginx, postgres, redis, node, python) support `linux/arm64` natively.

```bash
# Check available platforms for an image
docker manifest inspect nginx | grep architecture
```

If an image only supports `linux/amd64`, it will not run on your Pi. You will see an "exec format error" if you try.

For images that do not support ARM64, you have two options:

1. Find an ARM64-compatible alternative on Docker Hub
2. Build the image yourself from source

```bash
# Build an image for the local ARM64 architecture
docker build -t my-custom-app .
```

## Optimizing Docker for Raspberry Pi

### Memory Management

The Raspberry Pi has limited RAM. Configure Docker to be conservative with memory usage.

```bash
# Set memory limits when running containers
docker run -d --memory=256m --memory-swap=512m nginx
```

You can also set default resource limits in the daemon configuration.

```bash
# Create a resource-conscious daemon configuration
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "2"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

### Storage Performance

MicroSD cards are slow and wear out with heavy write activity. Docker's image layers and container writes can degrade a card quickly.

The best approach is to move Docker's data directory to a USB SSD.

```bash
# Stop Docker
sudo systemctl stop docker

# Mount your SSD (assuming it is at /dev/sda1 formatted as ext4)
sudo mkdir -p /mnt/ssd
sudo mount /dev/sda1 /mnt/ssd

# Add to fstab for automatic mounting
echo "/dev/sda1 /mnt/ssd ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab

# Move Docker data to the SSD
sudo rsync -aP /var/lib/docker/ /mnt/ssd/docker/

# Configure Docker to use the new location
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "data-root": "/mnt/ssd/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "5m",
    "max-file": "2"
  },
  "storage-driver": "overlay2"
}
EOF

# Start Docker
sudo systemctl start docker
```

Verify Docker is using the SSD.

```bash
# Check Docker's data root
docker info | grep "Docker Root Dir"
```

### Temperature Management

Running multiple containers can push the Pi's CPU temperature up. Monitor it regularly.

```bash
# Check CPU temperature
vcgencmd measure_temp
```

If the temperature exceeds 80 degrees Celsius, consider adding a heatsink or fan, or reducing container workloads.

## Practical Example: Running a Home Dashboard

A common Raspberry Pi Docker project is a self-hosted dashboard. Here is a quick example with Heimdall.

```bash
# Create a directory for Heimdall data
mkdir -p ~/heimdall

# Run Heimdall on port 8080
docker run -d \
  --name heimdall \
  --restart unless-stopped \
  -p 8080:80 \
  -v ~/heimdall:/config \
  lscr.io/linuxserver/heimdall:latest
```

Open `http://<your-pi-ip>:8080` in a browser to access the dashboard.

## Running Docker Compose on the Pi

Docker Compose was installed as part of the convenience script. Verify it works.

```bash
# Check Docker Compose version
docker compose version
```

Here is an example Compose file for a Pi-based monitoring stack.

```yaml
# docker-compose.yml - lightweight monitoring stack
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

Start the stack.

```bash
# Launch the monitoring stack
docker compose up -d
```

Both Prometheus and Grafana have official ARM64 images, so they run natively on the Pi.

## Troubleshooting

### "exec format error" when running a container

The image does not support ARM64. Find an ARM-compatible version or build it locally.

### Docker is slow or unresponsive

Check available memory with `free -h`. The Pi may be swapping heavily. Kill unnecessary containers or add swap space.

```bash
# Check memory usage
free -h

# Check which containers are using the most resources
docker stats --no-stream
```

### Permission denied on volumes

If containers cannot write to mounted volumes, check the directory permissions.

```bash
# Fix permissions for a volume directory
sudo chown -R 1000:1000 ~/my-volume
```

### Docker fails after a power outage

Unexpected shutdowns can corrupt Docker's data. If Docker refuses to start, check the logs.

```bash
# Check Docker logs after a crash
sudo journalctl -u docker --no-pager -n 50
```

You may need to remove corrupted container data.

```bash
# Remove corrupted containers (images are usually fine)
sudo rm -rf /var/lib/docker/containers/*
sudo systemctl restart docker
```

## Summary

Docker on Raspberry Pi OS 64-bit turns your Pi into a capable container host. The key considerations are ARM64 image compatibility, storage performance (use an SSD), and memory management. With these handled, you can run everything from home automation dashboards to lightweight development environments on a device that draws just a few watts of power.
