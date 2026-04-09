# How to Purge dataDirHostPath Before Reinitializing Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cleanup, dataDirHostPath, Reinitialization

Description: Learn how to properly purge the dataDirHostPath directory on all nodes before reinitializing a Rook-Ceph cluster to prevent stale data conflicts.

---

When reinstalling Rook-Ceph from scratch on existing nodes, leftover data in the `dataDirHostPath` directory (typically `/var/lib/rook`) causes the Rook operator to find existing monitor and cluster data and attempt to use it with the new installation. This usually results in errors, failed mon pods, or a cluster that cannot form. Purging this directory is a required step before reinitializing.

## Understanding dataDirHostPath Contents

The `dataDirHostPath` contains:

```text
/var/lib/rook/
  rook-ceph/              # Cluster-level config and secrets
    rook-ceph.config      # Ceph configuration file
    client.admin.keyring  # Admin keyring
  mon-a/                  # Monitor a data
    data/
      store.db/           # RocksDB database with monitor state
  mon-b/                  # Monitor b data
  mon-c/                  # Monitor c data
  log/                    # Daemon logs
```

This data includes the FSIDs, keyrings, and monitor map from the previous installation. A new Rook installation will generate new FSIDs and keyrings that conflict with the old data, causing startup failures.

## When to Purge dataDirHostPath

Purge this directory when:
- Completely removing and reinstalling Rook-Ceph
- Recovering from a failed installation that left partial data
- Testing a fresh installation on lab hardware
- The cluster FSID or admin keyring needs to be regenerated

Do NOT purge when:
- Recovering an existing working cluster
- Performing Rook operator upgrades
- Temporarily restarting pods

## Step 1: Remove Rook Components First

Before purging host data, remove all Rook Kubernetes resources:

```bash
# Remove cluster CR first (allows clean daemon shutdown)
kubectl -n rook-ceph delete cephcluster rook-ceph

# Wait for cleanup to complete
kubectl -n rook-ceph get pods -w

# Remove the operator
helm uninstall rook-ceph -n rook-ceph
# or
kubectl delete -f operator.yaml
kubectl delete -f common.yaml
kubectl delete -f crds.yaml
```

Verify all Ceph processes have stopped on nodes before proceeding:

```bash
# SSH to each node
ssh node-1 "ps aux | grep ceph | grep -v grep"
```

## Step 2: Clean dataDirHostPath on All Nodes

The dataDirHostPath must be cleaned on every node that participated in the cluster. The easiest way is to use a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: rook-cleanup
  namespace: default
spec:
  selector:
    matchLabels:
      app: rook-cleanup
  template:
    metadata:
      labels:
        app: rook-cleanup
    spec:
      tolerations:
      - operator: Exists
      volumes:
      - name: host-path
        hostPath:
          path: /var/lib/rook
      initContainers:
      - name: cleanup
        image: busybox
        command: ["sh", "-c", "rm -rf /host-rook/*"]
        volumeMounts:
        - name: host-path
          mountPath: /host-rook
        securityContext:
          privileged: true
      containers:
      - name: sleep
        image: busybox
        command: ["sleep", "infinity"]
```

Apply and wait for cleanup:

```bash
kubectl apply -f rook-cleanup-ds.yaml
kubectl rollout status daemonset rook-cleanup
```

Verify the cleanup on one node:

```bash
kubectl exec -it rook-cleanup-xxxx -- ls /host-rook/
```

Remove the cleanup DaemonSet:

```bash
kubectl delete daemonset rook-cleanup
```

## Step 3: Clean Manually via SSH (Alternative)

If you prefer direct access, SSH to each node:

```bash
for node in node-1 node-2 node-3 node-4 node-5 node-6; do
  echo "Cleaning $node..."
  ssh $node "sudo rm -rf /var/lib/rook/*"
  ssh $node "ls /var/lib/rook/"
done
```

The `ls` should return empty or nothing after cleanup.

## Step 4: Verify No Ceph Kernel Modules Are Loaded

On each node, check for lingering Ceph kernel modules that may conflict with a fresh installation:

```bash
ssh node-1 "lsmod | grep -E 'rbd|ceph'"
```

If modules are loaded, they will be automatically reloaded when new OSDs start, but stale mounts from the previous installation can cause issues:

```bash
ssh node-1 "mount | grep ceph"
# Unmount any lingering mounts
ssh node-1 "sudo umount -l /path/to/ceph/mount"
```

## Step 5: Reinstall Rook-Ceph

With the dataDirHostPath clean on all nodes, proceed with a fresh Rook installation:

```bash
ROOK_VERSION="v1.14.0"
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/common.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/operator.yaml
kubectl apply -f cephcluster.yaml
```

Monitor the fresh cluster initialization:

```bash
kubectl -n rook-ceph get pods -w
```

## Summary

Purging `dataDirHostPath` before reinitializing Rook-Ceph requires first removing all Rook Kubernetes resources and confirming Ceph processes have stopped, then cleaning the `/var/lib/rook` directory on every storage node using a DaemonSet or SSH, and verifying no stale mounts remain before reinstalling. Skipping this step causes the new installation to conflict with leftover monitor data and FSIDs from the previous cluster.
