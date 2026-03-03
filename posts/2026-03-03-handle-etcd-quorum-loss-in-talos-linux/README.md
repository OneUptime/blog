# How to Handle etcd Quorum Loss in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Quorum, Kubernetes, Cluster Recovery, High Availability

Description: Understanding and recovering from etcd quorum loss in Talos Linux clusters to restore Kubernetes control plane availability.

---

Quorum loss in etcd is one of the most serious situations you can face with a Kubernetes cluster. When a majority of etcd members become unavailable, the cluster cannot process any write operations. The Kubernetes API server becomes read-only at best, and completely unresponsive at worst. In a Talos Linux cluster, handling quorum loss requires specific steps because of the immutable, API-driven nature of the operating system.

## Understanding etcd Quorum

etcd uses the Raft consensus algorithm, which requires a majority of members to agree on any write. For a cluster of N members, you need at least (N/2 + 1) members to maintain quorum:

- 3 members: need 2 for quorum (can tolerate 1 failure)
- 5 members: need 3 for quorum (can tolerate 2 failures)
- 7 members: need 4 for quorum (can tolerate 3 failures)

Most Talos Linux clusters run 3 control plane nodes, which means losing 2 out of 3 etcd members results in quorum loss.

```bash
# Check current etcd member status
talosctl etcd members --nodes <any-reachable-cp-node>

# Check etcd health - this will fail or show errors during quorum loss
talosctl etcd status --nodes <any-reachable-cp-node>
```

## Symptoms of Quorum Loss

You will notice quorum loss through several symptoms:

```bash
# The Kubernetes API server becomes slow or unresponsive
kubectl get nodes
# May hang or return errors like "etcdserver: request timed out"

# etcd logs show leader election failures
talosctl logs etcd --nodes <surviving-cp-node> | grep -i "leader"

# You might see messages like:
# "raft: lost leader"
# "etcdserver: no leader"
# "etcdserver: request timed out"
```

The cluster can still serve read requests for a short time using cached data, but no new writes (deploying pods, creating services, etc.) will succeed.

## Scenario 1: Temporary Quorum Loss

If the quorum loss is temporary - for example, two nodes rebooted at the same time - the fix is to bring the nodes back:

```bash
# Check which nodes are down
talosctl etcd members --nodes <surviving-cp-node>

# If nodes are just rebooting, wait for them to come back
talosctl services --nodes <rebooting-node>

# Watch for etcd to restart
talosctl services --nodes <rebooting-node> | grep etcd

# Once enough members are back, quorum is automatically restored
talosctl etcd status --nodes <any-cp-node>
```

Do not panic during a temporary loss. If the nodes are coming back, etcd will restore quorum automatically once enough members are online.

## Scenario 2: Permanent Loss of One Member (3-Node Cluster)

If one control plane node is permanently lost (hardware failure, disk corruption) but you still have 2 out of 3 members running:

```bash
# You still have quorum with 2 out of 3 members
# First, verify you have quorum
talosctl etcd status --nodes <surviving-cp-node-1>

# Remove the dead member from the etcd cluster
# Get the member ID of the dead node
talosctl etcd members --nodes <surviving-cp-node-1>

# Remove the failed member
talosctl etcd remove-member --nodes <surviving-cp-node-1> <dead-member-id>

# Verify the member was removed
talosctl etcd members --nodes <surviving-cp-node-1>
# Should show 2 members now
```

Then replace the failed node:

```bash
# Provision a new control plane node
# Apply the machine configuration
talosctl apply-config --nodes <new-cp-node-ip> \
  --file cp-node-config.yaml --insecure

# The new node will join the etcd cluster automatically
# Wait for it to appear
talosctl etcd members --nodes <surviving-cp-node-1>
# Should show 3 members again
```

## Scenario 3: Permanent Loss of Majority (Quorum Lost)

This is the serious scenario. Two or more control plane nodes in a three-node cluster are permanently gone. You have lost quorum and cannot perform normal etcd operations.

### Option A: Recover from etcd Backup

If you have a recent etcd snapshot:

```bash
# Wipe etcd on the surviving node(s)
talosctl reset --nodes <surviving-cp-node> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Wait for the node to come back
talosctl services --nodes <surviving-cp-node>

# Bootstrap from the etcd backup
talosctl bootstrap --nodes <surviving-cp-node> \
  --recover-from ./etcd-backup.db

# Wait for etcd to start
talosctl etcd status --nodes <surviving-cp-node>

# Join the other control plane nodes
# (provision new ones if the originals are gone)
```

### Option B: Force a New Cluster from One Surviving Member

If you do not have a backup but have one surviving member with its etcd data intact, you can force it to become a single-node cluster:

```bash
# This is a drastic operation - the surviving node's etcd
# becomes the entire cluster

# First, wipe the EPHEMERAL partition to reset etcd
talosctl reset --nodes <surviving-cp-node> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Then bootstrap it as if it were a new cluster
# but using the --recover-from flag with the local snapshot

# Take a snapshot first (if possible)
# If etcd is not responding, this may not work
talosctl etcd snapshot ./emergency-backup.db \
  --nodes <surviving-cp-node>

# Then follow the bootstrap-from-backup procedure
talosctl bootstrap --nodes <surviving-cp-node> \
  --recover-from ./emergency-backup.db
```

## Preventing Quorum Loss

Prevention is far better than recovery. Here are practices that reduce the risk:

### Never Upgrade Multiple Control Plane Nodes Simultaneously

```bash
# Always upgrade one at a time
# WRONG:
talosctl upgrade --nodes <cp-1>,<cp-2> --image ...

# RIGHT:
talosctl upgrade --nodes <cp-1> --image ...
# Wait for cp-1 to be healthy
talosctl upgrade --nodes <cp-2> --image ...
```

### Take Regular etcd Backups

```bash
# Automate this with a cron job
# Take a snapshot every hour
0 * * * * talosctl etcd snapshot /backups/etcd-$(date +\%Y\%m\%d-\%H\%M).db --nodes <cp-node>
```

### Monitor etcd Health

```bash
# Set up monitoring alerts for:
# - etcd member count dropping below expected
# - etcd leader changes happening frequently
# - etcd disk latency increasing
# - etcd cluster health checks failing
```

### Spread Control Plane Nodes Across Failure Domains

If all three control plane nodes are on the same rack, a single power failure takes down quorum. Spread them across:

- Different racks
- Different availability zones (in cloud environments)
- Different physical locations (for maximum resilience)

## Verifying Recovery After Quorum Restoration

After restoring quorum, run these checks:

```bash
# etcd is healthy with all members
talosctl etcd status --nodes <cp-node-1>
talosctl etcd members --nodes <cp-node-1>

# Kubernetes API is responsive
kubectl cluster-info
kubectl get nodes

# Write operations work
kubectl create namespace quorum-test
kubectl delete namespace quorum-test

# All pods are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# No data loss (compare with known state)
kubectl get deployments --all-namespaces | wc -l
```

## Summary

etcd quorum loss in Talos Linux ranges from a temporary inconvenience (nodes rebooting) to a serious disaster (permanent loss of majority members). The key to handling it well is preparation: regular etcd backups, monitoring, and spreading control plane nodes across failure domains. When quorum is lost, assess the situation calmly, determine whether the loss is temporary or permanent, and follow the appropriate recovery path. Never make hasty decisions during quorum loss - they often make things worse.
