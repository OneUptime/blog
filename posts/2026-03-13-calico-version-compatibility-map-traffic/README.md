# How to Map Calico Component Version Compatibility to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Traffic Flows

Description: Understanding how Calico version compatibility issues manifest in real Kubernetes traffic - from policy enforcement failures to routing inconsistencies - and how to diagnose them.

---

## Introduction

Version incompatibility doesn't usually cause an immediate outage - it often manifests as subtle degradation: policies that stop being enforced for new pods, routing that works for existing connections but fails for new ones, or API calls that succeed but have no effect. Mapping these symptoms to version compatibility issues helps you diagnose them faster.

This post connects version compatibility failures to their traffic impact and provides diagnostic procedures for each failure mode.

## Prerequisites

- Knowledge of your cluster's Calico and Kubernetes versions
- `kubectl` and `calicoctl` access for diagnostics
- Understanding of which Calico features your traffic relies on

## Failure Mode 1: Policy Not Enforced for New Pods

**What happens**: After a Kubernetes upgrade that leaves Calico on an unsupported version, new pods may be created but Calico may fail to create or consume the WorkloadEndpoint data it needs to program policy. WorkloadEndpoint lifecycle is normally handled by the Calico CNI/orchestrator integration, and Felix programs the dataplane from that endpoint data.

**Traffic impact**: New pods may have missing or incorrect network policy enforcement, or they may lose connectivity if endpoint programming fails. Existing pods with already-programmed dataplane state may continue to work until they are recreated or their policy state changes.

**Diagnostic**:
```bash
# Check if new pod has a WorkloadEndpoint

kubectl run test-pod --image=nginx
calicoctl get workloadendpoint --all-namespaces | grep test-pod
# If the WorkloadEndpoint is missing, Calico has not recorded the pod endpoint

# Check Felix logs for API errors
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "error\|failed\|api"
```

**Version compatibility connection**: Calico releases are tested against specific Kubernetes versions. If Kubernetes removes an API that an older Calico manifest, controller, or client still uses, Calico components can fail to install, start, or process updates correctly. For example, Kubernetes 1.25 removed several deprecated beta APIs such as `policy/v1beta1` PodSecurityPolicy, so older manifests that still depended on those APIs must be updated before the cluster upgrade.

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

## Failure Mode 3: Policy Update Failure After calicoctl Version Mismatch

**What happens**: Using a mismatched `calicoctl` version to apply a policy change can use a client schema that does not match the Calico version running in the cluster. Depending on the mismatch, the operation may be rejected by validation or may not apply fields introduced in a newer Calico release as intended.

**Traffic impact**: Traffic appears to be allowed when it should be blocked, or vice versa, because the policy stored in the datastore is not the policy the operator intended to apply.

**Diagnostic**:
```bash
calicoctl version
# If Client Version != Cluster Version, this is the likely cause

# Re-apply the policy with the correct calicoctl version
# and verify enforcement
```

## Failure Mode 4: eBPF Programs Failing After Kernel Upgrade

**What happens**: After a node kernel upgrade, the kernel version may not match the requirements for the Calico eBPF version currently installed.

**Traffic impact**: The node's eBPF programs may fail to load or attach. If the cluster is configured for the eBPF dataplane, affected pods and services can lose connectivity until the kernel, Calico version, or dataplane configuration is corrected. Calico does not automatically switch an eBPF-enabled node back to the iptables dataplane as a recovery mechanism.

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
| calicoctl mismatch | Policy validation or schema errors | Compare versions, re-apply policies |
| Kernel upgrade with eBPF | eBPF program reload or attach failure | Check bpftool prog list |
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
- Monitor WorkloadEndpoint counts as a proxy for Felix health - sudden drops indicate Felix is not seeing pod events
- Keep a version change log that maps each upgrade to any observed traffic impact changes

## Conclusion

Version compatibility issues manifest as specific traffic impact patterns: missing policy enforcement for new pods, routing failures for BGP routes, schema-incorrect policy enforcement after calicoctl mismatch, and eBPF program failures after kernel upgrades. Mapping these symptoms to their version compatibility root cause enables fast diagnosis. Running the post-upgrade diagnostic suite after any version change catches compatibility issues before they escalate to production incidents.
