# How to Configure Container Runtime (CRI) Settings in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CRI, containerd, Container Runtime, Kubernetes

Description: A practical guide to configuring Container Runtime Interface settings in Talos Linux for better performance and control.

---

Talos Linux uses containerd as its container runtime, and all interaction between Kubernetes and containerd happens through the Container Runtime Interface (CRI). While Talos provides sensible defaults, there are many situations where you need to customize CRI settings - whether for performance tuning, security hardening, or supporting specific workload requirements.

This guide walks through the CRI configuration options available in Talos Linux and shows you how to apply them effectively.

## How CRI Works in Talos Linux

The CRI is a plugin API that allows the kubelet to communicate with container runtimes without needing to know the specifics of each runtime. In Talos Linux, containerd implements the CRI, and the kubelet talks to it over a Unix socket.

The CRI configuration in Talos is managed through the machine configuration under `machine.files` for containerd configuration or through the `cluster.proxy` and registry settings. The main containerd CRI settings are controlled in the containerd configuration that Talos generates.

## Configuring CRI Through Machine Config

Talos exposes CRI settings through several configuration paths. The most direct way is through the `machine.kubelet` section:

```yaml
machine:
  kubelet:
    extraArgs:
      # Point kubelet to the containerd CRI socket
      container-runtime-endpoint: "unix:///var/run/containerd/containerd.sock"
```

For more granular containerd CRI configuration, you can provide custom containerd configuration through machine files:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            enable_selinux = false
            sandbox_image = "registry.k8s.io/pause:3.9"
            max_container_log_line_size = 16384
            [plugins."io.containerd.grpc.v1.cri".containerd]
              default_runtime_name = "runc"
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
                  runtime_type = "io.containerd.runc.v2"
                  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
                    SystemdCgroup = true
      path: /etc/cri/conf.d/20-customization.toml
      op: create
```

Talos allows you to drop configuration fragments into `/etc/cri/conf.d/` which get merged with the base containerd configuration.

## Configuring the Sandbox (Pause) Image

The sandbox image, commonly called the pause container, is used for every pod. Configuring it is important in air-gapped environments or when you want to use a specific version:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            sandbox_image = "my-registry.example.com/pause:3.9"
      path: /etc/cri/conf.d/20-sandbox.toml
      op: create
```

## Runtime Classes

Kubernetes supports multiple container runtimes through RuntimeClass objects. You can configure additional runtimes in Talos by adding them to the containerd configuration:

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
                [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
                  runtime_type = "io.containerd.kata.v2"
      path: /etc/cri/conf.d/20-runtimes.toml
      op: create
```

Then create the corresponding Kubernetes RuntimeClass:

```yaml
# RuntimeClass for gVisor
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: gvisor
---
# RuntimeClass for Kata Containers
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
```

Pods can then select their runtime:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  runtimeClassName: gvisor
  containers:
    - name: app
      image: myapp:latest
```

## CRI Image Configuration

You can configure how the CRI handles container images:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              # Discard unpacked layers after creating the snapshot
              discard_unpacked_layers = true
              # Snapshotter to use
              snapshotter = "overlayfs"
      path: /etc/cri/conf.d/20-image-config.toml
      op: create
```

The `discard_unpacked_layers` option saves disk space by removing unpacked image layers after they have been applied to the snapshotter. This is useful on nodes with limited storage.

## Container Log Configuration

CRI manages container logs. You can configure log rotation and maximum sizes:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            max_container_log_line_size = 16384
      path: /etc/cri/conf.d/20-logging.toml
      op: create
```

You can also control log settings through kubelet configuration:

```yaml
machine:
  kubelet:
    extraConfig:
      containerLogMaxSize: "100Mi"
      containerLogMaxFiles: 5
```

These kubelet settings work alongside the CRI configuration to manage how container logs are stored and rotated.

## CNI Configuration

The CRI also handles CNI (Container Network Interface) plugin configuration. In Talos, CNI is typically managed by the cluster configuration rather than the CRI directly:

```yaml
cluster:
  network:
    cni:
      name: custom
      urls:
        - https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

If you need custom CNI configuration at the CRI level:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".cni]
              bin_dir = "/opt/cni/bin"
              conf_dir = "/etc/cni/net.d"
      path: /etc/cri/conf.d/20-cni.toml
      op: create
```

## Resource Limits for Containers

You can set default resource limits at the CRI level that apply to all containers:

```yaml
machine:
  files:
    - content: |
        [plugins]
          [plugins."io.containerd.grpc.v1.cri"]
            [plugins."io.containerd.grpc.v1.cri".containerd]
              [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
                [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]
                  SystemdCgroup = true
      path: /etc/cri/conf.d/20-cgroup.toml
      op: create
```

Using SystemdCgroup ensures that container resource limits are enforced through systemd cgroups, which is the recommended approach for Kubernetes.

## Applying and Verifying

Apply the configuration to your nodes:

```bash
# Apply the configuration
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Verify containerd is running with the new configuration
talosctl service containerd --nodes 10.0.0.5

# Check containerd logs for configuration errors
talosctl logs containerd --nodes 10.0.0.5

# Verify CRI is responding
talosctl containers --nodes 10.0.0.5
```

## Debugging CRI Issues

When containers fail to start or behave unexpectedly, check the CRI configuration:

```bash
# View the active containerd configuration
talosctl read /etc/containerd/config.toml --nodes 10.0.0.5

# Check CRI plugin status
talosctl logs containerd --nodes 10.0.0.5 | grep -i cri

# List running containers through CRI
talosctl containers --nodes 10.0.0.5 -k
```

Common issues include invalid TOML syntax in configuration fragments, referencing runtimes that are not installed, and permission problems with socket files.

## Conclusion

CRI configuration in Talos Linux gives you control over how containers are created, managed, and networked. The configuration fragment approach using `/etc/cri/conf.d/` keeps your customizations separate from the base configuration, making upgrades cleaner. Focus on the settings that matter most for your workloads - runtime classes for security isolation, image handling for storage efficiency, and logging for operational visibility. The defaults work well for most clusters, so only change what you need to.
