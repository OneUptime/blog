# How to Restore etcd from a Snapshot in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Disaster Recovery, Kubernetes, Backup Restore

Description: Learn how to restore your Talos Linux Kubernetes cluster from an etcd snapshot for disaster recovery and data restoration.

---

You have been taking regular etcd backups, and now the moment has come where you actually need to use one. Maybe you accidentally deleted a critical namespace, or your etcd cluster suffered irrecoverable corruption, or you are migrating to new hardware. Whatever the reason, restoring etcd from a snapshot in Talos Linux requires careful execution. This guide walks you through the process step by step.

## Before You Begin

Restoring etcd from a snapshot is a disruptive operation. It replaces the entire current cluster state with the state from the snapshot. Anything that happened after the snapshot was taken will be lost. This includes:

- New deployments and pods created after the backup
- ConfigMap and Secret changes
- RBAC modifications
- Any custom resources created or updated

Make sure you truly need a full restore before proceeding. For simpler recovery scenarios like accidental resource deletion, restoring individual objects from a backup might be more appropriate.

## Prerequisites

You will need:

- A valid etcd snapshot file
- Access to your Talos Linux control plane nodes via talosctl
- The Talos machine configuration for your cluster

Verify your snapshot before starting the restore:

```bash
# Check the snapshot is valid

# If using etcdctl locally:
etcdctl snapshot status ./etcd-snapshot.db --write-out=table

# Expected output:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 3a5c912f |   456789 |       8432 |    189 MB  |
# +----------+----------+------------+------------+
```

If the snapshot shows valid data (non-zero revision and key count), you can proceed.

## Scenario 1: Restoring a Single Control Plane Node

If you have a single control plane node (common in development environments), the process is straightforward. Talos does not have a dedicated `etcd snapshot restore` command - recovery is performed via `talosctl bootstrap --recover-from`. First reset the node to wipe etcd's data, then bootstrap from the snapshot:

```bash
# Step 1: Reset the node, wiping the EPHEMERAL partition where etcd data lives
talosctl -n 192.168.1.10 reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL

# Step 2: Wait until the etcd service reaches the "Preparing" state
talosctl -n 192.168.1.10 service etcd

# Step 3: Bootstrap the node from the snapshot
talosctl -n 192.168.1.10 bootstrap --recover-from=./etcd-snapshot.db

# Step 4: Monitor the restoration process
talosctl -n 192.168.1.10 logs etcd --tail 50
```

If the snapshot was copied directly from `/var/lib/etcd/member/snap/db` rather than generated with `talosctl etcd snapshot`, add `--recover-skip-hash-check` to the bootstrap command.

After the restore, your Kubernetes API server will reconnect to etcd and start reconciling the cluster state. Pods that exist in reality but not in the restored snapshot will be cleaned up, and resources in the snapshot that are missing from reality will be recreated.

## Scenario 2: Restoring a Multi-Node etcd Cluster

Restoring a multi-node etcd cluster is more involved because you need to bootstrap a new cluster from the snapshot. All existing control plane nodes must be reset first so that etcd is wiped on each of them - only then can you bootstrap a single node from the snapshot, and the remaining nodes will rejoin automatically once the control plane endpoint comes up. Here is the process for a 3-node control plane:

```bash
# Step 1: Take note of your current control plane node IPs
# CP1: 192.168.1.10
# CP2: 192.168.1.11
# CP3: 192.168.1.12

# Step 2: Reset ALL control plane nodes, wiping the EPHEMERAL partition
talosctl -n 192.168.1.10 reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL
talosctl -n 192.168.1.11 reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL
talosctl -n 192.168.1.12 reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL
```

Wait for every node to reboot and for the etcd service on each one to enter the "Preparing" state:

```bash
# Step 3: Confirm etcd is "Preparing" on every control plane node
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 service etcd
```

Now bootstrap a single node from the snapshot. The remaining control plane nodes will discover the new cluster and join it automatically:

```bash
# Step 4: Bootstrap the first control plane node from the snapshot
talosctl -n 192.168.1.10 bootstrap --recover-from=./etcd-snapshot.db

# Step 5: Watch the member list - the other nodes will rejoin once the
# control plane endpoint is available
talosctl -n 192.168.1.10 etcd members

# Step 6: Verify all members are healthy
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status
```

## Scenario 3: Restoring to a Completely New Cluster

If you are restoring to entirely new hardware or a fresh Talos installation, the process starts with generating a new cluster configuration. The key difference from a normal install is that `bootstrap` takes `--recover-from` instead of running with no arguments:

```bash
# Step 1: Generate a new Talos cluster config
talosctl gen config my-cluster https://192.168.1.10:6443

# Step 2: Apply the controlplane config to every control plane node
talosctl apply-config --insecure --nodes 192.168.1.10 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.11 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.12 --file controlplane.yaml

# Step 3: Wait for the first node to be ready for bootstrap
# (etcd will be in the "Preparing" state)
talosctl -n 192.168.1.10 service etcd

# Step 4: Bootstrap the first node directly from the snapshot.
# Do NOT run a regular `talosctl bootstrap` first - that would create
# an empty etcd cluster and prevent the restore.
talosctl -n 192.168.1.10 bootstrap --recover-from=./etcd-snapshot.db

# Step 5: Apply worker configs
talosctl apply-config --insecure --nodes 192.168.1.20 --file worker.yaml
```

## Post-Restore Verification

After restoring, run a comprehensive health check:

```bash
# Check etcd cluster health
talosctl -n 192.168.1.10 etcd status
talosctl -n 192.168.1.10 etcd members

# Check that the Kubernetes API server is responding
kubectl cluster-info

# Verify nodes are showing up
kubectl get nodes

# Check that critical system pods are running
kubectl get pods -n kube-system

# Verify your workloads
kubectl get deployments -A
kubectl get statefulsets -A
kubectl get services -A
```

Check for any pods stuck in unexpected states:

```bash
# Find pods that might need attention after restore
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded

# Check for pending pods
kubectl get pods -A --field-selector=status.phase=Pending

# Look at recent events for any errors
kubectl get events -A --sort-by='.lastTimestamp' | tail -30
```

## Handling Post-Restore Issues

After a restore, you may encounter some common issues:

**Pods in Terminating state** - These are pods that were deleted after the snapshot was taken. The cluster will try to clean them up, but some may get stuck:

```bash
# Force delete stuck terminating pods
kubectl delete pod <pod-name> -n <namespace> --grace-period=0 --force
```

**Stale endpoints** - Service endpoints may point to pods that no longer exist. Restarting the kube-controller-manager helps:

```bash
# The controller manager will reconcile endpoints automatically
# Check endpoint health
kubectl get endpoints -A
```

**Certificate issues** - If you restored to new nodes with different IPs, certificates may not match. Talos handles most certificate management automatically, but check:

```bash
# Inspect the dynamic Kubernetes certificates Talos manages
talosctl -n 192.168.1.10 get KubernetesDynamicCerts -o yaml
```

**Node registration** - Worker nodes that were registered with the old cluster need to reconnect:

```bash
# Check node status
kubectl get nodes

# If worker nodes are not appearing, check their kubelet logs
talosctl -n 192.168.1.20 logs kubelet --tail 50

# You may need to re-apply the worker configuration
talosctl apply-config --nodes 192.168.1.20 --file worker.yaml
```

## Partial Restoration

Sometimes you do not want to restore the entire cluster state but just recover specific resources. In that case, you can restore the snapshot to a temporary cluster and extract what you need:

```bash
# Start a temporary single-node etcd using Docker
docker run -d --name temp-etcd \
  -v $(pwd)/etcd-snapshot.db:/tmp/snapshot.db \
  -p 12379:2379 \
  gcr.io/etcd-development/etcd:v3.5.12 \
  etcd --name temp \
  --data-dir /tmp/etcd-data

# Restore the snapshot into the temporary etcd
docker exec temp-etcd etcdctl snapshot restore /tmp/snapshot.db \
  --data-dir /tmp/restored-data

# Restart etcd with the restored data
docker stop temp-etcd
docker run -d --name temp-etcd-restored \
  -v $(pwd)/restored-data:/tmp/etcd-data \
  -p 12379:2379 \
  gcr.io/etcd-development/etcd:v3.5.12 \
  etcd --name temp \
  --data-dir /tmp/etcd-data

# Now you can query the restored data and extract specific resources
docker exec temp-etcd-restored etcdctl get /registry/deployments/default/my-app

# Clean up
docker rm -f temp-etcd-restored
```

## Best Practices for Restore Preparedness

Practice the restore procedure regularly in a test environment. Document your specific cluster configuration and the exact commands needed for your setup. Keep your Talos machine configurations alongside your etcd backups so you have everything needed to rebuild.

Store multiple backup generations. If your most recent backup contains the data corruption you are trying to recover from, you need an older clean backup.

After a successful restore, immediately take a fresh backup of the restored cluster state as your new baseline.

## Summary

Restoring etcd from a snapshot in Talos Linux is a critical disaster recovery skill. The process varies depending on whether you are restoring a single node, a multi-node cluster, or building from scratch on new hardware. Always verify your snapshot before starting, follow the steps carefully, and run thorough health checks after restoration. Regular backup testing ensures that when you need to restore for real, the process goes smoothly.
