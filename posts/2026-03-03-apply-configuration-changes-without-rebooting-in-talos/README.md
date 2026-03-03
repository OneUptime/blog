# How to Apply Configuration Changes Without Rebooting in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Configuration, No Reboot, Operations, Kubernetes

Description: Learn which Talos Linux configuration changes can be applied without rebooting and how to use the no-reboot mode for minimal disruption operations.

---

One of the common concerns with Talos Linux is that configuration changes might require a reboot, which disrupts workloads. The good news is that many configuration changes can be applied without any reboot at all. Talos Linux supports a `no-reboot` mode that applies changes on the fly when possible and rejects changes that would require a reboot. This guide explains which changes work without rebooting, how to use the no-reboot mode, and how to plan your changes to minimize disruption.

## Understanding Apply Modes

When you apply a configuration change to a Talos node, you can specify one of several modes:

```bash
# Auto mode (default) - reboots if the change requires it
talosctl apply-config --nodes 10.0.1.10 --patch @change.yaml --mode auto

# No-reboot mode - fails if the change requires a reboot
talosctl apply-config --nodes 10.0.1.10 --patch @change.yaml --mode no-reboot

# Reboot mode - always reboots, even if not necessary
talosctl apply-config --nodes 10.0.1.10 --patch @change.yaml --mode reboot

# Staged mode - saves config for next reboot
talosctl apply-config --nodes 10.0.1.10 --patch @change.yaml --mode staged
```

The `no-reboot` mode is what you want for live changes. If the change can be applied without rebooting, it is applied immediately. If the change requires a reboot, the command fails with an error telling you why.

## Changes That Do NOT Require a Reboot

These configuration changes can be applied with `--mode no-reboot`:

### Kubelet Labels and Taints

```yaml
# Adding or changing kubelet labels - no reboot needed
machine:
  kubelet:
    nodeLabels:
      new-label: "value"
      environment: production
    nodeTaints:
      special-hardware: "true:NoSchedule"
```

```bash
talosctl apply-config --nodes 10.0.1.10 --patch @labels.yaml --mode no-reboot
```

### Kubelet Extra Arguments

```yaml
# Changing kubelet arguments - triggers kubelet restart, not node reboot
machine:
  kubelet:
    extraArgs:
      max-pods: "200"
      event-qps: "50"
```

Note that while the node does not reboot, the kubelet service restarts. Pods continue running during a kubelet restart, but there may be a brief period where the node appears NotReady.

### NTP Configuration

```yaml
# Changing time servers - no reboot needed
machine:
  time:
    servers:
      - time.cloudflare.com
      - time.google.com
```

### Container Registry Configuration

```yaml
# Adding or changing registry mirrors - no reboot needed
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://new-mirror.internal:5000
    config:
      new-mirror.internal:5000:
        tls:
          insecureSkipVerify: false
```

### Certificate SANs

```yaml
# Adding certificate SANs - triggers certificate regeneration, no reboot
machine:
  certSANs:
    - new-lb.example.com
    - 10.0.2.100
```

### Cluster API Server Settings

```yaml
# Some API server changes can be applied live
cluster:
  apiServer:
    certSANs:
      - new-endpoint.example.com
    extraArgs:
      audit-log-maxsize: "200"
```

### etcd Configuration Changes

```yaml
# etcd advertised subnets - no reboot but etcd restarts
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

### Network DNS and Host Entries

```yaml
# Changing nameservers - no reboot needed
machine:
  network:
    nameservers:
      - 1.1.1.1
      - 8.8.8.8
    extraHostEntries:
      - ip: 10.0.1.100
        aliases:
          - api.cluster.local
```

## Changes That DO Require a Reboot

These changes need a reboot because they affect low-level system configuration:

### Disk and Partition Changes

```yaml
# Changing install disk - requires reboot
machine:
  install:
    disk: /dev/nvme0n1
```

### Kernel Parameters

```yaml
# Kernel arguments require a reboot to take effect
machine:
  install:
    extraKernelArgs:
      - net.core.somaxconn=65535
```

### System Extensions

```yaml
# Installing new extensions requires a reboot
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

### Kernel Modules

```yaml
# Loading new kernel modules requires a reboot
machine:
  kernel:
    modules:
      - name: br_netfilter
```

### Disk Encryption

```yaml
# Changing disk encryption requires a reboot
machine:
  systemDiskEncryption:
    state:
      provider: luks2
```

### Network Interface Changes (Some)

Major network changes like adding bonds or changing the primary interface typically require a reboot. Minor changes like adjusting MTU or adding secondary addresses may work without one.

### Machine Type Changes

You cannot change a node's role (control plane to worker or vice versa) without a complete reinstallation.

## A Practical No-Reboot Workflow

Here is a complete workflow for applying non-disruptive changes:

```bash
# Step 1: Create your patch
cat > labels-patch.yaml <<'EOF'
machine:
  kubelet:
    nodeLabels:
      cost-center: engineering
      team: platform
EOF

# Step 2: Preview the change
talosctl machineconfig patch <(talosctl get machineconfig --nodes 10.0.1.10 -o yaml) \
    --patch @labels-patch.yaml \
    -o /tmp/preview.yaml

# Step 3: Validate
talosctl validate --config /tmp/preview.yaml --mode metal

# Step 4: Apply without reboot
talosctl apply-config --nodes 10.0.1.10 --patch @labels-patch.yaml --mode no-reboot

# Step 5: Verify the change
kubectl get node <node-name> --show-labels | grep cost-center
```

## Rolling Changes Across the Cluster

For changes that do not require rebooting, you can apply them across the cluster quickly:

```bash
#!/bin/bash
# apply-no-reboot.sh
# Apply a no-reboot change to all nodes in sequence

PATCH_FILE=$1
NODES=("10.0.1.10" "10.0.1.11" "10.0.1.12" "10.0.1.21" "10.0.1.22")

for node in "${NODES[@]}"; do
    echo "Applying to $node..."
    if talosctl apply-config --nodes "$node" --patch "@$PATCH_FILE" --mode no-reboot; then
        echo "  Success"
    else
        echo "  FAILED - this change may require a reboot"
        echo "  Stopping to avoid partial rollout"
        exit 1
    fi
done

echo "All nodes updated successfully"
```

## Handling the "Reboot Required" Error

When you try to apply a change that requires a reboot using `--mode no-reboot`, you get an error:

```
error applying configuration: 1 error occurred:
    * config changes require a reboot: machine.install.disk changed
```

This is the expected behavior. You have several options:

1. Use `--mode auto` to allow the reboot
2. Use `--mode staged` to stage the change for the next maintenance window
3. Split the change into reboot-required and non-reboot parts

```bash
# Apply non-reboot changes immediately
talosctl apply-config --nodes 10.0.1.10 \
    --patch @non-reboot-changes.yaml --mode no-reboot

# Stage reboot-required changes for later
talosctl apply-config --nodes 10.0.1.10 \
    --patch @reboot-changes.yaml --mode staged
```

## Combining Changes to Minimize Reboots

If you have a mix of changes, some requiring reboots and some not, batch all changes together so you only reboot once:

```yaml
# combined-patch.yaml
# These changes don't need a reboot:
machine:
  kubelet:
    nodeLabels:
      new-label: "true"
  time:
    servers:
      - time.cloudflare.com

# These changes do need a reboot:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
  kernel:
    modules:
      - name: iscsi_tcp
```

```bash
# Apply everything at once with auto mode (one reboot)
talosctl apply-config --nodes 10.0.1.10 --patch @combined-patch.yaml --mode auto
```

This is better than applying the non-reboot changes first and then the reboot changes, which would result in a service restart plus a reboot instead of just a reboot.

## Monitoring After No-Reboot Changes

After applying changes without rebooting, verify that the affected services are healthy:

```bash
# Check overall node health
talosctl health --nodes 10.0.1.10

# Check specific services
talosctl service kubelet --nodes 10.0.1.10
talosctl service etcd --nodes 10.0.1.10

# Check from Kubernetes side
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

## Sysctl Changes Without Reboot

Sysctls are a special case. Changes to `machine.sysctls` can often be applied without a reboot:

```yaml
machine:
  sysctls:
    net.core.somaxconn: "65535"
    vm.max_map_count: "262144"
    fs.inotify.max_user_watches: "524288"
```

```bash
talosctl apply-config --nodes 10.0.1.10 --patch @sysctl-patch.yaml --mode no-reboot
```

However, `machine.install.extraKernelArgs` does require a reboot because those are boot-time parameters that cannot be changed at runtime. If the sysctl you need is available through both `machine.sysctls` (runtime) and `machine.install.extraKernelArgs` (boot), prefer the `machine.sysctls` approach to avoid reboots.

## Conclusion

The ability to apply configuration changes without rebooting makes Talos Linux much more practical for production use. Most day-to-day changes like labels, taints, kubelet parameters, NTP servers, and registry mirrors can be applied live with `--mode no-reboot`. Changes that affect the boot process, disk layout, kernel modules, or system extensions still require a reboot. By understanding which category your changes fall into, you can plan your operations to minimize disruption. Use the no-reboot mode for routine changes, staged mode for changes that can wait for a maintenance window, and auto mode when you are prepared for a reboot. This keeps your cluster available while still giving you the flexibility to update configurations as needed.
