# How to Use calicoctl delete with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Networking, Network Policy, DevOps

Description: Learn how to safely use calicoctl delete to remove Calico resources including policies, IP pools, BGP peers, and network sets.

---

## Introduction

The `calicoctl delete` command removes Calico resources from the datastore. This includes global network policies, IP pools, BGP peers, host endpoints, and network sets. Understanding how to use this command safely is critical because deleting certain resources, such as IP pools or network policies, can immediately impact network connectivity.

Unlike `kubectl delete`, `calicoctl delete` operates on Calico-specific resources and understands their interdependencies. Some deletions are straightforward while others require careful sequencing to avoid disruptions.

This guide covers practical examples of using `calicoctl delete` along with safety checks and best practices to avoid unintended outages.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed and configured
- `kubectl` with cluster-admin access
- Understanding of your current Calico resource configuration

## Deleting a Resource by Name

### Delete a Global Network Policy

```bash
calicoctl delete globalnetworkpolicy default-deny-ingress
```

### Delete a BGP Peer

```bash
calicoctl delete bgppeer rack-tor-switch
```

### Delete a Network Set

```bash
calicoctl delete globalnetworkset trusted-external
```

## Deleting a Resource Using a File

If you have the resource definition file, you can delete using it:

```bash
calicoctl delete -f deny-all-ingress.yaml
```

This is useful for removing the exact resources you previously created.

## Deleting with stdin

```bash
cat <<EOF | calicoctl delete -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
EOF
```

## Safe Deletion Workflow

Always follow a safe deletion workflow to prevent disruptions:

### Step 1: Inspect the Resource Before Deleting

```bash
# Review what you are about to delete
calicoctl get globalnetworkpolicy my-policy -o yaml
```

### Step 2: Back Up the Resource

```bash
# Save a backup before deletion
calicoctl get globalnetworkpolicy my-policy -o yaml > my-policy-backup.yaml
```

### Step 3: Check Dependencies

```bash
# For IP pools, check if any workloads use addresses from this pool
calicoctl get workloadendpoints --all-namespaces -o json | \
  jq -r '.items[].spec.ipNetworks[]' | sort -u
```

### Step 4: Delete the Resource

```bash
calicoctl delete globalnetworkpolicy my-policy
```

### Step 5: Verify Deletion

```bash
calicoctl get globalnetworkpolicy my-policy 2>&1
# Should show "resource does not exist"
```

## Deleting IP Pools Safely

Deleting an IP pool that is in use will orphan pod IP addresses. Always drain the pool first:

```bash
# Disable the pool to prevent new allocations
calicoctl patch ippool old-pool -p '{"spec": {"disabled": true}}'

# Wait for workloads to be rescheduled or migrate traffic
# Then verify no addresses are allocated from this pool
calicoctl ipam show --ip=10.52.0.0

# Only then delete the pool
calicoctl delete ippool old-pool
```

## Deleting Host Endpoints

Removing a host endpoint removes Calico policy enforcement on that interface:

```bash
# Review the host endpoint
calicoctl get hostendpoint worker1-eth0 -o yaml

# Delete it
calicoctl delete hostendpoint worker1-eth0
```

## Bulk Deletion with Scripts

```bash
#!/bin/bash
# Delete all global network policies matching a pattern
POLICIES=$(calicoctl get globalnetworkpolicy -o json | \
  jq -r '.items[].metadata.name' | grep "^temp-")

for policy in $POLICIES; do
  echo "Deleting policy: $policy"
  calicoctl get globalnetworkpolicy "$policy" -o yaml > "backup-${policy}.yaml"
  calicoctl delete globalnetworkpolicy "$policy"
done
```

## Verification

After deletion, verify the cluster state:

```bash
# Confirm resource is gone
calicoctl get globalnetworkpolicy

# Check that pods are still running
kubectl get pods --all-namespaces | grep -v Running

# Verify network connectivity
kubectl exec -it test-pod -- ping -c 3 10.96.0.1
```

## Troubleshooting

- **Resource not found**: The resource may have already been deleted or the name may be incorrect. Use `calicoctl get <type>` to list existing resources.
- **Connectivity loss after deletion**: Restore the resource from your backup with `calicoctl create -f backup.yaml`.
- **IP pool deletion fails**: Ensure the pool is disabled and no addresses are allocated from it before deletion.
- **Permission denied**: Verify RBAC permissions on the `projectcalico.org` API group.

## Conclusion

The `calicoctl delete` command is a powerful tool that requires careful use. Always inspect and back up resources before deletion, check for dependencies, and verify cluster health afterward. By following the safe deletion workflow outlined in this guide, you can confidently manage the lifecycle of your Calico resources without risking unintended network disruptions.
