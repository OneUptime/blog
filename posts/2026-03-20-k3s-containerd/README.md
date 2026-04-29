# How to Configure K3s to Use containerd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Containerd, Container Runtime

Description: Learn how to configure and customize the containerd runtime bundled with K3s, including snapshotter settings and containerd configuration overrides.

## Introduction

K3s ships with an embedded containerd runtime, which it manages internally. Unlike Docker-based setups, containerd is a lightweight, industry-standard container runtime that provides excellent performance and is the default runtime in K3s. This guide covers how to configure the embedded containerd runtime and tune it for specific workloads.

## K3s and containerd

K3s bundles its own containerd binary under `/var/lib/rancher/k3s/data/current/bin/containerd`. This embedded containerd is configured and managed by K3s automatically.

Key paths:
- containerd socket: `/run/k3s/containerd/containerd.sock`
- containerd config: `/var/lib/rancher/k3s/agent/etc/containerd/config.toml`
- containerd data: `/var/lib/rancher/k3s/agent/containerd/`

## Viewing the Current containerd Configuration

```bash
# View the generated containerd config

sudo cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml

# Use the bundled ctr tool to interact with containerd
sudo k3s ctr version
sudo k3s ctr images list
sudo k3s ctr containers list
sudo k3s ctr namespaces list
```

## Customizing containerd with a Config Template

K3s generates the containerd config from a template. On current K3s releases, use `config-v3.toml.tmpl` for containerd 2.x and extend the base template instead of copying a fully rendered config:

```bash
# Create the custom config template directory
sudo mkdir -p /var/lib/rancher/k3s/agent/etc/containerd/

# Create a config template (K3s will use this instead of generating its own)
sudo tee /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl > /dev/null <<'TOML'
{{ template "base" . }}
TOML

# Restart K3s to apply
sudo systemctl restart k3s  # Use k3s-agent on agent nodes
```

Older K3s releases that still use containerd 1.7 continue to use `config.toml.tmpl`.

## Configuring the Snapshotter

The snapshotter determines how container layers are stored. Supported options in K3s include `overlayfs` (default), `fuse-overlayfs`, `native`, `btrfs`, and `zfs`.

```bash
# Configure K3s to use a specific snapshotter
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# Use fuse-overlayfs when overlayfs is unavailable on the host
snapshotter: fuse-overlayfs
EOF

sudo systemctl restart k3s  # Use k3s-agent on agent nodes
```

If the K3s data directory is on a Btrfs filesystem, you can use the btrfs snapshotter:

```bash
# Format the data directory partition as btrfs
sudo mkfs.btrfs /dev/nvme0n1p1
sudo mount /dev/nvme0n1p1 /var/lib/rancher

# Configure K3s to use btrfs snapshotter
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
snapshotter: btrfs
EOF

sudo systemctl restart k3s  # Use k3s-agent on agent nodes
```

## Configuring containerd Runtime Classes

Add additional container runtimes (e.g., gVisor, Kata Containers) by appending them to the config template:

```bash
# Add gVisor as an alternative runtime
# Install gVisor's runsc and containerd-shim-runsc-v1 first, and ensure the shim is in PATH.
sudo tee -a /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl > /dev/null <<'TOML'

[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.gvisor]
  runtime_type = "io.containerd.runsc.v1"
TOML

# Restart K3s to apply
sudo systemctl restart k3s  # Use k3s-agent on agent nodes
```

Create a RuntimeClass for gVisor:

```yaml
# gvisor-runtimeclass.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: gvisor
```

```bash
kubectl apply -f gvisor-runtimeclass.yaml

# Use gVisor for a pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gvisor-test
spec:
  runtimeClassName: gvisor
  containers:
    - name: test
      image: alpine
      command: ["sleep", "3600"]
EOF
```

## Configuring containerd Image Garbage Collection

```bash
# Configure GC via containerd config template
sudo tee -a /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl > /dev/null <<'TOML'

[plugins."io.containerd.gc.v1.scheduler"]
  # Maximum amount of time GC may be scheduled
  pause_threshold = 0.02
  # Guarantee GC after this many deletions
  deletion_threshold = 0
  # Guarantee GC after this many metadata mutations
  mutation_threshold = 100
  # Delay after a trigger event before scheduling GC
  schedule_delay = "0ms"
  # Delay after startup before scheduling GC
  startup_delay = "100ms"
TOML

sudo systemctl restart k3s  # Use k3s-agent on agent nodes
```

## Using the Bundled crictl

K3s includes an embedded `crictl` command for containerd debugging:

```bash
# Use the embedded crictl command
sudo k3s crictl ps          # List running containers
sudo k3s crictl images      # List images
sudo k3s crictl pods        # List pods
sudo k3s crictl logs <container-id>  # View container logs

# If you want to use standalone crictl, point it at K3s's containerd socket
export CONTAINER_RUNTIME_ENDPOINT="unix:///run/k3s/containerd/containerd.sock"

# Or create a permanent config for standalone crictl
sudo tee /etc/crictl.yaml > /dev/null <<EOF
runtime-endpoint: unix:///run/k3s/containerd/containerd.sock
image-endpoint: unix:///run/k3s/containerd/containerd.sock
timeout: 10
debug: false
EOF
```

## Pre-Loading Images into containerd

```bash
# Import a saved image directly into K3s's containerd
sudo k3s ctr images import /path/to/image.tar

# Or use the embedded crictl command
sudo k3s crictl pull my-image:latest

# Verify images
sudo k3s ctr images list | grep my-image
```

## Monitoring containerd Performance

```bash
# Check combined K3s + containerd CPU and memory usage
sudo systemd-cgtop

# Check containerd logs
sudo tail -f /var/lib/rancher/k3s/agent/containerd/containerd.log

# Check containerd events
sudo k3s ctr events
```

## Conclusion

K3s's embedded containerd provides a robust container runtime with sensible defaults. Most users don't need to modify the containerd configuration, but when customization is needed - such as adding sandbox runtimes, tuning the snapshotter, or configuring custom GC settings - the `config-v3.toml.tmpl` base template provides a clean way to override defaults on current K3s releases. The bundled `ctr` and `crictl` tools give you direct access to containerd for debugging and image management.
