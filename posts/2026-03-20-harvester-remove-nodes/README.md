# How to Remove Nodes from Harvester Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Cluster, Maintenance

Description: Learn how to safely remove nodes from a Harvester cluster for decommissioning, hardware replacement, or cluster downsizing.

## Introduction

Removing a node from a Harvester cluster requires careful preparation to ensure VMs are migrated or shut down as needed, storage replicas are evacuated to remaining nodes, and the Harvester and Kubernetes cluster state is updated correctly. Improper node removal can result in data loss or cluster instability. This guide covers the complete safe node removal process.

## Important Considerations

- **Minimum cluster size**: A 3-management-node cluster is the minimum HA control plane. If your cluster has three control plane nodes and no worker nodes, add a new node before removing a control plane node.
- **etcd quorum**: Harvester uses etcd for cluster state. You must maintain an odd number of etcd members (for example, 3, 5, or 7). Never remove a node that would break quorum.
- **Storage replicas**: The default `harvester-longhorn` StorageClass uses 3 replicas. Removing a node with replicas triggers rebuilding on the remaining schedulable nodes, and volumes can remain degraded if the cluster lacks capacity.

## Pre-Removal Checklist

```bash
# 1. Review cluster roles and current size
kubectl get nodes

# If the cluster has three control-plane nodes and no worker nodes,
# add a new node before removing a control-plane node.

# 2. Check VMs running on the target node
TARGET_NODE="harvester-node-04"
kubectl get vmi -A \
    -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,NODE:.status.nodeName,PHASE:.status.phase' \
    | grep "${TARGET_NODE}" || true

# 3. Check Longhorn volume health
kubectl get volumes.longhorn.io -n longhorn-system \
    -o custom-columns='NAME:.metadata.name,ROBUSTNESS:.status.robustness'

# 4. Check Longhorn replicas on the target node
kubectl get replicas.longhorn.io -n longhorn-system \
    -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeID,STATE:.status.currentState' \
    | grep "${TARGET_NODE}" || true

# Ensure remaining nodes have enough compute and storage capacity
# to accept the workload and rebuilt replicas
```

## Step 1: Enable Maintenance Mode

Maintenance mode evacuates workloads from the node and stops new scheduling:

### Via the UI

1. Navigate to **Hosts** in Harvester
2. Find the node to remove
3. Click the **⋮** menu → **Enable Maintenance Mode**
4. Harvester will evacuate live-migratable VMs from the node. Manually stop any non-migratable VMs if needed.
5. Wait for the node status to show **Maintenance**

Harvester documents enabling Maintenance Mode from the UI. If your cluster has only two control plane nodes and Maintenance Mode cannot be enabled, use the manual drain flow in Step 2.

## Step 2: Drain the Node

If Maintenance Mode cannot be enabled, use the following manual drain command after completing Step 3:

```bash
TARGET_NODE="harvester-node-04"

# Drain the node when Maintenance Mode cannot be used
kubectl drain ${TARGET_NODE} \
    --force \
    --ignore-daemonsets \
    --delete-local-data \
    --pod-selector='app!=csi-attacher,app!=csi-provisioner'

# Verify only expected system pods remain on the node
kubectl get pods -A \
    --field-selector spec.nodeName=${TARGET_NODE}
```

## Step 3: Evacuate Longhorn Replicas

Before removing the node, evacuate its Longhorn replicas to maintain data redundancy:

1. Open the embedded **Longhorn UI**
2. Go to **Node**
3. Select the node to remove, then choose **Edit node and disks**
4. Set **Node Scheduling** to **Disable**
5. Set **Evict Requested** to **True**
6. Save the changes and wait until the node's **Replicas** count reaches `0`

If the remaining nodes cannot accept the replicas, some volumes will stay `Degraded` until you add more capacity.

## Step 4: Remove the Node from the Cluster

### Via the Harvester UI

Complete Step 5 on the target node before deleting the host from Harvester:

1. Navigate to **Hosts**
2. Find the node to remove
3. Click the **⋮** menu → **Delete**
4. Confirm the deletion

## Step 5: Clean Up the Node

Harvester documents performing this cleanup before deleting the host from the UI:

```bash
# SSH into the node as root
ssh root@192.168.1.14

# Remove RKE2 services and cluster data
sudo /opt/rke2/bin/rke2-uninstall.sh

# Shut down the node before deleting it from the Harvester UI
sudo shutdown now
```

## Step 6: Post-Removal Verification

```bash
# Verify the node is gone
kubectl get nodes

# Check API server readiness; look for "[+]etcd ok"
kubectl get --raw='/readyz?verbose'

# Verify Longhorn volume robustness
kubectl get volumes.longhorn.io -n longhorn-system \
    -o custom-columns='NAME:.metadata.name,ROBUSTNESS:.status.robustness'

# Check remaining replicas
kubectl get replicas.longhorn.io -n longhorn-system \
    -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeID,STATE:.status.currentState'

# Verify all VMs are running on remaining nodes
kubectl get vmi -A \
    -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,NODE:.status.nodeName,PHASE:.status.phase'
```

## Conclusion

Safely removing a node from a Harvester cluster requires a systematic approach: evacuate Longhorn replicas, migrate or stop VMs, drain workloads when needed, then remove the node. Rushing any of these steps can result in VM downtime or data loss. The key safeguard is ensuring Longhorn replica evacuation completes before node deletion so volumes can rebuild toward their configured replica count on the remaining nodes when enough capacity is available.
