# How to Create a Disaster Recovery Runbook for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disaster Recovery, Kubernetes, Infrastructure, DevOps

Description: Learn how to create a comprehensive disaster recovery runbook for Talos Linux clusters covering backup strategies, failover procedures, and recovery workflows.

---

Running a Talos Linux cluster in production means planning for the worst. Hardware failures, network outages, misconfigurations, and even human error can bring down your infrastructure. A disaster recovery (DR) runbook gives your team a clear, step-by-step playbook for getting things back on track. Without one, you are relying on memory and improvisation during the most stressful moments.

This guide walks through building a practical DR runbook tailored for Talos Linux environments.

## Why Talos Linux Needs a Specific Runbook

Talos Linux is different from traditional Linux distributions. There is no SSH access, no shell, and no package manager. Everything is managed through the Talos API and machine configuration files. This means your standard Linux recovery procedures will not work. Your runbook needs to account for the declarative, API-driven nature of Talos.

The good news is that Talos's immutable design actually simplifies recovery in many ways. Since the OS state is defined by configuration, you can rebuild nodes from scratch as long as you have the right configs and certificates.

## Step 1: Document Your Cluster Topology

Start by mapping out your entire cluster. Your runbook should include:

- Number of control plane nodes and their IP addresses
- Number of worker nodes and their roles
- Load balancer configuration for the Kubernetes API
- Network topology including VLANs, subnets, and gateways
- Storage backend details (local disks, NFS, Ceph, etc.)

```yaml
# Example cluster topology document
cluster:
  name: production-cluster
  endpoint: https://k8s.example.com:6443
  control_plane_nodes:
    - name: cp-1
      ip: 10.0.1.10
      role: control-plane
    - name: cp-2
      ip: 10.0.1.11
      role: control-plane
    - name: cp-3
      ip: 10.0.1.12
      role: control-plane
  worker_nodes:
    - name: worker-1
      ip: 10.0.2.10
      labels:
        node-role: compute
    - name: worker-2
      ip: 10.0.2.11
      labels:
        node-role: storage
```

Keep this document version-controlled and update it every time you change the cluster.

## Step 2: Back Up Critical Assets

Your runbook must specify what to back up and where those backups live. For Talos Linux, the critical assets include:

**Talos machine configurations** - These define the entire OS state of each node. Store them in a secure, versioned location.

```bash
# Save current machine configuration for a node
talosctl -n 10.0.1.10 get machineconfig -o yaml > cp-1-config.yaml

# Back up the talosconfig (contains client credentials)
cp ~/.talos/config talosconfig-backup.yaml
```

**etcd snapshots** - The etcd database holds all Kubernetes state. This is the single most important backup.

```bash
# Create an etcd snapshot through Talos
talosctl -n 10.0.1.10 etcd snapshot db.snapshot

# Verify the snapshot
talosctl -n 10.0.1.10 etcd status
```

**Kubernetes resources** - Use tools like Velero to back up namespaces, persistent volumes, and custom resources.

**Certificates and secrets** - The Talos PKI, Kubernetes CA certificates, and any secrets stored in the cluster.

## Step 3: Define Recovery Scenarios

Your runbook should cover these common scenarios:

### Scenario A: Single Worker Node Failure

This is the simplest case. Worker nodes are stateless from Talos's perspective.

```bash
# Step 1: Remove the failed node from Kubernetes
kubectl delete node worker-1

# Step 2: Boot a new node with the worker machine config
# (PXE boot or apply ISO with the same worker config)

# Step 3: Apply the machine configuration
talosctl apply-config --insecure \
  --nodes 10.0.2.10 \
  --file worker-config.yaml

# Step 4: Verify the node joins the cluster
kubectl get nodes -w
```

### Scenario B: Single Control Plane Node Failure

Control plane recovery requires more care because of etcd.

```bash
# Step 1: Check etcd health on remaining nodes
talosctl -n 10.0.1.11 etcd status
talosctl -n 10.0.1.11 etcd member list

# Step 2: Remove the failed member from etcd
talosctl -n 10.0.1.11 etcd remove-member <member-id>

# Step 3: Boot and configure the replacement node
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file controlplane-config.yaml

# Step 4: Verify etcd cluster health
talosctl -n 10.0.1.10 etcd status
```

### Scenario C: Complete Cluster Loss

This is the worst case. You need etcd backups to recover.

```bash
# Step 1: Bootstrap a new control plane node with etcd recovery
talosctl bootstrap --recover-from=./db.snapshot \
  --nodes 10.0.1.10

# Step 2: Wait for etcd to initialize
talosctl -n 10.0.1.10 etcd status

# Step 3: Join additional control plane nodes
talosctl apply-config --insecure \
  --nodes 10.0.1.11 \
  --file controlplane-config.yaml

# Step 4: Join worker nodes
talosctl apply-config --insecure \
  --nodes 10.0.2.10 \
  --file worker-config.yaml
```

## Step 4: Set Recovery Time Objectives

Define clear targets for your team:

- **RTO (Recovery Time Objective)**: How quickly must the cluster be operational? For a single node failure, aim for under 15 minutes. For full cluster recovery, set a realistic target like 1-2 hours.
- **RPO (Recovery Point Objective)**: How much data loss is acceptable? If you take etcd snapshots every hour, your RPO is one hour.

Document these targets prominently in the runbook so everyone understands the expectations.

## Step 5: Create a Communication Plan

Include contact information and escalation paths:

- Who gets notified first when an outage is detected
- Which team members have access to Talos credentials
- Where the backup credentials and configurations are stored
- How to communicate status updates to stakeholders

## Step 6: Automate Backup Verification

Backups are worthless if they are corrupted or incomplete. Add automated verification to your runbook procedures.

```bash
#!/bin/bash
# verify-backups.sh - Run daily via cron or CI pipeline

# Check etcd snapshot integrity
SNAPSHOT_FILE="/backups/etcd/latest.snapshot"
if [ ! -f "$SNAPSHOT_FILE" ]; then
  echo "ERROR: etcd snapshot not found"
  exit 1
fi

# Verify snapshot age (should be less than 24 hours old)
SNAPSHOT_AGE=$(( $(date +%s) - $(stat -c %Y "$SNAPSHOT_FILE") ))
if [ "$SNAPSHOT_AGE" -gt 86400 ]; then
  echo "ERROR: etcd snapshot is older than 24 hours"
  exit 1
fi

# Verify machine configs exist
for config in controlplane-config.yaml worker-config.yaml; do
  if [ ! -f "/backups/talos/$config" ]; then
    echo "ERROR: Missing config $config"
    exit 1
  fi
done

echo "All backup verifications passed"
```

## Step 7: Schedule Regular Drills

A runbook that nobody has practiced is just documentation. Schedule quarterly DR drills where the team actually follows the runbook steps in a staging environment. After each drill, update the runbook with any corrections or improvements.

Track drill results in a simple table:

| Date | Scenario Tested | Time to Recover | Issues Found | Runbook Updated |
|------|----------------|-----------------|--------------|-----------------|
| Q1 2026 | Single CP failure | 12 min | Config path outdated | Yes |
| Q2 2026 | Full cluster loss | 47 min | Snapshot too old | Yes |

## Step 8: Version Control the Runbook

Store the runbook alongside your infrastructure code. Use git to track changes, and require pull request reviews for any modifications. This ensures that changes are deliberate and reviewed by someone who understands the implications.

## Wrapping Up

A disaster recovery runbook for Talos Linux does not need to be complicated, but it does need to be thorough and tested. The key pieces are: documented topology, verified backups, clear recovery procedures for each failure scenario, defined recovery objectives, and regular practice drills. Talos Linux's API-driven approach means that recovery procedures are scriptable and repeatable, which is a significant advantage over traditional setups. Build your runbook, test it, and keep it current. When something goes wrong at 3 AM, you will be glad you did.
