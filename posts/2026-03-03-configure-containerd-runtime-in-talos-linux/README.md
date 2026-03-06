# How to Configure Containerd Runtime in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, containerd, Container Runtime, Kubernetes, System Configuration

Description: A practical guide to configuring the containerd runtime in Talos Linux for custom runtimes, plugins, and performance optimization.

---

Containerd is the container runtime that powers Talos Linux. It handles pulling images, managing container lifecycle, storage, and networking at the node level. While Talos provides a well-tuned default containerd configuration, there are situations where you need to customize it - adding alternative runtimes like gVisor, tweaking storage drivers, or configuring plugins.

This guide covers how to configure containerd in Talos Linux through the machine configuration.

## Containerd in Talos Linux

Talos Linux runs containerd as a core system service. Unlike traditional Linux distributions where you install and configure containerd separately, Talos manages it as part of the operating system. The containerd configuration is generated from the Talos machine configuration and applied automatically.

You customize containerd by dropping configuration fragments into `/var/cri/conf.d/` through the `machine.files` section of the Talos configuration.

## Basic Containerd Customization

The containerd configuration in Talos uses TOML format. You can add configuration fragments that get merged with the base configuration:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              default_runtime_name = "runc"
              snapshotter = "overlayfs"
              discard_unpacked_layers = false
      path: /var/cri/conf.d/20-custom.toml
      op: create
```

The numbering prefix (20-) determines the order in which fragments are applied. Higher numbers override lower numbers.

## Configuring the Default Runtime

The default runtime is what containerd uses when no specific runtime class is requested:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              default_runtime_name = "runc"
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
                  runtime_type = "io.containerd.runc.v2"
                  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
                    SystemdCgroup = true
                    BinaryName = "/usr/bin/runc"
      path: /var/cri/conf.d/20-runtime.toml
      op: create
```

The `SystemdCgroup = true` setting is important because it ensures containerd uses systemd cgroup drivers, which is the recommended setting for Kubernetes.

## Adding gVisor Runtime

gVisor provides an additional security layer by running containers in a user-space kernel. To add gVisor as an available runtime:

First, you need the gVisor system extension installed. Then configure containerd to use it:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.gvisor]
                  runtime_type = "io.containerd.runsc.v1"
                  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.gvisor.options]
                    TypeUrl = "io.containerd.runsc.v1.options"
      path: /var/cri/conf.d/20-gvisor.toml
      op: create
```

Then create the Kubernetes RuntimeClass:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: gvisor
```

Pods can now opt into gVisor:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sandboxed-pod
spec:
  runtimeClassName: gvisor
  containers:
    - name: app
      image: nginx:latest
```

## Adding Kata Containers Runtime

Kata Containers runs each pod in a lightweight virtual machine for stronger isolation:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
                  runtime_type = "io.containerd.kata.v2"
                  privileged_without_host_devices = true
      path: /var/cri/conf.d/20-kata.toml
      op: create
```

## Configuring the Snapshotter

The snapshotter manages how container filesystem layers are stored. Overlayfs is the default and works well in most cases:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              snapshotter = "overlayfs"
      path: /var/cri/conf.d/20-snapshotter.toml
      op: create
```

For certain storage backends, you might use a different snapshotter:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              # Use native snapshotter for btrfs filesystems
              snapshotter = "btrfs"
      path: /var/cri/conf.d/20-snapshotter.toml
      op: create
```

## Configuring Image Decryption

If you use encrypted container images, configure containerd to support decryption:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".image_decryption]
              key_model = "node"
      path: /var/cri/conf.d/20-decryption.toml
      op: create
```

## Stream Server Configuration

The containerd stream server handles `kubectl exec`, `kubectl logs`, and `kubectl port-forward`. You can configure it:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            stream_server_address = "127.0.0.1"
            stream_server_port = "0"
            enable_tls_streaming = false
      path: /var/cri/conf.d/20-streaming.toml
      op: create
```

## Plugin Configuration

Containerd supports various plugins. You can enable or disable them:

```yaml
machine:
  files:
    - content: |
        # Disable unused plugins to reduce resource usage
        [plugins]
          [plugins."io.containerd.internal.v1.tracing"]
            sampling_ratio = 0.0
      path: /var/cri/conf.d/20-plugins.toml
      op: create
```

## Applying the Configuration

Apply containerd configuration changes to your nodes:

```bash
# Apply the full machine configuration
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Verify containerd picked up the changes
talosctl service containerd --nodes 10.0.0.5

# Check containerd logs for errors
talosctl logs containerd --nodes 10.0.0.5

# Read the merged containerd configuration
talosctl read /etc/containerd/config.toml --nodes 10.0.0.5
```

## Verifying Runtime Configuration

After applying changes, verify that the runtimes are properly configured:

```bash
# List available runtimes
talosctl containers --nodes 10.0.0.5

# Test a specific runtime
kubectl run test-gvisor --image=nginx:latest \
  --overrides='{"spec":{"runtimeClassName":"gvisor"}}' \
  --restart=Never

# Verify the pod is running with the correct runtime
kubectl describe pod test-gvisor | grep "Runtime Class"

# Clean up
kubectl delete pod test-gvisor
```

## Troubleshooting Containerd

When containerd is not behaving as expected:

```bash
# Check containerd service status
talosctl service containerd --nodes 10.0.0.5

# View detailed containerd logs
talosctl logs containerd --nodes 10.0.0.5 --tail 100

# Check for configuration syntax errors
talosctl logs containerd --nodes 10.0.0.5 | grep -i "error\|fail\|invalid"

# Verify the config file was written correctly
talosctl read /var/cri/conf.d/20-custom.toml --nodes 10.0.0.5
```

Common issues include TOML syntax errors (missing quotes, wrong bracket nesting), referencing runtime binaries that are not installed, and conflicting settings between configuration fragments.

## Performance Tuning

For high-throughput environments, tune containerd performance:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            max_concurrent_downloads = 10
            max_container_log_line_size = 16384
            [plugins."io.containerd.grpc.v1.cri".containerd]
              discard_unpacked_layers = true
      path: /var/cri/conf.d/20-performance.toml
      op: create
```

The `max_concurrent_downloads` setting controls how many image layers can be downloaded simultaneously. Increasing this speeds up image pulls at the cost of more bandwidth usage.

## Conclusion

Containerd configuration in Talos Linux is managed through TOML configuration fragments that get merged with the base configuration. This approach keeps your customizations clean and upgrade-safe. The most common customizations are adding alternative runtimes for security isolation, tuning performance settings, and configuring the snapshotter. Start with the defaults, and only add configuration fragments for settings you specifically need to change.
