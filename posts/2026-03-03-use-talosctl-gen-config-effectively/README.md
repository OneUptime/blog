# How to Use talosctl gen config Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Configuration Generation, Talosctl, Cluster Setup

Description: Master the talosctl gen config command to generate Talos Linux cluster configurations with the right options for your environment.

---

Before you can run a Talos Linux cluster, you need machine configurations for each type of node. The `talosctl gen config` command generates these configurations, including all the TLS certificates, encryption keys, and cluster settings needed to bootstrap a secure Kubernetes cluster. Using this command effectively means understanding its options and knowing how to customize the output for your specific environment.

## What gen config Generates

Running `talosctl gen config` produces several files:

- **controlplane.yaml** - The machine configuration for control plane nodes
- **worker.yaml** - The machine configuration for worker nodes
- **talosconfig** - The client configuration for talosctl
- **secrets.yaml** (optional) - The cluster secrets bundle

These files contain everything needed to bring up a Talos Linux cluster from bare machines.

## Basic Usage

The simplest form of the command:

```bash
# Generate configurations for a cluster named "my-cluster"
# with the Kubernetes API endpoint at the given URL
talosctl gen config my-cluster https://10.0.0.1:6443
```

The first argument is the cluster name. The second is the Kubernetes API endpoint URL. This endpoint is where kubelets and kubectl will connect to the API server. For a single control plane node, this is its IP. For a multi-node control plane, this should be a load balancer address.

## Choosing the Right Endpoint

The endpoint URL is critical. It must be reachable by all nodes in the cluster and by your workstation:

```bash
# Single control plane node
talosctl gen config my-cluster https://10.0.0.1:6443

# Load balancer in front of multiple control plane nodes
talosctl gen config my-cluster https://api.mycluster.example.com:6443

# VIP (Virtual IP) shared by control plane nodes
talosctl gen config my-cluster https://10.0.0.100:6443
```

Using a load balancer or VIP is strongly recommended for production clusters. If you point the endpoint at a single node and that node goes down, the entire cluster becomes inaccessible from the outside.

## Output Options

### Specifying Output Directory

```bash
# Output files to a specific directory
talosctl gen config my-cluster https://10.0.0.1:6443 --output ./cluster-configs/
```

### Output to Stdout

```bash
# Output specific type to stdout (useful for piping)
talosctl gen config my-cluster https://10.0.0.1:6443 --output-types controlplane -o -
```

### Generate Specific Types Only

```bash
# Generate only the control plane config
talosctl gen config my-cluster https://10.0.0.1:6443 --output-types controlplane

# Generate only the worker config
talosctl gen config my-cluster https://10.0.0.1:6443 --output-types worker

# Generate only the talosconfig
talosctl gen config my-cluster https://10.0.0.1:6443 --output-types talosconfig
```

## Using Secrets Bundles

The secrets bundle contains all the cryptographic material for the cluster (certificates, keys, bootstrap tokens). Managing it separately gives you more flexibility:

### Generating a Secrets Bundle

```bash
# Generate just the secrets
talosctl gen secrets -o secrets.yaml
```

### Using a Secrets Bundle

```bash
# Generate configs using existing secrets
talosctl gen config my-cluster https://10.0.0.1:6443 --with-secrets secrets.yaml
```

This is important for two scenarios:

1. **Regenerating configs after losing them** - If you still have the secrets, you can regenerate compatible configurations
2. **Generating configs in a CI/CD pipeline** - Store secrets securely and use them to generate configs on demand

## Configuration Patches

Patches let you customize the generated configuration without manually editing YAML files:

### Inline Patches

```bash
# Set a custom hostname
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch '[{"op": "add", "path": "/machine/network/hostname", "value": "talos-cp-1"}]'
```

### Patch Files

Create a patch file:

```yaml
# custom-patch.yaml
machine:
  network:
    hostname: talos-cp-1
  install:
    disk: /dev/nvme0n1
```

Apply it during generation:

```bash
# Apply a strategic merge patch from a file
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch @custom-patch.yaml
```

### Separate Patches for Control Plane and Workers

```bash
# Different patches for different node types
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch-control-plane @cp-patch.yaml \
    --config-patch-worker @worker-patch.yaml
```

This is how you handle things like:

- Control plane nodes using one disk, workers using another
- Different network configurations per role
- Extra kubelet arguments for workers

## Setting the Kubernetes Version

```bash
# Specify the Kubernetes version
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --kubernetes-version 1.29.0
```

If not specified, gen config uses the Kubernetes version that corresponds to the talosctl version.

## Setting the Install Image

```bash
# Use a specific Talos installer image
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --install-image ghcr.io/siderolabs/installer:v1.7.0
```

This sets which Talos version will be installed on the nodes.

## Network Configuration

### DNS Settings

```bash
# Set custom DNS servers
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch '[{"op": "add", "path": "/machine/network/nameservers", "value": ["8.8.8.8", "8.8.4.4"]}]'
```

### Setting the Install Disk

```bash
# Specify which disk to install Talos on
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --install-disk /dev/sda
```

## Advanced Options

### Cluster Discovery

Talos supports automatic cluster member discovery:

```bash
# Enable cluster discovery with a specific registry
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch '[{"op": "add", "path": "/cluster/discovery/enabled", "value": true}]'
```

### CNI Configuration

By default, Talos uses Flannel for networking. To use a different CNI:

```bash
# Disable the default CNI (to install your own, like Cilium)
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch '[{"op": "add", "path": "/cluster/network/cni", "value": {"name": "none"}}]'
```

After bootstrapping, you would then install your preferred CNI:

```bash
# Install Cilium after cluster bootstrap
kubectl apply -f cilium-install.yaml
```

### Pod and Service CIDR

```bash
# Set custom pod and service CIDR ranges
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --config-patch '[{"op": "replace", "path": "/cluster/network/podSubnets", "value": ["10.244.0.0/16"]}]' \
    --config-patch '[{"op": "replace", "path": "/cluster/network/serviceSubnets", "value": ["10.96.0.0/12"]}]'
```

## Complete Example: Production Cluster

Here is a realistic example generating configuration for a production cluster:

```bash
# Generate secrets first
talosctl gen secrets -o secrets.yaml

# Generate configurations with production settings
talosctl gen config production-cluster https://api.prod.example.com:6443 \
    --with-secrets secrets.yaml \
    --kubernetes-version 1.29.0 \
    --install-image ghcr.io/siderolabs/installer:v1.7.0 \
    --install-disk /dev/nvme0n1 \
    --config-patch-control-plane @patches/controlplane.yaml \
    --config-patch-worker @patches/worker.yaml \
    --output ./generated/
```

## Storing and Managing Generated Configs

After generating configurations:

```bash
# Store secrets securely (encrypted, not in plain text repositories)
# Use tools like sops, vault, or sealed-secrets

# Store machine configs in version control
git add controlplane.yaml worker.yaml
git commit -m "Add Talos cluster configurations"

# Store talosconfig alongside your kubeconfig
mkdir -p ~/.talos
cp talosconfig ~/.talos/config
```

Never store `secrets.yaml` in a plain text repository. Use encryption or a secrets manager.

## Regenerating Configurations

If you need to regenerate configurations (for example, to change a setting):

```bash
# Regenerate using the same secrets to maintain compatibility
talosctl gen config my-cluster https://10.0.0.1:6443 \
    --with-secrets secrets.yaml \
    --config-patch @patches/all.yaml
```

Using the same secrets ensures the new configurations are compatible with the existing cluster. The TLS certificates will match, so you can apply the new configs to running nodes.

## Conclusion

The `talosctl gen config` command is where every Talos Linux cluster begins. Getting it right from the start saves significant time later. Use secrets bundles for reproducibility, apply patches for customization, and choose the right endpoint for high availability. Store your secrets securely, version control your configurations, and use the `--with-secrets` flag when regenerating. With these practices, your configuration generation process becomes repeatable, secure, and well-suited for production environments.
