# How to Implement Container Image Lazy Pulling with Stargz Snapshotter on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Images, Performance, Stargz, Lazy Loading

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
STARGZ_VERSION="v0.15.0"
wget https://github.com/containerd/stargz-snapshotter/releases/download/${STARGZ_VERSION}/stargz-snapshotter-${STARGZ_VERSION}-linux-amd64.tar.gz

tar xzf stargz-snapshotter-${STARGZ_VERSION}-linux-amd64.tar.gz
sudo cp stargz-snapshotter/containerd-stargz-grpc /usr/local/bin/
sudo chmod +x /usr/local/bin/containerd-stargz-grpc

# Create systemd service
sudo cat > /etc/systemd/system/stargz-snapshotter.service <<EOF
[Unit]
Description=stargz snapshotter
After=network.target

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

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    snapshotter = "stargz"
    disable_snapshot_annotations = false

[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://registry-1.docker.io"]
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Converting Images to Stargz Format

Convert existing images to eStargz format that supports lazy pulling.

```bash
# Install ctr-remote
wget https://github.com/containerd/stargz-snapshotter/releases/download/v0.15.0/ctr-remote-v0.15.0-linux-amd64.tar.gz
tar xzf ctr-remote-v0.15.0-linux-amd64.tar.gz
sudo cp ctr-remote /usr/local/bin/
sudo chmod +x /usr/local/bin/ctr-remote

# Convert an image to eStargz
ctr-remote images optimize \
  --oci \
  --period-msec=10 \
  mycompany/app:v1.0.0 \
  mycompany/app:v1.0.0-esgz

# Push the optimized image
ctr-remote images push mycompany/app:v1.0.0-esgz
```

Optimize during build with Docker Buildx:

```bash
# Build image with eStargz layers
docker buildx build \
  --platform linux/amd64 \
  --output type=image,name=mycompany/app:latest,compression=estargz,oci-mediatypes=true,push=true \
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
    - uses: actions/checkout@v3
    
    - name: Set up QEMU
      uses: docker/setup-qemu-action@v2
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Registry
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push eStargz image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: mycompany/app:${{ github.sha }}-esgz
        outputs: type=image,compression=estargz,oci-mediatypes=true
```

## Deploying Workloads with Lazy Pulling

Deploy pods that use eStargz images for fast startup.

```yaml
# lazy-pull-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fast-startup-app
  annotations:
    io.containerd.image.pull-policy: "lazy"
spec:
  replicas: 5
  selector:
    matchLabels:
      app: fast-startup
  template:
    metadata:
      labels:
        app: fast-startup
      annotations:
        # Enable stargz lazy pulling
        io.containerd.cri.runtime-handler: "stargz"
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

File ordering matters because stargz-snapshotter fetches files in the order they're accessed. Place frequently accessed files earlier in layers.

## Monitoring Lazy Pull Performance

Track lazy pulling effectiveness and performance.

```bash
# Check stargz-snapshotter metrics
curl http://localhost:50051/metrics

# View snapshotter logs
sudo journalctl -u stargz-snapshotter -f

# Check container startup time with vs without lazy pulling
kubectl get events --sort-by='.lastTimestamp' | grep "Started container"
```

Create Prometheus metrics:

```yaml
# stargz-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: stargz-metrics
data:
  queries.yml: |
    groups:
    - name: stargz
      rules:
      - record: stargz_fetch_duration_seconds
        expr: histogram_quantile(0.99, rate(stargz_fs_operation_duration_seconds_bucket{operation="read"}[5m]))
      
      - record: stargz_cache_hit_rate
        expr: rate(stargz_cache_hits_total[5m]) / rate(stargz_cache_requests_total[5m])
      
      - record: stargz_bytes_fetched
        expr: rate(stargz_bytes_downloaded_total[5m])
```

## Implementing Prefetch Hints

Optimize lazy pulling with prefetch hints for predictable access patterns.

```yaml
# Add prefetch annotations to images
apiVersion: v1
kind: Pod
metadata:
  name: optimized-lazy-pull
  annotations:
    # Prefetch specific paths
    io.containerd.image.prefetch: |
      [
        "/app/app",
        "/app/config/*",
        "/usr/lib/x86_64-linux-gnu/libssl.so.3"
      ]
spec:
  containers:
  - name: app
    image: mycompany/app:v1.0.0-esgz
```

Create prefetch profiles:

```json
{
  "prefetch": {
    "landmarks": [
      "/app/app",
      "/app/config/default.yaml",
      "/lib/x86_64-linux-gnu/libc.so.6"
    ],
    "patterns": [
      "/app/config/*.yaml",
      "/usr/lib/*.so*"
    ]
  }
}
```

## Troubleshooting Lazy Pull Issues

Debug problems with stargz-snapshotter.

```bash
# Check snapshotter status
systemctl status stargz-snapshotter

# Test eStargz image compatibility
ctr-remote images check mycompany/app:v1.0.0-esgz

# View detailed fetch logs
sudo journalctl -u stargz-snapshotter --since "1 hour ago" | grep fetch

# Compare startup times
time kubectl run test-standard --image=mycompany/app:v1.0.0 --restart=Never
time kubectl run test-lazy --image=mycompany/app:v1.0.0-esgz --restart=Never

# Check for mount errors
sudo dmesg | grep stargz
```

Lazy pulling with stargz-snapshotter dramatically reduces container startup time by eliminating the need to download entire images before starting. This optimization is particularly valuable for large images, batch workloads, and auto-scaling scenarios where fast startup directly impacts application responsiveness. By converting images to eStargz format and deploying with stargz-snapshotter, you can reduce time-to-start from minutes to seconds while maintaining full compatibility with the OCI specification.
