# How to Map Calico Component Version Compatibility to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Traffic Flows, Upgrades, Impact Analysis

Description: Understanding how Calico version compatibility issues manifest in real Kubernetes traffic — from policy enforcement failures to routing inconsistencies — and how to diagnose them.

---

## Introduction

Version incompatibility doesn't usually cause an immediate outage — it often manifests as subtle degradation: policies that stop being enforced for new pods, routing that works for existing connections but fails for new ones, or API calls that succeed but have no effect. Mapping these symptoms to version compatibility issues helps you diagnose them faster.

This post connects version compatibility failures to their traffic impact and provides diagnostic procedures for each failure mode.

## Prerequisites

- Knowledge of your cluster's Calico and Kubernetes versions
- `kubectl` and `calicoctl` access for diagnostics
- Understanding of which Calico features your traffic relies on

## Failure Mode 1: Policy Not Enforced for New Pods

**What happens**: After a Kubernetes upgrade that leaves Calico on an incompatible version, new pods are created but Calico cannot program their policy chains because the API it uses to discover pods has changed.

**Traffic impact**: New pods have no network policy enforcement — all traffic is allowed. Existing pods with already-programmed policy chains continue to work.

**Diagnostic**:
```bash
# Check if new pod has a WorkloadEndpoint
kubectl run test-pod --image=nginx
calicoctl get workloadendpoint --all-namespaces | grep test-pod
# If the WorkloadEndpoint is missing, Felix cannot see the new pod

# Check Felix logs for API errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "error\|failed\|api"
```

**Version compatibility connection**: Felix watches the Kubernetes API for pod events. If the Kubernetes API version has changed (e.g., a beta API removed in Kubernetes 1.25), Felix's watcher fails silently and new pods don't get policy programmed.

## Failure Mode 2: BGP Routes Missing After Upgrade

**What happens**: After a Calico upgrade, BIRD may need configuration changes that confd hasn't applied yet (if confd is on an old version).

**Traffic impact**: New pod routes are not advertised via BGP. Cross-node connectivity to new pods fails.

**Diagnostic**:
```bash
# Check BIRD route table - new pod routes should be present
kubectl exec -n calico-system -l k8s-app=calico-node -c calico-node \
  -- birdcl show route | grep $(kubectl get pod new-pod -o jsonpath='{.status.podIP}')
# If missing, BGP advertisement is failing
```

## Failure Mode 3: Service Routing Failure After calicoctl Version Mismatch

**What happens**: Using a mismatched `calicoctl` version to apply a service policy change results in the policy being applied with the wrong schema. The policy appears correct in `calicoctl get` but is not being enforced as intended.

**Traffic impact**: Service traffic appears to be allowed when it should be blocked, or vice versa — depending on which fields were silently ignored due to schema mismatch.

**Diagnostic**:
```bash
calicoctl version
# If Client Version != Cluster Version, this is the likely cause

# Re-apply the policy with the correct calicoctl version
# and verify enforcement
```

## Failure Mode 4: eBPF Programs Failing After Kernel Upgrade

**What happens**: After a node kernel upgrade, the kernel version may not match the requirements for the Calico eBPF version currently installed.

**Traffic impact**: The node's eBPF programs fail to load. Calico falls back to iptables mode on that node (if configured) or the node's pods lose connectivity.

**Diagnostic**:
```bash
uname -r  # Check kernel version on the affected node
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "bpf\|kernel"
# Look for version-related errors
```

## Mapping Version Changes to Traffic Impact

| Upgrade Event | Potential Traffic Impact | How to Verify |
|---|---|---|
| K8s upgrade without Calico upgrade | New pods have no policy | Check WorkloadEndpoints for new pods |
| Calico minor upgrade | BGP route re-advertisement | Monitor route tables during upgrade |
| calicoctl mismatch | Policy schema errors | Compare versions, re-apply policies |
| Kernel upgrade with eBPF | eBPF program reload | Check bpftool prog list |
| Operator upgrade | All components restart | Monitor tigerastatus |

## Health Monitoring After Upgrades

After any version change, run this diagnostic suite:

```bash
# 1. Verify all components are on the expected version
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.containers[0].image}{"\n"}{end}'

# 2. Check TigeraStatus
kubectl get tigerastatus

# 3. Verify a new pod gets a WorkloadEndpoint
kubectl run post-upgrade-test --image=nginx
sleep 10
calicoctl get workloadendpoint --all-namespaces | grep post-upgrade-test

# 4. Test policy enforcement
kubectl apply -f test-policy.yaml
kubectl exec test-client -- wget --timeout=5 -qO- http://$(kubectl get pod post-upgrade-test -o jsonpath='{.status.podIP}')

# 5. Clean up
kubectl delete pod post-upgrade-test
kubectl delete -f test-policy.yaml
```

## Best Practices

- Run the post-upgrade diagnostic suite immediately after any version change to catch issues while the change window is still open
- Monitor WorkloadEndpoint counts as a proxy for Felix health — sudden drops indicate Felix is not seeing pod events
- Keep a version change log that maps each upgrade to any observed traffic impact changes

## Conclusion

Version compatibility issues manifest as specific traffic impact patterns: missing policy enforcement for new pods, routing failures for BGP routes, schema-incorrect policy enforcement after calicoctl mismatch, and eBPF program failures after kernel upgrades. Mapping these symptoms to their version compatibility root cause enables fast diagnosis. Running the post-upgrade diagnostic suite after any version change catches compatibility issues before they escalate to production incidents.
