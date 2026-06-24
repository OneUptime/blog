# How to Set Up Calico Datastore Locking Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Operation

Description: Set up and use Calico datastore locking during etcd-to-Kubernetes API datastore migrations to prevent Felix from making policy updates while the migration is in progress.

---

## Introduction

Calico datastore locking (`calicoctl datastore migrate lock`) prevents any new Calico resources from affecting the cluster and blocks new pods from starting while a migration is in progress. This ensures that the exported configuration snapshot is consistent with the state of the cluster between export and import. Without locking, new resources created between export and import would not be carried over to the new datastore, causing drift that requires manual reconciliation.

## Prerequisites

- `calicoctl` configured for etcd datastore (locking is only applicable for etcd-to-Kubernetes migrations)
- etcd credentials with write access
- Understanding that locking will prevent new Calico resources from taking effect and block new pods from starting

## Step 1: Understand the Impact of Locking

```markdown
## What Locking Does:
- Prevents any new Calico resources from affecting the cluster
- Blocks new pods from starting until the migration is complete
- Existing dataplane state (iptables rules, established BGP sessions) continues to operate
- You cannot make configuration changes to the cluster until unlocked

## When to Use Locking:
- During etcd-to-Kubernetes API datastore migration
- Before exporting datastore state, and held until the import has been verified
- Duration: should be kept as short as practical during a planned migration

## Do NOT use locking:
- In production without a migration in progress
- For longer than necessary (new pods cannot start while locked)
```

## Step 2: Execute the Lock During Migration

```bash
# Step 1: Lock the etcd datastore first
DATASTORE_TYPE=etcdv3 calicoctl datastore migrate lock
echo "Datastore locked at: $(date)"

# Step 2: Export current state from etcd
DATASTORE_TYPE=etcdv3 calicoctl datastore migrate export \
  > calico-migration-backup.yaml

# Step 3: Import to Kubernetes API datastore (the -f flag is required;
# shell redirection alone will not work)
DATASTORE_TYPE=kubernetes calicoctl datastore migrate import \
  -f calico-migration-backup.yaml

# Step 4: Verify import succeeded
DATASTORE_TYPE=kubernetes calicoctl get networkpolicy --all-namespaces
DATASTORE_TYPE=kubernetes calicoctl get felixconfiguration

# Step 5: Apply the Kubernetes-datastore Calico manifest and wait for
# the calico-node DaemonSet to roll out
kubectl apply -f calico.yaml
kubectl rollout status daemonset calico-node -n kube-system

# Step 6: Unlock the datastore once the migration is verified
DATASTORE_TYPE=kubernetes calicoctl datastore migrate unlock
```

## Datastore Locking Architecture

```mermaid
sequenceDiagram
    participant SRE
    participant Felix
    participant etcd
    participant k8s_api as Kubernetes API
    
    SRE->>etcd: calicoctl datastore migrate lock
    etcd-->>Felix: New resources cannot affect cluster; new pods blocked
    SRE->>etcd: calicoctl datastore migrate export
    SRE->>k8s_api: calicoctl datastore migrate import -f
    SRE->>Felix: Apply Kubernetes-datastore manifest (calico-node rollout)
    SRE->>k8s_api: calicoctl datastore migrate unlock
    Felix->>k8s_api: Resume normal operation against new datastore
```

## Step 3: Verify Lock Behavior

```bash
# calicoctl does not expose a dedicated lock-status query. The most
# reliable signal that a lock is in effect is that new pods will not
# start while the migration is in progress.

# Check calico-node logs for migration-related messages:
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "locked\|migration"

# Confirm whether new workloads are being scheduled:
kubectl get pods --all-namespaces --field-selector=status.phase=Pending
```

## Conclusion

Calico datastore locking is a migration-specific tool that should only be active for the duration of an etcd-to-Kubernetes datastore migration - typically 2-5 minutes. The lock window should be planned during a low-traffic period since new pods cannot start and new Calico resources will not take effect during this time. Prepare the complete migration procedure in advance, test it in a staging environment, and execute it as a single continuous operation (lock, export, import, verify, unlock) to minimize the lock duration.
