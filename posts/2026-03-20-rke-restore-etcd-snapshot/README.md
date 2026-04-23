# How to Restore RKE from an etcd Snapshot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, etcd, Restore, Disaster Recovery

Description: Step-by-step guide to restoring an RKE cluster from an etcd snapshot after data loss or cluster failure.

## Introduction

When a catastrophic event occurs - such as accidental deletion of critical resources, data corruption, or hardware failure - restoring from an etcd snapshot is often the fastest path to recovery. RKE provides a built-in restore command that automates the complex process of cleaning up the cluster, restoring the etcd data, and bringing everything back online. This guide applies to legacy RKE/RKE1 clusters; RKE1 reached end of life on July 31, 2025.

## Prerequisites

- A valid etcd snapshot (local file or S3 object)
- The original `cluster.yml` and, for older snapshots or local-state restores, the `cluster.rkestate` file
- SSH access to all nodes in `cluster.yml`, especially the etcd nodes
- An RKE CLI version compatible with the cluster; use the same RKE version when possible

## Understanding What Gets Restored

An etcd restore will bring back:
- All Kubernetes API objects (Deployments, Services, ConfigMaps, Secrets, etc.)
- RBAC policies and ClusterRoles
- PersistentVolumeClaims (but NOT the actual PV data)
- Custom Resource Definitions and their instances

What is NOT restored:
- Data stored in PersistentVolumes (must be backed up separately)
- Container images themselves (nodes pull or reuse cached images according to image pull policy)

## Step 1: Stop Workloads and Assess the Situation

```bash
# If the cluster is partially accessible, document current state

export KUBECONFIG=kube_config_cluster.yml
kubectl get nodes
kubectl get pods --all-namespaces

# Identify the local snapshot to restore from
ssh ubuntu@192.168.1.101 'sudo ls -lh /opt/rke/etcd-snapshots/'
```

## Step 2: Download the Snapshot (if S3-stored)

If your snapshot is in S3 and you are not restoring directly from S3, copy it to `/opt/rke/etcd-snapshots/` on an etcd node before restoring. RKE can sync a local snapshot from one etcd node to the others during restore.

```bash
# List snapshots in S3
aws s3 ls s3://my-rke-backups/production/

# Download the snapshot locally
aws s3 cp s3://my-rke-backups/production/snapshot-2024-01-15 ./snapshot-2024-01-15

# Copy the snapshot to local storage on an etcd node
# (RKE restore can also restore directly from S3 - see Step 3 alternative)
scp ./snapshot-2024-01-15 ubuntu@192.168.1.101:/tmp/snapshot-2024-01-15
ssh ubuntu@192.168.1.101 "sudo mkdir -p /opt/rke/etcd-snapshots/ && sudo mv /tmp/snapshot-2024-01-15 /opt/rke/etcd-snapshots/"
```

## Step 3: Run the Restore

### Restore from a Local Snapshot

```bash
# Restore from a locally stored snapshot
rke etcd snapshot-restore \
    --name "snapshot-2024-01-15" \
    --config cluster.yml
```

### Restore from S3

```bash
# Restore directly from an S3 snapshot
rke etcd snapshot-restore \
    --name "snapshot-2024-01-15" \
    --config cluster.yml \
    --s3 \
    --access-key "AKIAIOSFODNN7EXAMPLE" \
    --secret-key "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
    --bucket-name "my-rke-backups" \
    --region "us-east-1" \
    --folder "production"
```

What happens during restore:
1. RKE syncs the snapshot or downloads it from S3
2. Checks the snapshot checksum across etcd nodes
3. Deletes the current Kubernetes cluster and cleans old data by running the same cleanup flow as `rke remove`
4. Restores etcd from the snapshot with `etcdctl snapshot restore`
5. Creates the cluster again by running the `rke up` flow and restarts cluster system pods

## Step 4: Bring the Cluster Back Up

For RKE v0.2.0 and later, `rke etcd snapshot-restore` runs the `rke up` flow as part of the restore. If the command reports provisioning issues or you changed `cluster.yml`, run `rke up` again to reconcile the cluster:

```bash
# Optional: re-run rke up to reconcile the cluster state
rke up --config cluster.yml

# Monitor the output for any errors
```

## Step 5: Verify the Restore

```bash
export KUBECONFIG=kube_config_cluster.yml

# Check all nodes are Ready
kubectl get nodes

# Verify the restored objects exist
kubectl get pods --all-namespaces
kubectl get deployments --all-namespaces
kubectl get services --all-namespaces

# Check that specific critical resources are present
kubectl get namespace
kubectl get clusterroles | head -20
```

## Step 6: Restart Workloads if Needed

Some pods may need to be restarted to reconnect to services after the restore:

```bash
# Restart all deployments to ensure they are using the latest configs
kubectl get deployments --all-namespaces -o json | \
    jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
    while read NS NAME; do
        kubectl rollout restart deployment/"$NAME" -n "$NS"
    done

# Or restart a specific deployment
kubectl rollout restart deployment/my-app -n production
```

## Restoring a Single-Node Cluster

For development single-node clusters:

```bash
# Stop RKE managed containers manually if the node is stuck
ssh ubuntu@192.168.1.100 'sudo docker ps --format "{{.Names}}" | grep -E "^(etcd|kube-|nginx-proxy|rke-|cert-deployer)" | xargs -r sudo docker stop'

# Run the restore
rke etcd snapshot-restore \
    --name "my-snapshot" \
    --config cluster.yml

# If needed, re-run rke up
rke up --config cluster.yml
```

## Disaster Recovery: Complete Cluster Rebuild

If you have lost all etcd nodes and need to rebuild from scratch:

```bash
# 1. Provision new nodes (same IPs if possible, or update cluster.yml)
# 2. Copy the snapshot files to the new etcd nodes
for NODE in 192.168.1.101 192.168.1.102 192.168.1.103; do
    scp ./cluster-snapshot ubuntu@$NODE:/tmp/cluster-snapshot
    ssh ubuntu@$NODE "sudo mkdir -p /opt/rke/etcd-snapshots/ && sudo mv /tmp/cluster-snapshot /opt/rke/etcd-snapshots/"
done

# 3. Restore from snapshot
rke etcd snapshot-restore \
    --name "cluster-snapshot" \
    --config cluster.yml

# 4. If needed, reconcile the cluster
rke up --config cluster.yml

# 5. Verify
kubectl get nodes
```

## Troubleshooting

### Restore Fails with "context deadline exceeded"

The etcd nodes may not be reachable. Check SSH access and that Docker is running:

```bash
ssh ubuntu@192.168.1.101 'sudo docker ps'
```

### Restored Cluster Shows Old/Stale Data

Ensure you used the correct snapshot name. Double-check the snapshot timestamp:

```bash
ssh ubuntu@192.168.1.101 'sudo ls -lh /opt/rke/etcd-snapshots/'
```

### API Server Fails to Start After Restore

Check for certificate issues. The restore should preserve existing certificates, but if you rebuilt nodes with new IPs, update `cluster.yml` and re-run `rke up`.

## Conclusion

Restoring a legacy RKE cluster from an etcd snapshot is a documented operation that RKE automates through the `etcd snapshot-restore` command. The process is straightforward when you have a valid snapshot and the original cluster configuration files. Regular backup testing ensures that when disaster strikes, you can restore your cluster with confidence and minimal downtime.
