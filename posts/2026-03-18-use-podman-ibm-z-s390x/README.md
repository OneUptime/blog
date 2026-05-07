# How to Use Podman on IBM Z (s390x)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, IBM Z, s390x, Container, Linux, Mainframe, DevOps, Enterprise

Description: Learn to install and run Podman on IBM Z (s390x) mainframes, covering RHEL/Ubuntu setup, s390x container images, and crypto hardware acceleration.

---

> IBM Z mainframes handle some of the world's most critical workloads in banking, insurance, and government. Podman brings modern container workflows to the s390x architecture, letting you run containerized applications alongside traditional mainframe workloads without sacrificing the reliability and security that Z platforms are known for.

IBM Z systems running Linux (either natively in an LPAR or under z/VM) fully support Podman and OCI-compliant containers. The s390x architecture is a first-class citizen in the container ecosystem, with Red Hat, SUSE, and Canonical all providing s390x builds of their distributions. This guide walks you through running Podman on IBM Z for development, testing, and production workloads.

---

## Prerequisites

Before starting, verify your environment:

```bash
# Confirm you are on s390x

uname -m
# Expected output: s390x

# Check Linux distribution
cat /etc/os-release
```

You need one of the following environments:
- RHEL 8/9 for s390x (most common in enterprise)
- Ubuntu 22.04/24.04 for s390x
- SUSE Linux Enterprise Server 15 for s390x
- Fedora for s390x (development/testing)

---

## Installing Podman on IBM Z

### RHEL 9 for s390x

Install the container tools meta-package:

```bash
sudo dnf install -y container-tools
```

### RHEL 8 for s390x

```bash
sudo dnf module install -y container-tools
```

### Ubuntu for s390x

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### SUSE Linux Enterprise Server 15

```bash
sudo zypper install -y podman
```

Verify the installation:

```bash
podman version
podman info --format '{{.Host.Arch}}'
# Expected: s390x
```

---

## Finding s390x Container Images

Not all container images are built for s390x. Here is how to check and find compatible images.

### Checking Multi-Architecture Support

```bash
# Check if an image supports s390x
skopeo inspect --raw docker://docker.io/library/nginx:alpine | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'manifests' in data:
    archs = [m['platform']['architecture'] for m in data['manifests']]
    print('s390x supported:', 's390x' in archs)
    print('Available architectures:', ', '.join(archs))
else:
    print('Single-arch image, check with podman pull')
"
```

### Images with s390x Support

Many official images support s390x:

```bash
# These commonly have s390x builds
podman pull docker.io/library/ubuntu:24.04
podman pull docker.io/library/alpine:3.19
podman pull docker.io/library/postgres:16
podman pull docker.io/library/redis:7
podman pull docker.io/library/node:20
podman pull docker.io/library/python:3.12
podman pull docker.io/library/golang:1.22
```

IBM also publishes images through IBM Cloud Container Registry:

```bash
ibmcloud login
ibmcloud cr region-set global
ibmcloud cr images --include-ibm
```

---

## Running Containers on IBM Z

### Basic Container Operations

```bash
# Run an interactive container
podman run -it --rm docker.io/library/ubuntu:24.04 bash

# Inside the container, verify the architecture
uname -m  # s390x
cat /proc/cpuinfo | head -20
```

### Web Application on s390x

```bash
podman run -d --name web \
  -p 8080:80 \
  docker.io/library/nginx:alpine

curl http://localhost:8080
```

### Database Workloads

IBM Z excels at transactional database workloads. Run PostgreSQL:

```bash
podman run -d --name postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=enterprise \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=mainframe_app \
  -v pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16

# Connect and verify
podman exec -it postgres psql -U enterprise -d mainframe_app -c "SELECT version();"
```

---

## Leveraging IBM Z Hardware Features

### Crypto Hardware Acceleration

IBM Z includes dedicated cryptographic hardware such as CPACF and Crypto Express. For OpenSSL workloads, supported algorithms use CPACF automatically; Crypto Express availability depends on the host's Linux zcrypt configuration:

```bash
# Check if Crypto Express hardware is available on the host
cat /proc/driver/z90crypt 2>/dev/null || echo "z90crypt not available"
lszcrypt 2>/dev/null || echo "lszcrypt not available"

# Run an OpenSSL benchmark inside a container
podman run --rm \
  docker.io/library/ubuntu:24.04 \
  bash -lc "apt-get update >/dev/null && apt-get install -y openssl >/dev/null && openssl speed aes-256-cbc"
```

### Exploiting z/Architecture Instructions

Applications compiled for s390x can take advantage of vector instructions and other z/Architecture features:

```bash
# Build an optimized application
cat > Dockerfile.s390x <<EOF
FROM docker.io/library/golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN GOARCH=s390x CGO_ENABLED=0 go build -o /app/server .

FROM docker.io/library/alpine:3.19
COPY --from=builder /app/server /usr/local/bin/server
CMD ["server"]
EOF

podman build -f Dockerfile.s390x -t myapp:s390x .
```

---

## Building s390x Images

### Native Builds on IBM Z

Building on the Z hardware directly gives you native s390x images:

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

podman build -t myorg/myapp:s390x .
```

### Cross-Building for s390x on x86_64

If you need to build s390x images on an x86_64 machine:

```bash
# On x86_64, install QEMU user-static
sudo apt install -y qemu-user-static

# Build for s390x
podman build --platform linux/s390x -t myorg/myapp:s390x .
```

### Multi-Architecture Manifest

Include s390x in your multi-architecture image:

```bash
podman manifest create myorg/myapp:latest
podman manifest add myorg/myapp:latest myorg/myapp:amd64
podman manifest add myorg/myapp:latest myorg/myapp:arm64
podman manifest add myorg/myapp:latest myorg/myapp:s390x
podman manifest push myorg/myapp:latest docker://docker.io/myorg/myapp:latest
```

---

## Enterprise Patterns for IBM Z

### Running Alongside CICS and IMS

Containers on IBM Z can communicate with traditional mainframe subsystems through TCP/IP:

```bash
# Application container connecting to CICS via TCP
podman run -d --name middleware \
  -e CICS_HOST=cics.internal \
  -e CICS_PORT=3270 \
  -e APP_PORT=8080 \
  -p 8080:8080 \
  myorg/cics-gateway:s390x
```

### Batch Processing

IBM Z is commonly used for batch processing. Run batch jobs in containers:

```bash
# Run a batch job
podman run --rm --name batch-job \
  -v /data/input:/input:ro,Z \
  -v /data/output:/output:Z \
  myorg/batch-processor:s390x \
  /app/process --input /input/daily.csv --output /output/results.csv

echo "Batch job exit code: $?"
```

### Systemd Integration for Production

Create a Quadlet definition for a production service:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/enterprise-api.container <<EOF
[Unit]
Description=Enterprise API Service
After=network-online.target

[Container]
Image=myorg/enterprise-api:s390x
PublishPort=8443:8443
Volume=api-config:/etc/app:ro,Z
Volume=api-logs:/var/log/app:Z
Environment=TLS_CERT=/etc/app/server.crt
Environment=TLS_KEY=/etc/app/server.key
Environment=LOG_LEVEL=info
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=120

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user start enterprise-api.service
```

---

## Monitoring and Observability

### Container Metrics

```bash
# Real-time stats
podman stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
```

### Integration with z/OS Monitoring

Export host metrics to Prometheus for integration with existing monitoring:

```bash
# Run a Prometheus exporter
podman run -d --name node-exporter \
  --net host \
  --pid host \
  -v /:/host:ro,rslave \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host
```

### Health Checks for Critical Services

```bash
podman run -d --name critical-service \
  --health-cmd "curl -f https://localhost:8443/health || exit 1" \
  --health-interval 15s \
  --health-retries 5 \
  --health-timeout 10s \
  --health-start-period 30s \
  myorg/critical-service:s390x
```

---

## Security on IBM Z

### FIPS Mode

IBM Z systems can run Linux distributions in FIPS mode. Ensure your containers use FIPS-compliant libraries:

```bash
# Check if FIPS mode is enabled on the host
cat /proc/sys/crypto/fips_enabled

# Run a container that respects FIPS mode
podman run --rm docker.io/library/alpine:3.19 \
  sh -c "cat /proc/sys/crypto/fips_enabled"
```

### Secure Execution (IBM Z15+)

On IBM z15 and later, Secure Execution provides hardware-based isolation for workloads:

```bash
# Verify Secure Execution support
cat /sys/firmware/uv/prot_virt_host
```

---

## Conclusion

Podman on IBM Z brings modern container workflows to mainframe infrastructure. The s390x architecture is well-supported across major base images, and Podman's rootless, daemonless design aligns with the security requirements of enterprise mainframe environments. You can build native s390x images directly on Z hardware for optimal performance, leverage hardware cryptographic acceleration, and integrate containerized services with traditional mainframe workloads. For organizations running IBM Z, Podman provides a path to modernize application deployment while maintaining the reliability and security standards that mainframe workloads demand.
