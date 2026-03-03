# How to Remove a Worker Node from a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Worker Node, Node Removal, Kubernetes, Cluster Management

Description: A step-by-step guide to safely removing a worker node from a Talos Linux Kubernetes cluster while preserving workload availability and data integrity.

---

Removing a worker node from a Kubernetes cluster is a routine operation. You might need to do it when decommissioning hardware, replacing a faulty server, downsizing during low-demand periods, or rotating nodes as part of a maintenance schedule. The key to doing it safely is ensuring your workloads are properly migrated to other nodes before the node goes offline. Talos Linux makes the actual node decommissioning clean through its reset functionality, but the Kubernetes-side steps are what protect your applications.

This guide walks through every step of safely removing a worker node from a Talos Linux cluster.

## Pre-Removal Checklist

Before removing a node, assess the impact on your cluster.

```bash
# Check which pods are running on the node you want to remove
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-04

# Check the node's resource usage
kubectl top node worker-04

# Check remaining cluster capacity (without the node being removed)
kubectl top nodes

# Count total pods on the node
kubectl get pods -A --field-selector spec.nodeName=worker-04 --no-headers | wc -l

# Check for any local persistent volumes on this node
kubectl get pv -o wide | grep worker-04

# Check PodDisruptionBudgets that might affect draining
kubectl get pdb -A
```

Make sure the remaining nodes have enough CPU, memory, and storage to absorb the workloads from the node you are removing.

## Step 1: Cordon the Node

Cordoning marks the node as unschedulable. New pods will not be placed on it, but existing pods continue to run.

```bash
# Cordon the node
kubectl cordon worker-04

# Verify the node is cordoned
kubectl get node worker-04

# Output shows SchedulingDisabled:
# NAME        STATUS                     ROLES    AGE   VERSION
# worker-04   Ready,SchedulingDisabled   <none>   30d   v1.29.0
```

At this point, the node is still running all its existing pods. No disruption has occurred yet.

## Step 2: Handle Persistent Storage

If the node has local persistent volumes, handle them before draining.

### Check for Local PVs

```bash
# List PVs associated with the node
kubectl get pv -o custom-columns=\
  'NAME:.metadata.name,CAPACITY:.spec.capacity.storage,NODE:.spec.nodeAffinity.required.nodeSelectorTerms[*].matchExpressions[*].values[*],STATUS:.status.phase'

# Check PVCs using those PVs
kubectl get pvc -A -o wide
```

### Migrate Data from Local PVs

If you have local persistent volumes with data that needs to be preserved:

```bash
# Option 1: Take a snapshot if your storage provider supports it
kubectl apply -f - << 'EOF'
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-backup-worker-04
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: data-pvc
EOF

# Option 2: Copy data to another location
kubectl exec <pod-with-pv> -- tar czf /tmp/backup.tar.gz /data
kubectl cp <pod-with-pv>:/tmp/backup.tar.gz ./backup.tar.gz
```

### Replicated Storage

If you are using a replicated storage solution (Longhorn, Rook-Ceph, LINSTOR), the data is already available on other nodes. You can proceed with the drain without manual data migration.

```bash
# Check replication status (Longhorn example)
kubectl -n longhorn-system get volumes.longhorn.io -o wide

# Verify replicas exist on other nodes
kubectl -n longhorn-system get replicas.longhorn.io -o wide
```

## Step 3: Drain the Node

Draining evicts all pods (except DaemonSet pods) from the node, allowing them to be rescheduled elsewhere.

```bash
# Drain the node with standard options
kubectl drain worker-04 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=120 \
  --timeout=600s

# Flags explained:
# --ignore-daemonsets: Don't wait for DaemonSet pods (they'll be cleaned up)
# --delete-emptydir-data: Allow eviction of pods with emptyDir volumes
# --grace-period=120: Give pods 2 minutes to gracefully terminate
# --timeout=600s: Total timeout of 10 minutes for the drain operation
```

### Monitoring the Drain

```bash
# In another terminal, watch pod migrations
kubectl get pods -A -o wide -w

# Check if any pods are stuck
kubectl get pods -A --field-selector spec.nodeName=worker-04

# Watch for any failed rescheduling
kubectl get events --sort-by='.lastTimestamp' | grep -i "fail\|error\|schedule"
```

### Handling Drain Blockers

If the drain gets stuck, diagnose the cause.

```bash
# Check which pods are still on the node
kubectl get pods -A --field-selector spec.nodeName=worker-04 --no-headers

# Check if a PDB is blocking eviction
kubectl get pdb -A -o wide

# Example: If a PDB requires minAvailable=2 and only 2 replicas exist,
# the drain will block until you scale up
kubectl scale deployment my-app --replicas=3 -n my-namespace

# Then retry the drain
kubectl drain worker-04 --ignore-daemonsets --delete-emptydir-data
```

If a specific pod is stuck terminating:

```bash
# Check the pod status
kubectl describe pod <stuck-pod> -n <namespace>

# If the pod has a finalizer preventing deletion
kubectl patch pod <stuck-pod> -n <namespace> \
  -p '{"metadata":{"finalizers":null}}'

# As a last resort, force delete the pod
kubectl delete pod <stuck-pod> -n <namespace> --grace-period=0 --force
```

## Step 4: Verify Workloads Migrated

Before proceeding, confirm all important workloads are running on other nodes.

```bash
# Check that critical deployments are healthy
kubectl get deployments -A

# Verify StatefulSets are healthy
kubectl get statefulsets -A

# Check that Jobs are progressing
kubectl get jobs -A

# Make sure no pods are in Pending state
kubectl get pods -A --field-selector status.phase=Pending

# If pods are Pending, check why
kubectl describe pod <pending-pod> -n <namespace>
```

## Step 5: Delete the Node from Kubernetes

Remove the node object from the Kubernetes API.

```bash
# Delete the node
kubectl delete node worker-04

# Verify it is gone
kubectl get nodes

# The node should no longer appear in the list
```

## Step 6: Reset the Talos Node

Now that the node is removed from Kubernetes, clean up the Talos installation.

```bash
# Graceful reset - cleans up and reboots to maintenance mode
talosctl -n <worker-04-ip> reset --graceful

# Full wipe - resets all partitions including system and data
talosctl -n <worker-04-ip> reset --graceful \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL
```

After the reset, the node reboots into maintenance mode. From there, you can:

- Power it off if decommissioning
- Reprovision it with a new configuration
- Reuse it as a different type of node

### Shutdown After Reset

If you want to power off the machine completely:

```bash
# After the reset completes and the node is in maintenance mode
talosctl -n <worker-04-ip> shutdown

# Or if you cannot reach the node, power it off through
# your hypervisor or hardware management interface
```

## Step 7: Post-Removal Cleanup

After the node is removed, clean up any resources that referenced it.

```bash
# Check for stale node references in configs
kubectl get configmaps -A | grep worker-04
kubectl get endpoints -A

# Clean up any node-specific PVs that are now orphaned
kubectl get pv | grep Released

# Delete orphaned PVs
kubectl delete pv <orphaned-pv-name>

# Check for leftover lease objects
kubectl get leases -n kube-node-lease | grep worker-04
# These should be cleaned up automatically, but delete if they persist
kubectl delete lease worker-04 -n kube-node-lease
```

## Step 8: Verify Cluster Health

Run a comprehensive health check to confirm the cluster is stable.

```bash
# Check all nodes are Ready
kubectl get nodes

# Verify system pods are healthy
kubectl get pods -n kube-system

# Check that all deployments have the right number of replicas
kubectl get deployments -A -o custom-columns=\
  'NAME:.metadata.name,DESIRED:.spec.replicas,AVAILABLE:.status.availableReplicas'

# Run a cluster-level health check
talosctl -n <any-remaining-node-ip> health

# Test DNS resolution
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default

# Test pod scheduling
kubectl run schedule-test --image=nginx
kubectl get pod schedule-test -o wide
kubectl delete pod schedule-test
```

## Automating Worker Node Removal

For environments where you regularly add and remove workers, automate the process.

```bash
#!/bin/bash
# remove-worker.sh
# Usage: ./remove-worker.sh <node-name> <node-ip>

NODE_NAME=$1
NODE_IP=$2

if [ -z "$NODE_NAME" ] || [ -z "$NODE_IP" ]; then
  echo "Usage: $0 <node-name> <node-ip>"
  exit 1
fi

echo "Starting removal of ${NODE_NAME} (${NODE_IP})"

# Step 1: Cordon
echo "Cordoning ${NODE_NAME}..."
kubectl cordon ${NODE_NAME}

# Step 2: Drain
echo "Draining ${NODE_NAME}..."
kubectl drain ${NODE_NAME} \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=120 \
  --timeout=600s

if [ $? -ne 0 ]; then
  echo "Drain failed. Please investigate and retry."
  exit 1
fi

# Step 3: Verify no pods remain (except DaemonSets)
echo "Verifying pod migration..."
REMAINING=$(kubectl get pods -A --field-selector spec.nodeName=${NODE_NAME} \
  --no-headers 2>/dev/null | grep -v -c "kube-proxy\|flannel\|calico-node")

if [ "$REMAINING" -gt 0 ]; then
  echo "Warning: ${REMAINING} non-DaemonSet pods still on ${NODE_NAME}"
  kubectl get pods -A --field-selector spec.nodeName=${NODE_NAME}
fi

# Step 4: Delete from Kubernetes
echo "Deleting node from Kubernetes..."
kubectl delete node ${NODE_NAME}

# Step 5: Reset Talos
echo "Resetting Talos on ${NODE_IP}..."
talosctl -n ${NODE_IP} reset --graceful

echo "Node ${NODE_NAME} has been removed successfully."
echo ""
echo "Current nodes:"
kubectl get nodes
```

```bash
# Make it executable
chmod +x remove-worker.sh

# Use it
./remove-worker.sh worker-04 10.0.0.40
```

## Common Pitfalls

A few things to watch out for when removing worker nodes:

1. **Single replicas** - If a deployment has only one replica and it is on the node being removed, there will be downtime during the migration. Scale up first.

2. **Node affinity** - Pods with node affinity or nodeSelector rules targeting the removed node will become unschedulable. Update these rules.

3. **HostPath volumes** - Pods using hostPath volumes will lose their data when moved to another node. Back up the data first.

4. **DaemonSet resources** - DaemonSet pods are not evicted during drain. They are terminated when the node is deleted. This is normal.

5. **Ingress controllers** - If the removed node was running an ingress controller, make sure traffic is routed to remaining nodes.

## Conclusion

Removing a worker node from a Talos Linux cluster is a controlled process when you follow the right steps. Cordon first to prevent new scheduling, drain to migrate existing workloads, verify the migration, then delete the node from Kubernetes and reset the Talos installation. The whole operation can take anywhere from a few minutes to half an hour depending on the number of pods and how long they take to gracefully terminate. By checking your cluster health before and after, handling persistent storage properly, and being aware of PodDisruptionBudgets, you can remove nodes without any impact on your running applications.
