# How to Perform Host OS Updates on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OS Updates, Kubernetes, System Administration, Security

Description: A complete guide to performing host OS updates on Talos Linux using its immutable image-based upgrade system for safe and predictable patching.

---

Updating the host operating system is one of the most fundamental maintenance tasks for any server. On traditional Linux systems, this involves package managers, dependency resolution, and a lot of hoping that nothing breaks. Talos Linux takes a radically different approach. The entire operating system is a single immutable image, and updates replace the whole image at once. This makes updates more predictable, but you still need to understand the process to do it safely.

## How Talos OS Updates Differ from Traditional Linux

On a typical Ubuntu or CentOS server, you update individual packages. The kernel might be version X, systemd version Y, and your container runtime version Z, and they all update independently. This flexibility comes with complexity - you can end up with version mismatches, broken dependencies, or half-applied updates.

Talos Linux eliminates all of this. The OS is built as a single squashfs image that contains everything: the kernel, init system, container runtime, and all system components. When you update, you replace the entire image. Either the update succeeds completely or it fails completely. There is no partial state.

```bash
# Check the current Talos version (which IS the OS version)
talosctl version -n <node-ip>

# Example output:
# Tag:         v1.9.0
# SHA:         abc123...
# Built:       2026-01-15T00:00:00Z
```

## Checking for Available Updates

Before updating, check what versions are available:

```bash
# Check the current version on all nodes
for node in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
    echo -n "Node $node: "
    talosctl version -n "$node" --short 2>/dev/null | grep Tag
done
```

Check the Talos releases page for new versions. You can also automate this check:

```bash
# Get the latest stable release
curl -s https://api.github.com/repos/siderolabs/talos/releases/latest | \
    jq -r '.tag_name'
```

Review the release notes carefully. Pay attention to:
- Breaking changes
- Known issues
- Minimum Kubernetes version requirements
- Any required pre-upgrade steps

## Planning the Update

OS updates should follow a structured plan:

1. Read the release notes for the target version
2. Test the update in a non-production environment
3. Back up etcd and critical configurations
4. Update control plane nodes one at a time
5. Update worker nodes (can be parallelized)
6. Verify cluster health after each node

```bash
# Step 1: Create a pre-update backup
talosctl etcd snapshot /tmp/etcd-pre-update-$(date +%Y%m%d).db \
    -n <control-plane-ip>

# Step 2: Verify cluster is healthy before starting
talosctl health -n <control-plane-ip>
kubectl get nodes
```

## Performing the Update on Control Plane Nodes

Control plane nodes must be updated one at a time to maintain cluster availability. Never update more than one control plane node simultaneously.

```bash
# Update the first control plane node
CP_NODE_IP="10.0.0.1"
CP_NODE_NAME="control-plane-1"
TARGET_IMAGE="ghcr.io/siderolabs/installer:v1.9.1"

# Drain the node
kubectl drain "$CP_NODE_NAME" \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=300s

# Perform the upgrade
talosctl upgrade \
    --image "$TARGET_IMAGE" \
    -n "$CP_NODE_IP" \
    --preserve

# Wait for the node to come back
talosctl health -n "$CP_NODE_IP" --wait-timeout 10m

# Verify the new version
talosctl version -n "$CP_NODE_IP"

# Verify etcd health with the new version
talosctl etcd status -n "$CP_NODE_IP"

# Uncordon the node
kubectl uncordon "$CP_NODE_NAME"
```

The `--preserve` flag keeps the node's ephemeral partition intact during the upgrade. This is usually what you want unless you specifically need a clean slate.

Wait at least 5 minutes after the first control plane node is back before proceeding to the next one. Monitor for any issues:

```bash
# Watch for problems after upgrading the first CP node
kubectl get events --sort-by='.lastTimestamp' -A | tail -20
kubectl get pods -n kube-system
```

## Performing the Update on Worker Nodes

Worker nodes are simpler to update because they do not affect cluster control plane availability. You can update them in parallel if your cluster has enough spare capacity.

```bash
#!/bin/bash
# update-workers.sh

TARGET_IMAGE="ghcr.io/siderolabs/installer:v1.9.1"
MAX_PARALLEL=3

WORKER_IPS=$(kubectl get nodes -l '!node-role.kubernetes.io/control-plane' \
    -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

update_worker() {
    local ip=$1
    local name
    name=$(kubectl get nodes -o wide --no-headers | grep "$ip" | awk '{print $1}')

    echo "Updating worker $name ($ip)..."

    kubectl drain "$name" --ignore-daemonsets --delete-emptydir-data --timeout=300s
    talosctl upgrade --image "$TARGET_IMAGE" -n "$ip" --preserve

    # Wait for the node to return
    sleep 30
    kubectl wait --for=condition=Ready "node/$name" --timeout=600s
    kubectl uncordon "$name"

    echo "Worker $name ($ip) updated successfully"
}

# Update workers in parallel batches
PIDS=()
COUNT=0

for ip in $WORKER_IPS; do
    update_worker "$ip" &
    PIDS+=($!)
    COUNT=$((COUNT + 1))

    if [ "$COUNT" -ge "$MAX_PARALLEL" ]; then
        # Wait for the current batch to complete
        for pid in "${PIDS[@]}"; do
            wait "$pid"
        done
        PIDS=()
        COUNT=0
    fi
done

# Wait for remaining nodes
for pid in "${PIDS[@]}"; do
    wait "$pid"
done

echo "All workers updated"
```

## Handling Configuration Patches During Updates

Sometimes an OS update requires configuration changes. Talos lets you apply configuration patches as part of the upgrade process:

```bash
# Apply a config patch along with the upgrade
talosctl upgrade \
    --image ghcr.io/siderolabs/installer:v1.9.1 \
    -n <node-ip> \
    --config-patch '[{"op": "add", "path": "/machine/sysctls/net.core.somaxconn", "value": "65535"}]'
```

Or use a patch file:

```yaml
# upgrade-patch.yaml
machine:
  sysctls:
    net.core.somaxconn: "65535"
    vm.max_map_count: "262144"
```

```bash
talosctl upgrade \
    --image ghcr.io/siderolabs/installer:v1.9.1 \
    -n <node-ip> \
    --config-patch @upgrade-patch.yaml
```

## Verifying the Update

After updating all nodes, run a thorough verification:

```bash
# Check all nodes are running the new version
talosctl version -n <any-node-ip>

# Verify Kubernetes components are healthy
kubectl get componentstatuses 2>/dev/null
kubectl get pods -n kube-system

# Run a quick workload test
kubectl run test-pod --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/test-pod --timeout=60s
kubectl delete pod test-pod

# Check that all DaemonSets are fully rolled out
kubectl get daemonsets -A

# Verify storage is working
kubectl get pv
kubectl get pvc -A
```

## Rolling Back a Failed Update

If something goes wrong, Talos keeps the previous image on disk and you can roll back:

```bash
# Roll back to the previous OS version
talosctl rollback -n <node-ip>

# Wait for the node to reboot with the old version
talosctl health -n <node-ip> --wait-timeout 10m

# Verify the rollback
talosctl version -n <node-ip>
```

Rollback is fast because it just switches which image the bootloader loads. No downloads needed.

## Handling Edge Cases

**Nodes with local storage**: If pods use local persistent volumes, draining the node will not move those pods. You need to handle data migration separately before updating the node.

**Custom kernel modules**: If you load custom kernel modules through Talos extensions, verify that the extensions are compatible with the new OS version before upgrading.

**Network configuration changes**: Some OS updates may include changes to the network stack. Test network connectivity thoroughly after updating the first node.

```bash
# Test network connectivity after update
talosctl ping 8.8.8.8 -n <updated-node-ip>

# Check that DNS works
kubectl run dns-test --image=busybox --restart=Never -- nslookup kubernetes.default
kubectl logs dns-test
kubectl delete pod dns-test
```

## Conclusion

Host OS updates on Talos Linux are fundamentally simpler than on traditional distributions because you are replacing a single immutable image rather than updating hundreds of individual packages. The process is predictable and reversible. The key to success is following the correct order (control plane first, one at a time), verifying health at each step, and having a rollback plan ready. With proper automation, OS updates can become a routine, low-risk operation that you run on a regular schedule.
