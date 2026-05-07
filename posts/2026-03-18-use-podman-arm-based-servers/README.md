# How to Use Podman on ARM-Based Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, ARM, Container, Linux, DevOps, AArch64, Raspberry Pi, AWS Graviton, Multi-Architecture

Description: Install and use Podman on ARM-based servers like AWS Graviton, Raspberry Pi, and Apple Silicon, covering multi-architecture builds and performance tuning.

---

> ARM-based servers are reshaping the data center landscape with better power efficiency and competitive performance. On Linux ARM hosts, Podman itself runs natively on aarch64, giving you the same rootless, daemonless container experience as on x86_64 while taking full advantage of ARM's efficiency gains.

ARM processors have moved from mobile devices to cloud, edge, and development systems. AWS Graviton and Ampere Altra offer significant cost and energy savings for server workloads compared to x86 alternatives, while Apple Silicon has made ARM a common local development platform. Podman fully supports the aarch64 architecture on Linux, and most popular container images now publish ARM variants. This guide covers everything you need to run Podman on ARM servers in development and production.

---

## ARM Server Platforms

| Platform | Processor | Use Case |
|----------|-----------|----------|
| AWS Graviton 3/4 | Graviton (Neoverse) | Cloud workloads |
| Ampere Altra | Altra (Neoverse N1) | Cloud and bare metal |
| Raspberry Pi 4/5 | Broadcom BCM2711/2712 | Edge, development |
| Apple Silicon (M-series) | Apple M1/M2/M3/M4 | Development (via Linux VM) |
| Oracle Cloud A1 | Ampere Altra | Cloud workloads |
| Hetzner CAX | Ampere Altra | Budget cloud |

---

## Installing Podman on ARM Servers

### Ubuntu Server 20.10+ (aarch64)

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### Fedora / RHEL (aarch64)

```bash
sudo dnf install -y podman
```

### Debian 11+ (aarch64)

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### Raspberry Pi OS (64-bit)

Make sure you are running the 64-bit version of Raspberry Pi OS:

```bash
uname -m  # Should show aarch64
```

Install Podman:

```bash
sudo apt update
sudo apt install -y podman uidmap
```

Verify the installation and architecture:

```bash
podman version
podman info --format '{{.Host.Arch}}'
```

The `podman info` output should show `arm64`.

---

## Pulling ARM-Native Images

Most official images on Docker Hub publish multi-architecture manifests. Podman automatically pulls the correct architecture:

```bash
podman pull docker.io/library/nginx:alpine
podman image inspect docker.io/library/nginx:alpine --format '{{.Architecture}}'
```

The output should show `arm64`.

### Verifying Image Architecture

Before deploying, verify that an image supports ARM:

```bash
podman manifest inspect docker.io/library/postgres:16-alpine | \
  grep -A 2 '"architecture"'
```

If an image only supports `amd64`, you will see an error when trying to pull it on ARM. In that case, you need to either find an ARM-compatible alternative or build the image yourself.

---

## Running Production Workloads

### Web Application Stack

```bash
# Create a pod for the application

podman pod create --name webapp \
  -p 8080:8080 \
  -p 5432:5432

# Database
podman run -d --pod webapp --name db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secure123 \
  -e POSTGRES_DB=production \
  -v pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

# Application
podman run -d --pod webapp --name api \
  -e DATABASE_URL=postgresql://app:secure123@localhost:5432/production \
  docker.io/myorg/api:latest
```

### Redis Cache on ARM

```bash
podman run -d --name redis \
  -p 6379:6379 \
  -v redis-data:/data:Z \
  docker.io/library/redis:7-alpine \
  redis-server --appendonly yes --maxmemory 256mb
```

---

## Building Multi-Architecture Images

When you need images that work on both ARM and x86_64, use Podman's manifest and build capabilities.

### Building for Multiple Architectures with podman build

Build a single-architecture image on your ARM server:

```bash
cat > Dockerfile <<EOF
FROM docker.io/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
EOF

podman build -t myorg/myapp:latest .
```

### Creating Multi-Architecture Manifests

To create images that work on both architectures, build on each platform and combine:

```bash
# On ARM server
podman build -t myorg/myapp:latest-arm64 .
podman push myorg/myapp:latest-arm64

# On x86_64 server
podman build -t myorg/myapp:latest-amd64 .
podman push myorg/myapp:latest-amd64

# Create and push the manifest (from either server)
podman manifest create myorg/myapp:latest
podman manifest add myorg/myapp:latest docker://docker.io/myorg/myapp:latest-arm64
podman manifest add myorg/myapp:latest docker://docker.io/myorg/myapp:latest-amd64
podman manifest push --all myorg/myapp:latest docker://docker.io/myorg/myapp:latest
```

### Cross-Architecture Builds with QEMU

You can build x86_64 images on an ARM server using QEMU emulation:

```bash
# Install QEMU user-static
sudo apt install -y qemu-user-static

# Build for a different architecture
podman build --platform linux/amd64 -t myorg/myapp:amd64 .
```

Note that cross-architecture builds through emulation are significantly slower than native builds. Use native builds whenever possible.

---

## Performance Considerations on ARM

### CPU-Bound Workloads

ARM servers typically offer more cores at lower clock speeds. Applications that benefit from parallelism run well on ARM:

```bash
# Allow the container to use all available cores
podman run -d --name worker \
  --cpus $(nproc) \
  docker.io/myorg/worker:latest
```

### Memory Optimization

ARM servers often have excellent memory bandwidth. Set appropriate memory limits:

```bash
podman run -d --name api \
  --memory 2g \
  --memory-swap 2g \
  docker.io/myorg/api:latest
```

### Storage Performance

Use the overlay storage driver for best performance:

```bash
podman info --format '{{.Store.GraphDriverName}}'
```

On Raspberry Pi with SD cards, consider using an external SSD for the container storage directory:

```bash
# Mount SSD and configure Podman to use it
sudo mkdir -p /mnt/ssd/containers
sudo mount /dev/sda1 /mnt/ssd

# Configure storage location
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"
graphroot = "/mnt/ssd/containers/storage"
runroot = "/mnt/ssd/containers/run"
EOF
```

---

## AWS Graviton-Specific Tips

### Instance Selection

Choose Graviton instances for containerized workloads:

```bash
# Graviton instances use the 'g' suffix
# t4g.medium - burstable, good for development
# m7g.xlarge - general purpose, good for production
# c7g.2xlarge - compute optimized, good for CPU-bound containers
```

### ECR with Podman on Graviton

Authenticate with AWS ECR and pull images:

```bash
# Install AWS CLI
sudo apt install -y awscli

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Pull from ECR
podman pull 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

---

## Raspberry Pi-Specific Configuration

### Reducing Memory Usage

On Raspberry Pi with limited RAM, use lightweight images and set strict limits:

```bash
# Use Alpine-based images
podman run -d --name web \
  --memory 128m \
  docker.io/library/nginx:alpine

# Monitor memory usage
podman stats --no-stream
```

### Managing Temperature

Container workloads can heat up a Raspberry Pi. Monitor temperature:

```bash
#!/bin/bash
# monitor-temp.sh
while true; do
  temp=$(cat /sys/class/thermal/thermal_zone0/temp)
  echo "CPU Temperature: $((temp/1000))°C"
  echo "Container stats:"
  podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
  sleep 10
done
```

### Running a Home Lab Stack

```bash
podman run -d --name pihole \
  -p 53:53/tcp -p 53:53/udp -p 80:80 \
  -e TZ=America/New_York \
  -e FTLCONF_webserver_api_password=admin \
  -e FTLCONF_dns_listeningMode=all \
  -v pihole:/etc/pihole:Z \
  docker.io/pihole/pihole:latest
```

---

## Troubleshooting ARM-Specific Issues

### Image Not Found for Architecture

If you encounter "no image found" errors:

```bash
# Check available architectures
podman manifest inspect docker.io/library/someimage:latest 2>/dev/null | \
  python3 -c "import sys,json; [print(m['platform']['architecture']) for m in json.load(sys.stdin)['manifests']]"
```

### Exec Format Error

If you see "exec format error," you are trying to run an x86_64 image on ARM:

```bash
# Install QEMU for cross-architecture support
sudo apt install -y qemu-user-static

# Register QEMU with binfmt
sudo systemctl restart systemd-binfmt

# Now you can run x86_64 images (with performance penalty)
podman run --platform linux/amd64 docker.io/library/alpine uname -m
```

---

## Conclusion

Podman on ARM-based servers delivers a first-class container experience with significant cost and energy benefits. Whether you are running production workloads on AWS Graviton, deploying home lab services on a Raspberry Pi, or building multi-architecture images for heterogeneous environments, Podman's native ARM support lets you avoid emulation overhead when you use ARM-native images. Focus on using ARM-native images for best performance, build multi-architecture manifests when you need cross-platform compatibility, and take advantage of ARM's core density for parallel workloads.
