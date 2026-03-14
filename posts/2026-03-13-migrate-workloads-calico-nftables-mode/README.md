# How to Migrate Existing Workloads to Calico in nftables Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Migration, iptables

Description: A guide to migrating existing Calico workloads from iptables backend to nftables mode with zero downtime.

---

## Introduction

Migrating an existing Calico deployment from iptables to nftables mode requires careful coordination because Felix manages dataplane rules for every running pod. The migration path is a live switch — Felix supports changing `iptablesBackend` at runtime, and it will flush iptables rules and reprogram equivalent nftables rules within one refresh cycle. However, there is a brief window during the transition where existing connections may be interrupted if not handled carefully.

The recommended approach is to migrate nodes one at a time using a cordon-and-drain workflow, or to perform a cluster-wide switch during a maintenance window with pre-validation that nftables kernel modules are loaded on all nodes.

## Prerequisites

- Calico installed with iptables backend
- Linux 5.2+ on all nodes (required for nftables atomic transactions)
- `nft` command available on all nodes
- `kubectl` and `calicoctl` installed

## Step 1: Validate nftables Readiness on All Nodes

Before switching, confirm every node has the required kernel modules.

```bash
# Run on each node or via DaemonSet
lsmod | grep nf_tables
nft list tables 2>/dev/null && echo "nftables ready"
uname -r  # Must be 5.2+
```

Check kernel version across all nodes.

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'
```

## Step 2: Take a Pre-Migration Snapshot

Document current network policy state and IP pool configuration.

```bash
calicoctl get ippool -o yaml > pre-migration-ippools.yaml
calicoctl get felixconfiguration -o yaml > pre-migration-felix.yaml
calicoctl get globalnetworkpolicy -o yaml > pre-migration-gnp.yaml
kubectl get networkpolicy -A -o yaml > pre-migration-netpol.yaml
```

## Step 3: Switch Felix Backend to nftables

Apply the backend change to the global FelixConfiguration.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"iptablesBackend": "nft"}}'
```

Felix on each node detects the config change, flushes existing iptables chains, and reprograms equivalent nftables rules. Monitor the transition.

```bash
# Watch Felix logs on a node
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node -f | grep -i "nft\|iptables\|dataplane"
```

## Step 4: Verify nftables Rules Are Active

On each node after the migration, confirm nftables chains exist and iptables chains are gone.

```bash
# nftables chains should be present
nft list tables | grep calico

# iptables calico chains should be empty
iptables -L | grep -c "cali-" || echo "No legacy iptables calico chains"
```

## Step 5: Test Connectivity for Existing Workloads

Run connectivity tests for workloads that were running before the migration.

```bash
# Deploy a test pod if needed
kubectl run migration-test --image=busybox --restart=Never -- sleep 3600

# Test pod-to-pod connectivity
kubectl exec migration-test -- ping -c3 <another-pod-ip>

# Test pod-to-service connectivity
kubectl exec migration-test -- wget -qO- http://kubernetes.default.svc.cluster.local
```

## Step 6: Verify Policy Enforcement After Migration

Confirm that existing NetworkPolicy objects are still enforced under nftables.

```bash
# Create a deny-all policy test
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nft-migration-test
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: migration
  policyTypes: [Ingress]
EOF

# Verify it takes effect
kubectl exec migration-test -- curl -s --max-time 3 http://<isolated-pod-ip> || echo "Blocked as expected"
kubectl delete networkpolicy nft-migration-test
```

## Step 7: Monitor Prometheus Metrics Post-Migration

```bash
# Check Felix metrics for nftables apply time
kubectl port-forward -n calico-system daemonset/calico-node 9091:9091 &
curl -s http://localhost:9091/metrics | grep felix_int_dataplane_apply_time
```

Apply times under 1 second confirm the nftables dataplane is operating normally.

## Conclusion

Migrating existing Calico workloads to nftables mode involves validating kernel readiness, snapshotting current policy state, switching `iptablesBackend` to `nft` in FelixConfiguration, and verifying that both nftables rules are active and existing policies remain enforced. The migration is largely transparent to running workloads — Felix handles the dataplane reprogram automatically — but connectivity tests and Prometheus metric review confirm the transition completed successfully.
