# How to Migrate from Unencrypted to Encrypted Disks in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Encryption, Migration, Security, Kubernetes

Description: A practical guide to migrating Talos Linux nodes from unencrypted to encrypted disk partitions with minimal cluster disruption.

---

You have a running Talos Linux cluster with unencrypted disks, and now you need encryption. Maybe compliance requirements changed, a security audit flagged the lack of encryption, or you are simply hardening your infrastructure. Whatever the reason, migrating from unencrypted to encrypted partitions in Talos Linux requires a reprovisioning approach since you cannot encrypt an existing partition in place. This guide covers the migration strategy, step-by-step process, and how to minimize disruption to your running cluster.

## Why You Cannot Encrypt In Place

Unlike some traditional Linux setups where tools like `cryptsetup-reencrypt` can convert an existing partition to LUKS, Talos Linux does not support in-place encryption. The reasons are practical:

- Talos manages partitions through its declarative configuration system
- The partition needs to be reformatted as a LUKS2 container
- The filesystem inside the encrypted container is new
- In-place encryption would require significant time and carries risk of data loss

Instead, the migration follows a node-by-node reprovisioning pattern. You drain a node, reset it, apply the encrypted configuration, and let it rejoin the cluster. Kubernetes handles the workload redistribution.

## Migration Strategy

The recommended approach is a rolling migration:

1. Start with worker nodes (less critical than control plane)
2. Migrate one node at a time
3. Verify cluster health between each node
4. Finish with control plane nodes
5. Update your node provisioning pipeline to use encrypted configs going forward

This approach maintains cluster availability throughout the migration. At no point is the cluster down.

## Preparing the Encrypted Configuration

First, create the machine configuration with encryption enabled. Start with your existing config and add the encryption section:

```yaml
# worker-encrypted.yaml
machine:
  type: worker
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "recovery-key-store-securely"
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "recovery-key-store-securely"
          slot: 1
  # ... rest of your existing machine config
```

Do the same for control plane nodes:

```yaml
# controlplane-encrypted.yaml
machine:
  type: controlplane
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "recovery-key-store-securely"
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "recovery-key-store-securely"
          slot: 1
  # ... rest of your existing machine config
```

## Pre-Migration Checks

Before starting, verify your cluster is healthy:

```bash
# Check all nodes are ready
kubectl get nodes -o wide

# Check all pods are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Check etcd health (for control plane migration)
talosctl etcd status --nodes 192.168.1.10

# Verify you have enough capacity to handle losing one node
kubectl describe nodes | grep -A 5 "Allocated resources"
```

Also verify your encrypted configuration is syntactically valid:

```bash
# Validate the machine config
talosctl validate --config worker-encrypted.yaml --mode metal
```

## Migrating Worker Nodes

### Step 1: Select a Worker Node

Pick a worker node to migrate first. Check its workloads:

```bash
# See what is running on the node
kubectl get pods --all-namespaces --field-selector spec.nodeName=worker-01
```

### Step 2: Drain the Node

```bash
# Drain all workloads from the node
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data --timeout=300s
```

Wait for the drain to complete. All pods should be rescheduled to other nodes.

### Step 3: Reset the Node

```bash
# Reset the node - this wipes STATE and EPHEMERAL
talosctl reset --nodes 192.168.1.11 --graceful --reboot
```

The node will wipe its partitions and reboot. After the reboot, it will be in maintenance mode, waiting for a new configuration.

### Step 4: Apply the Encrypted Configuration

```bash
# Apply the encrypted config
talosctl apply-config --nodes 192.168.1.11 --file worker-encrypted.yaml --insecure
```

The `--insecure` flag is needed because the node is in maintenance mode and does not yet have a trusted configuration.

### Step 5: Wait for the Node to Join

The node will create encrypted partitions, install Talos, bootstrap Kubernetes components, and join the cluster:

```bash
# Watch the node come back
kubectl get nodes --watch

# Once it appears, verify it is ready
kubectl get node worker-01 -o wide
```

### Step 6: Verify Encryption

```bash
# Check that encryption is active
talosctl get volumestatus STATE --nodes 192.168.1.11 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.11 -o yaml
```

### Step 7: Uncordon the Node

```bash
kubectl uncordon worker-01
```

### Step 8: Verify Cluster Health

```bash
# All nodes should be ready
kubectl get nodes

# Check for any issues
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

Repeat steps 1-8 for each remaining worker node.

## Migrating Control Plane Nodes

Control plane migration requires extra care because of etcd. Etcd is a distributed consensus system that requires a quorum (majority) of members to be available.

For a 3-node control plane:
- You can lose 1 node and maintain quorum (2 out of 3)
- Never migrate more than 1 control plane node at a time
- Wait for the etcd member to fully sync before moving to the next node

### Control Plane Migration Steps

```bash
# Step 1: Check etcd health
talosctl etcd status --nodes 192.168.1.10

# Step 2: Remove the etcd member for the node being migrated
talosctl etcd remove-member --nodes 192.168.1.10 192.168.1.12

# Step 3: Reset the node
talosctl reset --nodes 192.168.1.12 --graceful --reboot

# Step 4: Apply encrypted config
talosctl apply-config --nodes 192.168.1.12 --file controlplane-encrypted.yaml --insecure

# Step 5: Wait for the node to join and etcd to sync
talosctl etcd status --nodes 192.168.1.10

# Step 6: Verify etcd health before moving to the next node
talosctl etcd status --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

## Handling Persistent Volumes

If your cluster uses persistent volumes backed by local storage, those volumes will be lost during the node reset. Plan for this:

- **Replicated storage (Ceph, Longhorn):** The storage system will rebuild replicas on the new node. Wait for replication to complete before migrating the next node.
- **Local path provisioner:** Data on local volumes is lost. Ensure workloads have been migrated and data backed up.
- **NFS/iSCSI:** External storage is not affected by node reset.

```bash
# Check for PVs bound to the node being migrated
kubectl get pv -o wide | grep worker-01
```

## Rollback Plan

If something goes wrong during migration:

1. The reset node can be reconfigured with the original unencrypted config
2. Other nodes remain unaffected
3. Kubernetes workloads continue running on the remaining nodes

```bash
# Rollback: apply the original unencrypted config instead
talosctl apply-config --nodes 192.168.1.11 --file worker-original.yaml --insecure
```

## Post-Migration Tasks

After all nodes are migrated:

1. **Update your provisioning pipeline** to use encrypted configs for all new nodes
2. **Document the encryption configuration** including key types and recovery procedures
3. **Store recovery keys securely** in a vault or password manager
4. **Update monitoring** to track encryption-related metrics
5. **Schedule key rotation** as part of your regular security maintenance

```bash
# Final verification - all nodes should show encryption
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "=== $node ==="
  talosctl get volumestatus STATE --nodes "$node" -o yaml | grep -A 2 "encryption"
  talosctl get volumestatus EPHEMERAL --nodes "$node" -o yaml | grep -A 2 "encryption"
done
```

## Summary

Migrating from unencrypted to encrypted disks in Talos Linux is a controlled, node-by-node process. While it requires reprovisioning each node, the rolling approach ensures your cluster stays available throughout the migration. Start with worker nodes, handle control plane nodes carefully with attention to etcd quorum, and always verify cluster health between each step. Once complete, update your infrastructure-as-code to ensure all future nodes are provisioned with encryption from the start.
