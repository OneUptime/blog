# How to Use talosctl bootstrap recover-from for Disaster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disaster Recovery, Etcd, Kubernetes, Bootstrap, Cluster Recovery

Description: A detailed guide to using the talosctl bootstrap recover-from command to restore a Talos Linux cluster from an etcd snapshot.

---

The `talosctl bootstrap --recover-from` command is the primary tool for restoring a Talos Linux cluster from an etcd backup. It replaces the normal bootstrap process (which starts with an empty etcd) with one that initializes etcd from a previously taken snapshot. Understanding how this command works and when to use it is essential for any Talos Linux operator.

## What bootstrap recover-from Does

During a normal cluster bootstrap, `talosctl bootstrap` initializes a fresh etcd database on the first control plane node. The Kubernetes API server then connects to this empty etcd and the cluster starts with no pre-existing state.

With `--recover-from`, the bootstrap process instead:

1. Uploads the provided etcd snapshot to the target node
2. Initializes etcd using the snapshot data as the starting state
3. Starts the Kubernetes API server, which sees all the previously stored cluster state

The result is a cluster that picks up where it left off at the time the snapshot was taken.

## When to Use recover-from

Use this command when:

- You need to rebuild a cluster after total control plane loss
- etcd quorum is permanently lost and cannot be recovered
- You are migrating a cluster to new infrastructure
- You need to roll back the cluster state to a known good point

Do not use it for:

- Normal single-member etcd recovery (remove and re-add the member instead)
- Temporary quorum loss (wait for members to come back)
- Kubernetes-level issues (use kubectl for those)

## Prerequisites

Before running the command, you need:

```bash
# 1. A valid etcd snapshot file
ls -la ./etcd-backup.db

# Optionally verify it with etcdctl
etcdctl snapshot status ./etcd-backup.db --write-out=table

# 2. A control plane node in a state ready for bootstrap
# This means the node has been configured but not yet bootstrapped,
# OR the node has been reset
talosctl get machinestatus --nodes <cp-node>

# 3. talosctl configured to talk to the cluster
# Your talosconfig should be set up correctly
talosctl config info
```

## Step-by-Step Recovery Process

### Step 1: Reset the Control Plane Nodes

If the nodes are still running (but etcd is broken), reset them:

```bash
# Reset all control plane nodes
# This wipes the EPHEMERAL partition (which contains etcd data)
talosctl reset --nodes <cp-node-1> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

talosctl reset --nodes <cp-node-2> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

talosctl reset --nodes <cp-node-3> \
  --system-labels-to-wipe EPHEMERAL \
  --graceful=false

# Wait for nodes to come back from reset
sleep 30
talosctl services --nodes <cp-node-1>
```

If you are provisioning entirely new nodes, apply the machine configurations first:

```bash
# Apply configs to new nodes
talosctl apply-config --nodes <cp-node-1-ip> \
  --file cp-1-config.yaml --insecure

talosctl apply-config --nodes <cp-node-2-ip> \
  --file cp-2-config.yaml --insecure

talosctl apply-config --nodes <cp-node-3-ip> \
  --file cp-3-config.yaml --insecure

# Wait for installation to complete
talosctl dmesg --nodes <cp-node-1-ip> --follow
```

### Step 2: Bootstrap with recover-from

Choose one control plane node to be the initial bootstrap node:

```bash
# Bootstrap from the etcd snapshot
talosctl bootstrap --nodes <cp-node-1> \
  --recover-from ./etcd-backup.db
```

This command will:

- Upload the snapshot file to the node
- Configure etcd to start from the snapshot
- Start the etcd service
- Trigger the Kubernetes control plane components to start

### Step 3: Monitor the Recovery

```bash
# Watch the bootstrap progress
talosctl services --nodes <cp-node-1>

# Wait for etcd to be running
# You should see etcd in the "Running" state
talosctl services --nodes <cp-node-1> | grep etcd

# Check etcd status - initially only one member
talosctl etcd status --nodes <cp-node-1>
talosctl etcd members --nodes <cp-node-1>

# Watch system logs for any errors
talosctl logs controller-runtime --nodes <cp-node-1> | tail -20
```

### Step 4: Wait for Other Control Plane Nodes to Join

The other control plane nodes should detect that the cluster has been bootstrapped and join the etcd cluster:

```bash
# Watch for members to appear
watch -n 5 "talosctl etcd members --nodes <cp-node-1>"

# Check if the other nodes' etcd services are running
talosctl services --nodes <cp-node-2> | grep etcd
talosctl services --nodes <cp-node-3> | grep etcd

# Once all three members appear, verify health
talosctl etcd status --nodes <cp-node-1>
```

If nodes do not join automatically, you may need to re-apply their configurations:

```bash
# Re-apply config to trigger etcd join
talosctl apply-config --nodes <cp-node-2> \
  --file cp-2-config.yaml

talosctl apply-config --nodes <cp-node-3> \
  --file cp-3-config.yaml
```

### Step 5: Verify Kubernetes State

```bash
# Get a fresh kubeconfig
talosctl kubeconfig --nodes <cp-node-1>

# Check the API server
kubectl cluster-info

# Verify restored resources
kubectl get nodes
kubectl get namespaces
kubectl get deployments --all-namespaces
kubectl get services --all-namespaces
```

## Handling Common Issues

### Snapshot Upload Fails

```bash
# If the snapshot file is large and the upload fails,
# check network connectivity
talosctl version --nodes <cp-node-1>

# Verify the snapshot file is not corrupted
etcdctl snapshot status ./etcd-backup.db

# Try again - the command is idempotent
talosctl bootstrap --nodes <cp-node-1> \
  --recover-from ./etcd-backup.db
```

### etcd Starts But Kubernetes Does Not

```bash
# Check etcd is actually running and healthy
talosctl etcd status --nodes <cp-node-1>

# Check API server logs
talosctl logs kube-apiserver --nodes <cp-node-1>

# Common issue: certificates in the snapshot do not match
# the current node configuration
talosctl logs controller-runtime --nodes <cp-node-1> | grep -i cert
```

### Nodes Cannot Find Each Other

```bash
# Verify network configuration
talosctl get addresses --nodes <cp-node-1>
talosctl get routes --nodes <cp-node-1>

# Check that the machine config endpoints are correct
talosctl get machineconfig --nodes <cp-node-1> -o yaml | grep -A5 "controlPlane:"
```

### Recovery from a Very Old Snapshot

If the snapshot is from a different Talos or Kubernetes version:

```bash
# The snapshot must be compatible with the current
# Kubernetes/etcd version running on the nodes

# If there is a version mismatch, you may need to:
# 1. Install the Talos version that matches the snapshot
# 2. Recover from the snapshot
# 3. Then upgrade to the desired version
```

## Testing the Recovery Procedure

Practice makes perfect. Test `bootstrap --recover-from` regularly:

```bash
# 1. Take a snapshot of your test/staging cluster
talosctl etcd snapshot ./test-snapshot.db --nodes <staging-cp>

# 2. Destroy the staging cluster (or a separate test cluster)
talosctl reset --nodes <test-cp-1> --system-labels-to-wipe EPHEMERAL --graceful=false

# 3. Recover from the snapshot
talosctl bootstrap --nodes <test-cp-1> --recover-from ./test-snapshot.db

# 4. Verify the recovery
talosctl etcd status --nodes <test-cp-1>
kubectl get all --all-namespaces

# 5. Document any issues encountered and update your runbook
```

## Integration with Automation

You can integrate recover-from into your disaster recovery automation:

```bash
#!/bin/bash
# automated-recovery.sh

set -e

SNAPSHOT_FILE=$1
CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")
BOOTSTRAP_NODE="${CP_NODES[0]}"

echo "Starting cluster recovery from ${SNAPSHOT_FILE}"

# Reset all control plane nodes
for node in "${CP_NODES[@]}"; do
    echo "Resetting ${node}..."
    talosctl reset --nodes ${node} \
      --system-labels-to-wipe EPHEMERAL \
      --graceful=false || true
done

echo "Waiting for nodes to reset..."
sleep 60

# Bootstrap from snapshot
echo "Bootstrapping from snapshot..."
talosctl bootstrap --nodes ${BOOTSTRAP_NODE} \
  --recover-from ${SNAPSHOT_FILE}

# Wait for recovery
echo "Waiting for etcd to be healthy..."
for i in $(seq 1 60); do
    if talosctl etcd status --nodes ${BOOTSTRAP_NODE} 2>/dev/null; then
        echo "etcd is healthy!"
        break
    fi
    echo "Waiting... (${i}/60)"
    sleep 10
done

# Verify
echo "Checking cluster state..."
talosctl etcd members --nodes ${BOOTSTRAP_NODE}
talosctl kubeconfig --nodes ${BOOTSTRAP_NODE}
kubectl get nodes
kubectl get pods --all-namespaces | head -20

echo "Recovery complete!"
```

## Summary

The `talosctl bootstrap --recover-from` command is your primary disaster recovery tool for Talos Linux clusters. It takes an etcd snapshot and uses it to initialize a new (or reset) control plane, restoring all Kubernetes state to the point when the snapshot was taken. The process involves resetting control plane nodes, running the bootstrap command with the snapshot file, waiting for all members to join, and verifying the restored state. Practice this procedure regularly in non-production environments so that when you need it for real, it goes smoothly.
