# How to Customize Machine Configurations for Individual Talos Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Kubernetes, Node Customization, Infrastructure

Description: Learn how to create node-specific machine configurations in Talos Linux to handle hardware differences and role-specific requirements across your cluster.

---

In a Talos Linux cluster, all nodes of the same type (control plane or worker) start with the same base configuration. But real-world clusters rarely have identical nodes. One worker might have GPU hardware, another might have NVMe drives for storage workloads, and a third might sit in a different network zone. This guide covers the practical approaches to customizing machine configurations for individual nodes in Talos Linux.

## Why Individual Customization Is Needed

The default `talosctl gen config` command produces two configuration files: `controlplane.yaml` and `worker.yaml`. Every control plane node gets the same config, and every worker gets the same config. This works for simple clusters, but production environments often need per-node differences:

- Different network interface names or configurations
- Node-specific disk configurations for heterogeneous storage
- Different kernel parameters for specialized hardware
- Unique hostname assignments
- Labels and taints for node scheduling
- Separate configurations for nodes in different racks or availability zones

## Approach 1: Config Patches at Apply Time

The simplest way to customize individual nodes is to use config patches when applying configurations. Start with a base config and layer on node-specific patches:

```bash
# Generate base configurations
talosctl gen config my-cluster https://10.0.1.100:6443

# Apply base config with a node-specific patch to worker-1
talosctl apply-config --nodes 10.0.1.21 \
    --file worker.yaml \
    --patch @patches/worker-1.yaml

# Apply base config with a different patch to worker-2
talosctl apply-config --nodes 10.0.1.22 \
    --file worker.yaml \
    --patch @patches/worker-2.yaml
```

A node-specific patch might set the hostname and network configuration:

```yaml
# patches/worker-1.yaml
machine:
  network:
    hostname: worker-1
    interfaces:
      - interface: enp3s0
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
```

```yaml
# patches/worker-2.yaml
machine:
  network:
    hostname: worker-2
    interfaces:
      - interface: eno1  # Different interface name on this hardware
        dhcp: false
        addresses:
          - 10.0.1.22/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
```

## Approach 2: Generating Complete Per-Node Configs

For clusters where many settings differ between nodes, generating separate complete configurations can be cleaner:

```bash
# Generate secrets once
talosctl gen secrets -o secrets.yaml

# Generate config for worker-1 (GPU node)
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --from-secrets secrets.yaml \
    --config-patch @patches/common.yaml \
    --config-patch-worker @patches/worker-gpu.yaml \
    --output-types worker \
    -o worker-gpu.yaml

# Generate config for worker-2 (storage node)
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --from-secrets secrets.yaml \
    --config-patch @patches/common.yaml \
    --config-patch-worker @patches/worker-storage.yaml \
    --output-types worker \
    -o worker-storage.yaml
```

The common patch contains settings shared by all nodes:

```yaml
# patches/common.yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

The GPU worker patch adds GPU-specific configuration:

```yaml
# patches/worker-gpu.yaml
machine:
  network:
    hostname: worker-gpu-1
  kubelet:
    extraArgs:
      feature-gates: DevicePlugins=true
    nodeLabels:
      node-role.kubernetes.io/gpu: "true"
      nvidia.com/gpu.present: "true"
  kernel:
    modules:
      - name: nvidia
      - name: nvidia_uvm
```

The storage worker patch configures disks and storage-specific settings:

```yaml
# patches/worker-storage.yaml
machine:
  network:
    hostname: worker-storage-1
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.25/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
      - interface: eth1
        addresses:
          - 192.168.100.25/24
        mtu: 9000
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/storage: "true"
  disks:
    - device: /dev/nvme0n1
      partitions:
        - mountpoint: /var/mnt/storage
```

## Approach 3: Using Machine Configuration Templates

For large clusters, you can create a template system using shell scripts or a templating tool:

```bash
#!/bin/bash
# generate-node-configs.sh
# Generate per-node configurations from a node inventory

CLUSTER_NAME="my-cluster"
ENDPOINT="https://10.0.1.100:6443"
SECRETS="secrets.yaml"

# Node inventory
declare -A NODES
NODES["cp-1"]="10.0.1.10:controlplane:eth0"
NODES["cp-2"]="10.0.1.11:controlplane:eth0"
NODES["cp-3"]="10.0.1.12:controlplane:eth0"
NODES["worker-1"]="10.0.1.21:worker:enp3s0"
NODES["worker-2"]="10.0.1.22:worker:eno1"
NODES["worker-gpu"]="10.0.1.23:worker:eth0"

for node_name in "${!NODES[@]}"; do
    IFS=':' read -r ip role interface <<< "${NODES[$node_name]}"

    # Create a node-specific patch
    cat > "/tmp/patch-${node_name}.yaml" <<EOF
machine:
  network:
    hostname: ${node_name}
    interfaces:
      - interface: ${interface}
        dhcp: false
        addresses:
          - ${ip}/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
EOF

    # Generate the config
    talosctl gen config "$CLUSTER_NAME" "$ENDPOINT" \
        --from-secrets "$SECRETS" \
        --config-patch @"/tmp/patch-${node_name}.yaml" \
        --output-types "$role" \
        -o "configs/${node_name}.yaml"

    echo "Generated config for $node_name ($role at $ip)"
done
```

## Organizing Configuration Files

For maintainability, organize your configuration files in a clear directory structure:

```text
talos-config/
  secrets.enc.yaml           # Encrypted secrets
  patches/
    common/
      network.yaml           # Common network settings
      kubelet.yaml            # Common kubelet settings
    controlplane/
      etcd.yaml              # etcd-specific settings
    workers/
      common.yaml            # Shared worker settings
      gpu.yaml               # GPU worker overrides
      storage.yaml           # Storage worker overrides
    nodes/
      cp-1.yaml              # Per-node overrides
      cp-2.yaml
      worker-1.yaml
      worker-gpu-1.yaml
  configs/                   # Generated configs (gitignored)
    cp-1.yaml
    worker-1.yaml
```

This structure lets you layer patches from general to specific. A node's final configuration is the base config plus common patches, role patches, and node-specific patches.

## Setting Node Labels and Taints

One of the most common per-node customizations is setting Kubernetes labels and taints. These control pod scheduling:

```yaml
# patches/nodes/worker-gpu-1.yaml
machine:
  kubelet:
    nodeLabels:
      node-role.kubernetes.io/gpu: "true"
      gpu-type: nvidia-a100
      topology.kubernetes.io/zone: zone-a
    nodeTaints:
      nvidia.com/gpu:NoSchedule
```

Labels and taints can be changed without rebooting the node:

```bash
# Apply updated labels to a running node
talosctl apply-config --nodes 10.0.1.23 \
    --patch @patches/nodes/worker-gpu-1.yaml \
    --mode no-reboot
```

## Handling Hardware Differences

Different hardware often means different device names. Here is how to handle common hardware variations:

```yaml
# Node with standard SATA drives
# patches/nodes/worker-sata.yaml
machine:
  install:
    disk: /dev/sda
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
```

```yaml
# Node with NVMe drives
# patches/nodes/worker-nvme.yaml
machine:
  install:
    disk: /dev/nvme0n1
  disks:
    - device: /dev/nvme1n1
      partitions:
        - mountpoint: /var/mnt/data
```

## Validating Per-Node Configurations

Before applying customized configurations, validate them:

```bash
# Validate a generated configuration
talosctl validate --config configs/worker-gpu-1.yaml --mode metal

# For cloud deployments
talosctl validate --config configs/worker-1.yaml --mode cloud
```

Always validate after generating, especially when layering multiple patches, as conflicting settings can produce invalid configurations.

## Tracking Configuration Drift

Over time, nodes may drift from their intended configuration if ad-hoc changes are applied. You can check the current configuration of a node against its expected configuration:

```bash
# Get the current config from a running node
talosctl get machineconfig --nodes 10.0.1.21 -o yaml > current-worker-1.yaml

# Compare with the expected config
diff expected-worker-1.yaml current-worker-1.yaml
```

This helps you catch unintended changes and maintain consistency across your infrastructure.

## Applying Changes Across the Fleet

When you need to update a setting across all nodes (like a kubelet version or a network policy), update the common patch and regenerate all configurations:

```bash
# Update the common patch
# Then regenerate and apply to all nodes
for node in cp-1 cp-2 cp-3 worker-1 worker-2 worker-gpu; do
    talosctl apply-config --nodes "${NODE_IPS[$node]}" \
        --file "configs/${node}.yaml"
done
```

This pattern keeps your deployment process consistent and repeatable, which is especially valuable when managing dozens or hundreds of nodes.

## Conclusion

Customizing machine configurations for individual Talos Linux nodes is a necessary part of running production clusters with diverse hardware or requirements. Whether you use simple patches at apply time, generate complete per-node configs, or build a templating system, the key is to maintain a clear hierarchy from base configuration to node-specific overrides. Keep your configuration files organized, validate before applying, and track drift over time. This approach scales well from small clusters to large fleets while keeping the management overhead reasonable.
