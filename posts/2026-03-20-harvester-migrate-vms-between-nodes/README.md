# How to Migrate VMs Between Nodes in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Migration, KubeVirt

Description: Learn how to migrate virtual machines between nodes in Harvester for maintenance, load balancing, and fault tolerance.

## Introduction

VM migration in Harvester allows you to move running virtual machines between cluster nodes without downtime. For stopped virtual machines, placement is decided the next time they are started. This is essential for node maintenance, load rebalancing, and improving VM placement for performance. Harvester supports live migration for migratable VMs, and maintenance workflows can shut down and restart non-migratable VMs when needed.

## Migration Types

| Type | VM State | Downtime | Use Case |
|---|---|---|---|
| Live Migration | Running | None | Node maintenance, load balancing |
| Shutdown and Restart | Stopped / Restarted | Yes (planned) | Non-migratable VMs, forced relocation |
| Maintenance Mode Eviction | Running | None for live-migratable VMs | Node drain for maintenance |

## Prerequisites

- A multi-node Harvester cluster (minimum 2 nodes)
- Sufficient resources on the target node (CPU, RAM)
- The VM must be live-migratable: volumes with `CD-ROM`, `Container Disk`, or `ReadWriteOnce` access, and node selectors that bind to a single node, prevent live migration
- For live migration: Network bandwidth between nodes for memory transfer

## Step 1: Check Current VM Placement

```bash
# See which node each VM is running on

kubectl get vmi -n default \
    -o custom-columns=\
'NAME:.metadata.name,NODE:.status.nodeName,PHASE:.status.phase'

# Example output:
# NAME            NODE               PHASE
# ubuntu-web-01   harvester-node-01  Running
# database-01     harvester-node-02  Running
# app-server-01   harvester-node-01  Running
```

## Step 2: Live Migrate a VM

### Via the UI

1. Navigate to **Virtual Machines**
2. Find the VM you want to migrate
3. Click the **⋮** menu → **Migrate**
4. Select the target node
5. Click **Apply**

### Via kubectl

```yaml
# vm-migration.yaml
# Trigger a live migration for a VM

apiVersion: kubevirt.io/v1
kind: VirtualMachineInstanceMigration
metadata:
  name: migrate-ubuntu-web-01
  namespace: default
spec:
  # Name of the VMI (VirtualMachineInstance) to migrate
  vmiName: ubuntu-web-01
```

```bash
kubectl apply -f vm-migration.yaml

# Watch the migration progress
kubectl get virtualmachineinstancemigration migrate-ubuntu-web-01 -n default -w

# Migration phases:
# Pending -> Scheduling -> Scheduled -> PreparingTarget -> TargetReady
# -> Running -> Succeeded (or Failed)

# Check which node the VM is now on
kubectl get vmi ubuntu-web-01 -n default \
    -o jsonpath='{.status.nodeName}'
```

### Migration Status Details

```bash
# Get detailed migration status
kubectl describe virtualmachineinstancemigration migrate-ubuntu-web-01 -n default

# Check the VMI migration state
kubectl get vmi ubuntu-web-01 -n default -o json | \
    jq '.status.migrationState'

# View recent migration-related events
kubectl get events -n default --sort-by='.lastTimestamp' | \
    grep -i migrat
```

## Step 3: Migrate to a Specific Node

To constrain a one-off migration to a specific node, use `virtctl` with an added node selector:

```bash
# Trigger a one-off migration to the node identified by its hostname label
virtctl migrate ubuntu-web-01 \
    --addedNodeSelector kubernetes.io/hostname=harvester-node-03

# Verify the VM is now running on the requested node
kubectl get vmi ubuntu-web-01 -n default \
    -o jsonpath='{.status.nodeName}'
```

## Step 4: Drain a Node for Maintenance

For routine maintenance, Harvester's documented approach is **Maintenance Mode**. It uses batch migration to move live-migratable VMs off the node and lets you handle non-migratable VMs separately.

```bash
# Optional: cordon the node to prevent new scheduling
kubectl cordon harvester-node-01

# Watch VMs moving off the node while Maintenance Mode is active
watch kubectl get vmi -n default \
    -o custom-columns='NAME:.metadata.name,NODE:.status.nodeName'
```

In the UI, go to **Hosts**, find `harvester-node-01`, and select **⋮** → **Enable Maintenance Mode**.

If you are in the documented two-control-plane node-removal case where Maintenance Mode is unavailable, Harvester documents the following manual drain command:

```bash
kubectl drain harvester-node-01 \
    --force \
    --ignore-daemonsets \
    --delete-local-data \
    --pod-selector='app!=csi-attacher,app!=csi-provisioner'
```

```bash
# After maintenance, disable Maintenance Mode and uncordon the node
kubectl uncordon harvester-node-01

# Verify the node is ready to accept workloads
kubectl get node harvester-node-01
```

## Step 5: Bulk Migrate VMs Off a Node with a Script

```bash
#!/bin/bash
# bulk-migrate.sh - Migrate all live-migratable VMIs off one node

SOURCE_NODE="harvester-node-01"
NAMESPACE="default"

echo "Finding VMs on ${SOURCE_NODE}..."

# Get all VMIs on the source node
VMs=$(kubectl get vmi -n ${NAMESPACE} \
    -o jsonpath="{.items[?(@.status.nodeName==\"${SOURCE_NODE}\")].metadata.name}")

if [ -z "$VMs" ]; then
    echo "No VMs found on ${SOURCE_NODE}"
    exit 0
fi

echo "VMs to migrate: ${VMs}"

# Trigger migration for each VM
for VM in $VMs; do
    echo "Migrating ${VM}..."
    kubectl apply -f - <<EOF
apiVersion: kubevirt.io/v1
kind: VirtualMachineInstanceMigration
metadata:
  name: mig-${VM}-$(date +%s)
  namespace: ${NAMESPACE}
spec:
  vmiName: ${VM}
EOF
    # Small delay to avoid overwhelming the cluster
    sleep 5
done

echo "All migrations initiated. Monitoring..."

# Wait for all VMs to leave the source node
while kubectl get vmi -n ${NAMESPACE} \
    -o jsonpath="{.items[?(@.status.nodeName==\"${SOURCE_NODE}\")].metadata.name}" \
    | grep -q "."; do
    echo "VMs still on ${SOURCE_NODE}, waiting..."
    sleep 10
done

echo "All VMs migrated off ${SOURCE_NODE}"
```

## Troubleshooting Migration Issues

```bash
# Migration stuck in Pending:
# Check resource availability on target nodes
kubectl describe node harvester-node-02 | grep -A 10 "Conditions:"
kubectl describe node harvester-node-02 | grep -A 20 "Allocated resources"

# Migration failed with network error:
# Check that migration network is reachable between nodes
kubectl get kubevirt -n harvester-system -o yaml | \
    grep -A 10 "migrations:"

# Check the virt-launcher pod logs
kubectl get pods -n default | grep virt-launcher
kubectl logs -n default \
    $(kubectl get pods -n default -l "vm.kubevirt.io/name=ubuntu-web-01" -o name) \
    --all-containers=true
```

## Conclusion

VM migration in Harvester is a powerful capability that enables flexible workload placement and low-downtime maintenance for live-migratable VMs. Live migration allows VMs to continue serving traffic while moving between nodes - an essential feature for production environments with strict availability requirements. By combining Maintenance Mode, node cordoning, and targeted migration policies, you can maintain your cluster infrastructure with minimal disruption. Always verify sufficient resources and migration eligibility on the destination nodes before initiating large-scale migrations.
