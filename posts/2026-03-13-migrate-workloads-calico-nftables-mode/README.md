# How to Migrate Existing Workloads to Calico in nftables Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, nftables, Migration, iptables

Description: A guide to migrating existing Calico workloads from iptables backend to nftables mode with zero downtime.

---

## Introduction

Migrating an existing Calico deployment from the iptables dataplane to nftables mode requires careful coordination because Felix manages dataplane rules for every running pod. This is different from setting `iptablesBackend` to `nft`, which only selects the iptables-nft compatibility backend. Calico's nftables dataplane is selected with the operator `Installation` resource or by enabling Felix `NFTablesMode`, and the calico-node pods must roll onto the new dataplane configuration. Existing connections may be interrupted during that rollout if it is not handled carefully.

The recommended approach is to migrate nodes one at a time using a cordon-and-drain workflow, or to perform the switch during a maintenance window with pre-validation that kube-proxy is using nftables mode and nftables requirements are met on all nodes.

## Prerequisites

- Calico installed with iptables backend
- Kubernetes 1.31+ with kube-proxy configured for `nftables` mode
- Linux 5.13+ on all nodes
- `nft` 1.0.1 or later available on all nodes
- `kubectl` and `calicoctl` installed

## Step 1: Validate nftables Readiness on All Nodes

Before switching, confirm every node has the required kernel support and userspace tooling.

```bash
# Run on each node or via DaemonSet

lsmod | grep nf_tables
nft list tables 2>/dev/null && echo "nftables ready"
nft --version  # Must be 1.0.1+
uname -r       # Must be 5.13+
```

Check kernel version and kube-proxy mode across the cluster.

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'
kubectl -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | grep -E 'mode:.*nftables'
```

## Step 2: Take a Pre-Migration Snapshot

Document current network policy state and IP pool configuration.

```bash
calicoctl get ippool -o yaml > pre-migration-ippools.yaml
calicoctl get felixconfiguration -o yaml > pre-migration-felix.yaml
calicoctl get globalnetworkpolicy -o yaml > pre-migration-gnp.yaml
kubectl get networkpolicy -A -o yaml > pre-migration-netpol.yaml
```

## Step 3: Switch Calico to the nftables Dataplane

For an operator-managed Calico installation, apply the dataplane change to the `Installation` resource.

```bash
kubectl patch installation default --type=merge \
  --patch '{"spec":{"calicoNetwork":{"linuxDataplane":"Nftables"}}}'
```

If you manage Calico without the operator, enable nftables support in Felix instead of changing `iptablesBackend`.

```bash
calicoctl patch felixconfiguration default --type=merge \
  --patch '{"spec":{"nftablesMode":"Enabled"}}'
```

The operator or Felix configuration change rolls calico-node onto the nftables dataplane configuration. Monitor the transition.

```bash
# Watch Felix logs
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node -f | grep -i "nft\|iptables\|dataplane"
```

## Step 4: Verify nftables Rules Are Active

On each node after the migration, confirm nftables tables exist. If you previously used the iptables dataplane, also check for stale Calico iptables chains so they can be cleaned up according to your operational runbook.

```bash
# nftables chains should be present
nft list tables | grep calico

# legacy iptables Calico chains should not remain active
iptables-save | grep "cali-" || echo "No legacy iptables calico chains"
```

## Step 5: Test Connectivity for Existing Workloads

Run connectivity tests for workloads that were running before the migration.

```bash
# Deploy a test pod if needed
kubectl run migration-test --image=busybox --restart=Never -- sleep 3600

# Test pod-to-pod connectivity
kubectl exec migration-test -- ping -c3 <another-pod-ip>

# Test pod-to-service connectivity
kubectl exec migration-test -- wget -qO- --no-check-certificate https://kubernetes.default.svc.cluster.local
```

## Step 6: Verify Policy Enforcement After Migration

Confirm that existing NetworkPolicy objects are still enforced under nftables.

```bash
# Create a deny-all policy test
kubectl label pod <isolated-pod-name> test=migration --overwrite

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
kubectl exec migration-test -- wget -T 3 -qO- http://<isolated-pod-ip> || echo "Blocked as expected"
kubectl delete networkpolicy nft-migration-test
```

## Step 7: Monitor Prometheus Metrics Post-Migration

```bash
# Check Felix metrics for nftables apply time
CALICO_NODE_POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n calico-system pod/$CALICO_NODE_POD 9091:9091 &
curl -s http://localhost:9091/metrics | grep felix_int_dataplane_apply_time_seconds
```

Compare apply times with your pre-migration baseline and watch for sustained `felix_int_dataplane_failures` increases.

## Conclusion

Migrating existing Calico workloads to nftables mode involves validating kernel readiness, confirming kube-proxy is in nftables mode, snapshotting current policy state, switching Calico to the nftables dataplane, and verifying that nftables rules are active and existing policies remain enforced. The migration is largely transparent to running workloads when rolled out carefully, but connectivity tests and Prometheus metric review confirm the transition completed successfully.
