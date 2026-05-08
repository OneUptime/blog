# Validate Calico etcdv3 Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, etcdv3, Validation, Datastore

Description: How to validate Calico etcdv3 path contents to ensure data consistency between the etcd datastore and actual cluster state across networking, policy, and IPAM data.

---

## Introduction

Calico's etcdv3 datastore is the source of truth for all network configuration in clusters using the etcd backend. Validation of etcdv3 paths ensures that the data stored in etcd accurately reflects the intended cluster state - that all policies present in etcd are valid, that IPAM records correspond to actual running workloads, and that Calico node entries exist for all active nodes.

Data inconsistencies between etcd and the cluster state can cause silent failures: Felix may program stale policies, IP allocations may conflict, or host endpoints may reference nodes that no longer exist. Systematic path validation helps detect these inconsistencies before they cause operational problems.

## Prerequisites

- Calico using etcd datastore
- etcdctl configured with Calico read credentials
- `kubectl` and `calicoctl` with cluster admin access

## Step 1: Validate Policy Path Consistency

Verify that policies in etcd match what calicoctl reports:

```bash
# Count policies via etcd

ETCD_POLICY_COUNT=$(etcdctl get /calico/resources/v3/projectcalico.org/networkpolicies/ --prefix --keys-only | wc -l)

# Count policies via calicoctl
CALICOCTL_COUNT=$(calicoctl get networkpolicies --all-namespaces -o json | \
  python3 -c "import json,sys; print(len(json.load(sys.stdin)['items']))")

echo "etcd: $ETCD_POLICY_COUNT, calicoctl: $CALICOCTL_COUNT"
```

## Step 2: Validate Node Paths

Verify that Calico node entries in etcd correspond to active Kubernetes nodes:

```bash
# Get nodes from etcd
ETCD_NODES=$(etcdctl get /calico/resources/v3/projectcalico.org/nodes/ --prefix --keys-only | \
  awk -F'/' '{print $6}' | sort -u)

# Get nodes from Kubernetes
K8S_NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort)

# Compare
diff <(echo "$ETCD_NODES") <(echo "$K8S_NODES")
```

```mermaid
graph LR
    A[etcd /calico/resources/v3/projectcalico.org/nodes/] --> C{Diff}
    B[kubectl get nodes] --> C
    C -->|Match| D[Consistent]
    C -->|Mismatch| E[Stale or missing entries]
    E --> F[Decommission stale nodes with calicoctl delete node]
```

## Step 3: Validate IPAM Path Consistency

Check that IPAM allocations in etcd correspond to running pods:

```bash
# List IPAM assignment block keys from etcd
etcdctl get /calico/ipam/v2/assignment/ --prefix --keys-only

# Compare with actual pod IPs
kubectl get pods -A -o jsonpath='{range .items[*]}{.status.podIP}{"\n"}{end}' | sort

# Summarize Calico IPAM usage by pool and block
calicoctl ipam show --show-blocks
```

## Step 4: Check for Orphaned Entries

Identify etcd entries for deleted resources:

```bash
# Find Calico node entries for nodes not in Kubernetes
for host in $(etcdctl get /calico/resources/v3/projectcalico.org/nodes/ --prefix --keys-only | \
  awk -F'/' '{print $6}' | sort -u); do
  if ! kubectl get node "$host" &>/dev/null; then
    echo "Orphaned node entry: $host"
  fi
done
```

Cleanup orphaned entries:

```bash
calicoctl node status
# After the node is out of service, remove stale node data
calicoctl delete node <nodeName>
```

## Step 5: Validate Config Paths

Verify Felix global configuration is accessible:

```bash
etcdctl get /calico/resources/v3/projectcalico.org/felixconfigurations/default

# Should return entries like:
# /calico/resources/v3/projectcalico.org/felixconfigurations/default
```

## Step 6: Full Consistency Check with calicoctl

```bash
# calicoctl reports local Calico node and BGP status
calicoctl node status

# Check datastore connectivity and data health
calicoctl get nodes -o wide
calicoctl get ippool -o wide
calicoctl get felixconfiguration default -o yaml
```

## Conclusion

Validating Calico etcdv3 paths involves cross-referencing etcd contents with Kubernetes cluster state to detect orphaned entries, missing records, and count mismatches. Regular validation - ideally automated as a scheduled job - ensures that the etcd datastore remains a consistent and accurate representation of your cluster's network configuration. Address discrepancies with calicoctl rather than direct etcd manipulation to maintain data integrity.
