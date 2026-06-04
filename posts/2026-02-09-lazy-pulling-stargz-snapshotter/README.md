# How to Use Container Image Lazy Pulling with Stargz Snapshotter on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Image, Performance, Stargz, Lazy Loading

Description: Learn how to implement lazy pulling with stargz-snapshotter to start containers without downloading entire images, dramatically reducing pod startup time in Kubernetes clusters.

---

Traditional container image pulls download all layers before starting containers, causing significant startup delays for large images. Lazy pulling with stargz-snapshotter allows containers to start immediately by fetching only required files on-demand. This guide shows you how to implement lazy pulling in Kubernetes for faster pod startup times.

## Understanding Stargz Format

Stargz (Seekable Tar Gzip) is an OCI-compatible image format that enables random access to files within compressed archives. Unlike standard gzip, stargz creates checkpoints throughout the compressed data, allowing decompression starting from any checkpoint. This enables fetching individual files without downloading the entire layer.

The stargz-snapshotter containerd plugin intercepts filesystem access, downloading only chunks containing accessed files. Containers start immediately with stargz images, fetching data as needed. This dramatically reduces time-to-start for large images, especially when containers only use a small portion of the image contents.

## Installing Stargz Snapshotter

Install the stargz-snapshotter plugin for containerd on all Kubernetes nodes.

```bash
# Download and install stargz-snapshotter

STARGZ_VERSION="v0.18.1"
wget https://github.com/containerd/stargz-snapshotter/releases/download/${STARGZ_VERSION}/stargz-snapshotter-${STARGZ_VERSION}-linux-amd64.tar.gz

sudo tar -C /usr/local/bin -xzf stargz-snapshotter-${STARGZ_VERSION}-linux-amd64.tar.gz containerd-stargz-grpc ctr-remote

# Create systemd service
sudo tee /etc/systemd/system/stargz-snapshotter.service >/dev/null <<EOF
[Unit]
Description=stargz snapshotter
After=network.target
Before=containerd.service

[Service]
Type=notify
ExecStart=/usr/local/bin/containerd-stargz-grpc --log-level=info --address=/run/containerd-stargz-grpc/containerd-stargz-grpc.sock
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now stargz-snapshotter
```

## Configuring containerd Integration

Configure containerd to use stargz-snapshotter for compatible images.

```toml
# /etc/containerd/config.toml
version = 2

[proxy_plugins]
  [proxy_plugins.stargz]
    type = "snapshot"
    address = "/run/containerd-stargz-grpc/containerd-stargz-grpc.sock"
  [proxy_plugins.stargz.exports]
    root = "/var/lib/containerd-stargz-grpc/"

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    snapshotter = "stargz"
    disable_snapshot_annotations = false
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Converting Images to Stargz Format

Convert existing images to eStargz format that supports lazy pulling.

```bash
# ctr-remote is included in the stargz-snapshotter release archive above

# Convert an image to eStargz
ctr-remote image optimize \
  --oci \
  --period=10 \
  mycompany/app:v1.0.0 \
  mycompany/app:v1.0.0-esgz

# Push the optimized image
ctr-remote image push mycompany/app:v1.0.0-esgz
```

Optimize during build with Docker Buildx:

```bash
# Build image with eStargz layers
docker buildx build \
  --platform linux/amd64 \
  --output type=image,name=mycompany/app:latest,compression=estargz,oci-mediatypes=true,force-compression=true,push=true \
  .
```

## Creating eStargz Images in CI/CD

Automate eStargz image creation in build pipelines.

```yaml
# .github/workflows/build-estargz.yml
name: Build eStargz Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up QEMU
      uses: docker/setup-qemu-action@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Login to Registry
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push eStargz image
      uses: docker/build-push-action@v7
      with:
        context: .
        tags: mycompany/app:${{ github.sha }}-esgz
        outputs: type=image,compression=estargz,oci-mediatypes=true,force-compression=true,push=true
```

## Deploying Workloads with Lazy Pulling

Deploy pods that use eStargz images for fast startup.

```yaml
# lazy-pull-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fast-startup-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: fast-startup
  template:
    metadata:
      labels:
        app: fast-startup
    spec:
      containers:
      - name: app
        # Use eStargz formatted image
        image: mycompany/app:v1.0.0-esgz
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 2
          periodSeconds: 5
```

Lazy pulling is selected by the node's containerd snapshotter configuration. The pod only needs to reference an eStargz image on nodes where `snapshotter = "stargz"` is configured.

## Optimizing Image Structure for Lazy Pulling

Structure Dockerfiles to maximize lazy pulling benefits.

```dockerfile
# Optimized for lazy pulling
FROM ubuntu:22.04

# Install runtime dependencies first (frequently accessed)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy frequently accessed files first
COPY config/ ./config/
COPY scripts/startup.sh ./

# Copy application binary (always accessed)
COPY --chmod=755 app /app/app

# Copy less frequently accessed resources last
COPY assets/ ./assets/
COPY docs/ ./docs/

# Metadata and documentation (rarely accessed)
COPY README.md LICENSE ./

EXPOSE 8080
CMD ["/app/app"]
```

Image structure matters because startup files that are grouped into small, stable layers are easier to prioritize and prefetch during eStargz optimization. Use `ctr-remote image optimize` or BuildKit eStargz compression to encode the optimized file order.

## Monitoring Lazy Pull Performance

Track lazy pulling effectiveness and performance.

```bash
# Enable metrics in /etc/containerd-stargz-grpc/config.toml:
# metrics_address = "127.0.0.1:8234"

# Check stargz-snapshotter metrics
curl http://127.0.0.1:8234/metrics

# View snapshotter logs
sudo journalctl -u stargz-snapshotter -f

# Check container startup time with vs without lazy pulling
kubectl get events --sort-by='.lastTimestamp' | grep "Started container"
```

Create a Prometheus scrape configuration:

```yaml
# stargz-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: stargz-metrics
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: stargz-snapshotter
      static_configs:
      - targets:
        - 127.0.0.1:8234
```

## Implementing Prefetch Hints

Optimize lazy pulling with a prefetch list for predictable access patterns.

```text
# prefetch-list.txt
/app/app
/app/config/*
/usr/lib/x86_64-linux-gnu/libssl.so.3
```

Use the prefetch list when optimizing the image:

```bash
ctr-remote image optimize \
  --oci \
  --prefetch-list=prefetch-list.txt \
  mycompany/app:v1.0.0 \
  mycompany/app:v1.0.0-esgz
```

## Troubleshooting Lazy Pull Issues

Debug problems with stargz-snapshotter.

```bash
# Check snapshotter status
systemctl status stargz-snapshotter

# Check whether local image content is available
ctr-remote image check mycompany/app:v1.0.0-esgz

# View detailed fetch logs
sudo journalctl -u stargz-snapshotter --since "1 hour ago" | grep fetch

# Compare startup times
time kubectl run test-standard --image=mycompany/app:v1.0.0 --restart=Never
time kubectl run test-lazy --image=mycompany/app:v1.0.0-esgz --restart=Never

# Check for mount errors
sudo dmesg | grep stargz
```

Lazy pulling with stargz-snapshotter dramatically reduces container startup time by eliminating the need to download entire images before starting. This optimization is particularly valuable for large images, batch workloads, and auto-scaling scenarios where fast startup directly impacts application responsiveness. By converting images to eStargz format and deploying with stargz-snapshotter, you can reduce time-to-start from minutes to seconds while maintaining full compatibility with the OCI specification.
