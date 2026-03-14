# How to Generate Machine Configurations with talosctl gen config

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Talosctl, Kubernetes, YAML

Description: Master the talosctl gen config command to generate and customize machine configurations for your Talos Linux cluster.

---

Machine configurations are the backbone of Talos Linux. Every aspect of a Talos node - its network settings, disk configuration, Kubernetes parameters, and security settings - is defined in a YAML configuration file. The `talosctl gen config` command generates these files for you, and understanding how to use it effectively is essential for working with Talos.

## The Basics

At its simplest, `talosctl gen config` takes two required arguments: a cluster name and the Kubernetes API endpoint URL.

```bash
# Generate machine configurations
talosctl gen config my-cluster https://192.168.1.100:6443
```

This produces four files in your current directory:

| File | Purpose |
|------|---------|
| `controlplane.yaml` | Machine configuration for control plane nodes |
| `worker.yaml` | Machine configuration for worker nodes |
| `talosconfig` | Client configuration for talosctl |

The cluster name appears in the generated configurations and identifies your cluster. The endpoint URL is where the Kubernetes API will be accessible.

## Output Directory

By default, files are written to the current directory. You can specify a different location:

```bash
# Output to a specific directory
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --output-dir ./cluster-configs

# Check what was generated
ls ./cluster-configs/
# controlplane.yaml  worker.yaml  talosconfig
```

## Specifying the Talos Version

You can pin the configuration to a specific Kubernetes version:

```bash
# Generate config targeting a specific Kubernetes version
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --kubernetes-version 1.29.0
```

If you do not specify this, the default Kubernetes version for your installed `talosctl` version is used.

## Configuration Patches

Patches are the primary way to customize your machine configurations. You can apply patches to both control plane and worker configurations, or target them individually.

### Patching Both Node Types

```bash
# Apply a patch to both control plane and worker configs
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @common-patch.yaml
```

Example common patch:

```yaml
# common-patch.yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
  time:
    servers:
      - time.cloudflare.com
```

### Patching Control Plane Only

```bash
# Apply a patch only to the control plane config
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch-control-plane @cp-patch.yaml
```

Example control plane patch:

```yaml
# cp-patch.yaml
cluster:
  allowSchedulingOnControlPlanes: true
machine:
  network:
    interfaces:
      - interface: eth0
        vip:
          ip: 192.168.1.100
```

### Patching Workers Only

```bash
# Apply a patch only to the worker config
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch-worker @worker-patch.yaml
```

Example worker patch:

```yaml
# worker-patch.yaml
machine:
  kubelet:
    extraArgs:
      max-pods: "250"
```

### Multiple Patches

You can apply multiple patches at once. They are applied in order:

```bash
# Apply multiple patches
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @network-patch.yaml \
  --config-patch @dns-patch.yaml \
  --config-patch-control-plane @vip-patch.yaml \
  --config-patch-worker @kubelet-patch.yaml
```

### Inline JSON Patches

For small changes, you can use inline JSON patches instead of files:

```bash
# Inline JSON patch to allow scheduling on control planes
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

## Install Disk Configuration

By default, Talos installs to `/dev/sda`. If your disk has a different path, override it:

```bash
# Specify the install disk
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-disk /dev/nvme0n1
```

Or via a patch:

```yaml
# disk-patch.yaml
machine:
  install:
    disk: /dev/nvme0n1
```

## Install Image

You can specify a custom Talos installer image, which is useful when using the Image Factory with custom extensions:

```bash
# Use a custom installer image
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-image factory.talos.dev/installer/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba:v1.9.0
```

## Cluster-Level Options

### DNS Domain

Change the Kubernetes cluster DNS domain (default is `cluster.local`):

```bash
# Custom DNS domain
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --dns-domain my-cluster.local
```

### Cluster Network CIDR

Configure the pod and service CIDR ranges:

```yaml
# network-patch.yaml
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

### CNI Configuration

Talos uses Flannel as the default CNI. You can switch to a different CNI:

```yaml
# cilium-cni-patch.yaml
cluster:
  network:
    cni:
      name: none  # Disable default CNI so you can install Cilium manually
```

## Examining the Generated Configuration

After generating the files, inspect them to understand what was produced:

```bash
# View the control plane configuration
cat controlplane.yaml

# View just the cluster section
talosctl machineconfig info controlplane.yaml
```

The configuration is a standard YAML document with two top-level sections:

- `machine` - Node-specific settings (network, disks, kubelet, etc.)
- `cluster` - Cluster-wide settings (API server, etcd, networking, etc.)

## Regenerating Configurations

If you need to regenerate configurations (perhaps you changed a patch), be careful about secrets. Each time you run `gen config`, new secrets are generated, meaning your existing nodes will no longer trust the new configurations.

To keep the same secrets across regenerations:

```bash
# First time: generate and save the secrets
talosctl gen secrets --output-file secrets.yaml

# Subsequent times: use the saved secrets
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --with-secrets secrets.yaml
```

This is critical in production. Without consistent secrets, you cannot add new nodes to an existing cluster or regenerate configs for existing nodes.

## Real-World Example

Here is a complete example that brings everything together for a production-like cluster:

```bash
# Save secrets for future use
talosctl gen secrets --output-file secrets.yaml

# Generate configs with multiple customizations
talosctl gen config prod-cluster https://k8s.example.com:6443 \
  --with-secrets secrets.yaml \
  --kubernetes-version 1.29.0 \
  --install-disk /dev/nvme0n1 \
  --config-patch @common-settings.yaml \
  --config-patch-control-plane @cp-settings.yaml \
  --config-patch-worker @worker-settings.yaml \
  --output-dir ./prod-configs
```

The `talosctl gen config` command is the starting point for every Talos Linux cluster. By combining it with patches and saved secrets, you can produce repeatable, customized configurations that cover everything from simple development setups to complex production environments. Take the time to understand the available options, and your cluster deployments will be smooth and predictable.
