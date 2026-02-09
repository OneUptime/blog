# How to Configure containerd Runtime Options for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, containerd, Container Runtime, Configuration

Description: Learn how to configure containerd runtime options for Kubernetes clusters, including CRI plugin settings, runtime handlers, and performance tuning for optimal container execution.

---

Configuring containerd runtime options properly is critical for Kubernetes cluster performance and stability. As the default container runtime for many Kubernetes distributions, containerd offers extensive configuration options that control how containers are created, executed, and managed. This guide walks you through the essential runtime configuration options you need to know.

## Understanding containerd Configuration Structure

The containerd configuration file uses TOML format and is typically located at `/etc/containerd/config.toml`. The configuration is organized into sections that control different aspects of the runtime.

Generate a default configuration file:

```bash
# Generate default containerd configuration
containerd config default > /etc/containerd/config.toml

# Restart containerd to apply changes
systemctl restart containerd
```

The configuration file contains several key sections including plugins, grpc settings, and runtime options.

## Configuring the CRI Plugin

The CRI (Container Runtime Interface) plugin is the bridge between Kubernetes and containerd. Configure it in the `plugins."io.containerd.grpc.v1.cri"` section:

```toml
[plugins."io.containerd.grpc.v1.cri"]
  # Disable the CRI plugin (false = enabled)
  disable_tcp_service = true

  # Stream server settings
  stream_server_address = "127.0.0.1"
  stream_server_port = "0"

  # Enable CRI stats collection
  enable_selinux = false
  enable_tls_streaming = false

  # Maximum container log line size
  max_container_log_line_size = 16384

  # Disable cgroup driver (false = use cgroupfs, true = systemd)
  [plugins."io.containerd.grpc.v1.cri".containerd]
    snapshotter = "overlayfs"
    default_runtime_name = "runc"

    # Disable snapshot garbage collection
    discard_unpacked_layers = true
```

The snapshotter option determines how container filesystem layers are managed. The overlayfs snapshotter provides good performance for most workloads.

## Setting Up SystemdCgroup Driver

For systems using systemd as the init system, configure containerd to use the systemd cgroup driver. This ensures consistency with how kubelet manages cgroups:

```toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    # Enable systemd cgroup driver
    SystemdCgroup = true

    # Binary name for runc
    BinaryName = "/usr/bin/runc"

    # Root directory for the runtime
    Root = ""
```

Verify the cgroup driver configuration:

```bash
# Check containerd configuration
containerd config dump | grep SystemdCgroup

# Verify kubelet is using the same driver
ps aux | grep kubelet | grep cgroup-driver
```

Both containerd and kubelet must use the same cgroup driver to avoid pod creation failures.

## Configuring Multiple Runtime Handlers

Runtime handlers allow you to support different OCI runtimes for specific workloads. Configure additional runtimes alongside the default runc:

```toml
# Default runc runtime
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true

# gVisor runsc runtime for enhanced isolation
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
    TypeUrl = "io.containerd.runsc.v1.options"
    ConfigPath = "/etc/containerd/runsc.toml"

# Kata Containers for VM-based isolation
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
  runtime_type = "io.containerd.kata.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata.options]
    ConfigPath = "/etc/kata-containers/configuration.toml"
```

Create a RuntimeClass to use these handlers in Kubernetes:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
---
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  runtimeClassName: gvisor
  containers:
  - name: app
    image: nginx:latest
```

## Configuring CNI Plugin Paths

Container Network Interface (CNI) plugins handle pod networking. Configure the paths where containerd looks for CNI plugins and configuration:

```toml
[plugins."io.containerd.grpc.v1.cri".cni]
  # Directory containing CNI binaries
  bin_dir = "/opt/cni/bin"

  # Directory containing CNI configuration files
  conf_dir = "/etc/cni/net.d"

  # Maximum number of concurrent CNI operations
  max_conf_num = 1

  # CNI configuration template
  conf_template = ""
```

Verify CNI plugin installation:

```bash
# List installed CNI plugins
ls -la /opt/cni/bin/

# Check CNI configuration
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/10-containerd-net.conflist
```

## Registry Configuration and Mirrors

Configure private registries, mirrors, and authentication in the registry section:

```toml
[plugins."io.containerd.grpc.v1.cri".registry]
  # Default registry configuration
  config_path = "/etc/containerd/certs.d"

  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://registry-1.docker.io"]

    # Add a mirror for Docker Hub
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."registry.example.com"]
      endpoint = ["https://registry.example.com"]

  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.example.com".tls]
      insecure_skip_verify = false
      ca_file = "/etc/containerd/certs.d/registry.example.com/ca.crt"

    [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.example.com".auth]
      username = "user"
      password = "password"
```

## Resource Limits and Performance Tuning

Configure resource limits and performance parameters for the containerd daemon:

```toml
# GRPC server configuration
[grpc]
  # Maximum message size for gRPC
  max_recv_message_size = 16777216
  max_send_message_size = 16777216

  # Connection timeout
  timeout = 0

# OOM score for containerd process
oom_score = -999

# Root directory for containerd metadata
root = "/var/lib/containerd"

# State directory for runtime state
state = "/run/containerd"

# Enable metrics endpoint
[metrics]
  address = "127.0.0.1:1338"
  grpc_histogram = false
```

Monitor containerd metrics:

```bash
# Query containerd metrics
curl http://127.0.0.1:1338/v1/metrics

# Check containerd resource usage
systemctl status containerd
```

## Image Pull Configuration

Control how containerd handles image pulls and storage:

```toml
[plugins."io.containerd.grpc.v1.cri".containerd]
  # Disable unpacking of layers after pull
  disable_snapshot_annotations = true

  # Discard unpacked layers to save disk space
  discard_unpacked_layers = false

  # Image pull timeout
  [plugins."io.containerd.grpc.v1.cri".image_pull_progress_timeout]
    duration = "1m"

  # Maximum concurrent image pulls
  [plugins."io.containerd.grpc.v1.cri".max_concurrent_downloads]
    value = 3
```

## Debugging and Logging Configuration

Configure logging levels for troubleshooting:

```toml
# Debug configuration
[debug]
  # Debug socket path
  address = "/run/containerd/debug.sock"

  # Process IDs
  uid = 0
  gid = 0

  # Log level: trace, debug, info, warn, error, fatal, panic
  level = "info"
```

Enable debug logging temporarily:

```bash
# Edit systemd service to add debug flag
systemctl edit containerd

# Add this content:
[Service]
ExecStart=
ExecStart=/usr/bin/containerd --log-level debug

# Reload and restart
systemctl daemon-reload
systemctl restart containerd

# View detailed logs
journalctl -u containerd -f
```

## Validating Configuration Changes

After modifying the configuration, validate it before restarting containerd:

```bash
# Check configuration syntax
containerd config dump > /tmp/config-test.toml

# Compare with current config
diff /etc/containerd/config.toml /tmp/config-test.toml

# Apply configuration
systemctl restart containerd

# Verify containerd is running
systemctl status containerd

# Test with crictl
crictl info
crictl images
crictl ps
```

If containerd fails to start, check the journal logs:

```bash
# View recent logs
journalctl -u containerd -n 100 --no-pager

# Follow logs in real-time
journalctl -u containerd -f
```

Proper containerd configuration ensures your Kubernetes cluster runs efficiently with the right balance of security, performance, and functionality. Start with the defaults and adjust based on your specific workload requirements and infrastructure constraints.
