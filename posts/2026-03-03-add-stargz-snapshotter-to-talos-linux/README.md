# How to Add Stargz Snapshotter to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Stargz, Container Images, Lazy Loading, Kubernetes

Description: Learn how to install and configure the Stargz Snapshotter on Talos Linux for lazy-loading container images and faster pod startup times.

---

Container image pull times are a significant factor in pod startup latency. When a node needs to run a new image, it must download the entire image before the container can start. For large images - think machine learning frameworks, Java applications with big dependencies, or data processing tools - this can take minutes. The Stargz Snapshotter solves this problem by enabling lazy loading of container images, where only the files actually needed at startup are fetched initially, and the rest are loaded on demand in the background.

This guide shows you how to install the Stargz Snapshotter on Talos Linux and use it to speed up your container deployments.

## How Stargz Works

Standard container images use tar+gzip format, which requires downloading and decompressing the entire layer before any file can be accessed. eStargz (Seekable tar.gz) is an alternative image format that makes individual files within a layer directly accessible without decompressing the whole layer.

The Stargz Snapshotter integrates with containerd and works like this:

1. A container is created referencing an eStargz image
2. Instead of pulling the entire image, the snapshotter mounts the image layers using FUSE
3. Files are fetched on demand as the container accesses them
4. Prefetch lists in the eStargz format tell the snapshotter which files to prioritize
5. Remaining files are downloaded in the background

The result is that containers can start before their images are fully downloaded, dramatically reducing startup time for large images.

## Installing the Stargz Extension

### Machine Configuration

Add the Stargz Snapshotter extension to your Talos machine configuration.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/stargz-snapshotter:v0.15.1
```

### Image Factory

```bash
# Create a schematic
cat > stargz-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/stargz-snapshotter
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @stargz-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Applying the Extension

Install the extension on your worker nodes.

```bash
# Apply configuration
talosctl -n 10.0.0.20 apply-config --file worker.yaml

# Upgrade to install the extension
talosctl -n 10.0.0.20 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Verify node health
talosctl -n 10.0.0.20 health
```

## Verifying the Installation

Check that the Stargz Snapshotter is running.

```bash
# Verify the extension is loaded
talosctl -n 10.0.0.20 get extensions

# Check the stargz-snapshotter service
talosctl -n 10.0.0.20 services | grep stargz

# Check containerd plugins for stargz
talosctl -n 10.0.0.20 logs containerd | grep stargz

# Verify the FUSE device is available (needed for lazy loading)
talosctl -n 10.0.0.20 ls /dev/fuse
```

## Configuring Containerd for Stargz

The Stargz extension configures containerd automatically, but you may want to verify or customize the configuration.

```yaml
# Verify containerd is configured to use the stargz snapshotter
machine:
  files:
    - content: |
        [proxy_plugins.stargz]
          type = "snapshot"
          address = "/run/containerd-stargz-grpc/containerd-stargz-grpc.sock"
      permissions: 0o644
      path: /var/cri/conf.d/stargz.toml
      op: create
```

## Converting Images to eStargz Format

To take advantage of lazy loading, your container images need to be in eStargz format. The `ctr-remote` tool or `nerdctl` can convert existing images.

### Using nerdctl

```bash
# Install nerdctl on your development machine
# https://github.com/containerd/nerdctl

# Convert an existing image to eStargz format
nerdctl image convert --estargz \
  --oci \
  nginx:1.25 \
  registry.example.com/nginx:1.25-estargz

# Push the converted image
nerdctl push registry.example.com/nginx:1.25-estargz
```

### Using crane

```bash
# Install crane
go install github.com/google/go-containerregistry/cmd/crane@latest

# Convert and push (using optimize subcommand)
crane optimize \
  nginx:1.25 \
  registry.example.com/nginx:1.25-estargz
```

### Using stargz-store directly

```bash
# Pull and convert using ctr-remote
ctr-remote images optimize \
  --period=20 \
  docker.io/library/nginx:1.25 \
  registry.example.com/nginx:1.25-estargz

# The --period flag specifies how long to record file access patterns
# Files accessed during this period become part of the prefetch list
```

## Creating Optimized Images with Access Patterns

For best performance, create eStargz images that include prefetch hints based on actual startup access patterns.

```bash
# Record the files accessed during container startup
ctr-remote images optimize \
  --period=30 \
  --entrypoint='["nginx", "-g", "daemon off;"]' \
  docker.io/library/nginx:1.25 \
  registry.example.com/nginx:1.25-optimized

# The optimizer runs the container for 30 seconds and records
# which files are accessed during startup
# These files are prioritized in the eStargz format
```

## Deploying Workloads with Stargz

Once the snapshotter is installed and you have eStargz images, deploy workloads that use them.

```yaml
# nginx-stargz.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-fast-start
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-fast-start
  template:
    metadata:
      labels:
        app: nginx-fast-start
    spec:
      containers:
        - name: nginx
          image: registry.example.com/nginx:1.25-estargz
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f nginx-stargz.yaml

# Watch the pods start up
kubectl get pods -l app=nginx-fast-start -w

# Compare startup time with standard images
```

## Benchmarking Startup Times

Measure the impact of the Stargz Snapshotter on your actual workloads.

```bash
#!/bin/bash
# benchmark-startup.sh

# Test with standard image
echo "Testing standard image..."
START=$(date +%s%N)
kubectl run test-standard --image=registry.example.com/myapp:latest \
  --restart=Never
kubectl wait --for=condition=Ready pod/test-standard --timeout=120s
END=$(date +%s%N)
STANDARD_MS=$(( (END - START) / 1000000 ))
echo "Standard image startup: ${STANDARD_MS}ms"
kubectl delete pod test-standard

# Test with eStargz image
echo "Testing eStargz image..."
START=$(date +%s%N)
kubectl run test-stargz --image=registry.example.com/myapp:latest-estargz \
  --restart=Never
kubectl wait --for=condition=Ready pod/test-stargz --timeout=120s
END=$(date +%s%N)
STARGZ_MS=$(( (END - START) / 1000000 ))
echo "eStargz image startup: ${STARGZ_MS}ms"
kubectl delete pod test-stargz

echo "Speedup: $(( STANDARD_MS / STARGZ_MS ))x faster"
```

## Configuring Registry Mirrors with Stargz

If you use registry mirrors, configure them for the Stargz Snapshotter.

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://mirror.example.com
      registry.example.com:
        endpoints:
          - https://registry.example.com
    config:
      registry.example.com:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            ... your CA cert ...
            -----END CERTIFICATE-----
```

## Content Verification

The Stargz Snapshotter supports content verification to ensure image integrity even during lazy loading.

```bash
# When converting images, sign them with cosign
cosign sign registry.example.com/nginx:1.25-estargz

# Configure containerd to verify signatures
# This is handled through Kubernetes admission controllers
# or containerd policy configuration
```

## Handling Fallback to Standard Pulls

If an image is not in eStargz format, the snapshotter falls back to standard pulling behavior. This means you can enable the snapshotter globally without breaking existing workloads.

```bash
# Standard images still work - they just pull normally
kubectl run standard-image --image=nginx:1.25

# eStargz images benefit from lazy loading
kubectl run estargz-image --image=registry.example.com/nginx:1.25-estargz
```

## Monitoring and Observability

Monitor the Stargz Snapshotter to understand its impact.

```bash
# Check snapshotter metrics
talosctl -n <node-ip> read /proc/net/sockstat

# View Stargz service logs
talosctl -n <node-ip> logs ext-stargz-snapshotter

# Check FUSE mount points
talosctl -n <node-ip> read /proc/mounts | grep fuse
```

## Production Considerations

When running the Stargz Snapshotter in production, keep these points in mind:

1. **Registry availability** - Since files are fetched on demand, the registry must be available not just at pull time but throughout the pod's lifecycle. If the registry goes down, file accesses will fail.

2. **Network latency** - Lazy loading trades startup time for ongoing network requests. If your registry is slow, individual file accesses may be slow.

3. **Prefetch optimization** - Invest time in creating optimized eStargz images with good prefetch lists. This minimizes on-demand fetches during normal operation.

4. **Caching** - The snapshotter caches fetched content locally. Subsequent accesses to the same files are fast.

5. **FUSE overhead** - The FUSE-based file access adds some overhead compared to direct filesystem access. For I/O-intensive workloads, test thoroughly.

## Conclusion

The Stargz Snapshotter is a practical solution for reducing container startup times on Talos Linux. By enabling lazy loading of container images, pods can start as soon as their essential files are available rather than waiting for the entire image to download. The biggest improvements are seen with large images where only a fraction of the files are needed at startup. While it requires converting your images to eStargz format and maintaining registry availability, the reduced pod startup latency can significantly improve the responsiveness of your Kubernetes cluster, especially for autoscaling workloads that need to spin up quickly.
