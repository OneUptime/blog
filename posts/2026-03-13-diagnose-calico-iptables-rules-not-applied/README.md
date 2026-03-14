# How to Diagnose Calico iptables Rules Not Applied

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, iptables, Networking, Troubleshooting, Kubernetes, Felix

Description: Diagnose cases where Calico iptables rules are not being applied to a node, covering Felix health checks, iptables chain inspection, and FelixConfiguration validation.

---

## Introduction

Calico uses Felix to program iptables rules that enforce network policies and handle pod routing. When iptables rules are not applied, network policies stop being enforced on the affected node and all traffic to pods on that node may be allowed regardless of configured policies.

The symptoms are subtle - connectivity works but security controls are absent. Diagnosing this requires confirming whether Felix is running and healthy, whether Calico iptables chains exist on the node, and whether the Felix configuration allows iptables programming.

## Prerequisites

- Kubernetes cluster with Calico installed
- `kubectl` access with the ability to exec into calico-node pods
- SSH access to affected nodes (for direct iptables inspection)

## Step 1: Check Felix Health and Readiness

Felix must be running and passing readiness checks before it will program iptables rules.

```bash
# Find the calico-node pod on the affected node
NODE="worker-01"
CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=${NODE} -o name | head -1)

# Check if Felix readiness probe passes
kubectl exec -n calico-system "${CALICO_POD}" -- \
  wget -qO- http://localhost:9099/readiness 2>/dev/null
# Expected: 200 OK response (Felix is ready)

# Check Felix liveness probe
kubectl exec -n calico-system "${CALICO_POD}" -- \
  wget -qO- http://localhost:9099/liveness 2>/dev/null
```

## Step 2: Inspect Calico iptables Chains on the Node

Calico creates specific iptables chains prefixed with `cali-`. If these chains are absent, iptables rules are not being programmed.

```bash
# Check if Calico iptables chains exist on the node
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -L -n | grep -c "cali-"
# Expected: Non-zero count (e.g., 20+ chains)

# List specific Calico chains
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -L -n | grep "^Chain cali"

# Check the FORWARD chain for Calico jump rules
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -L FORWARD -n | head -10
# Expected: Contains jump rules to cali-FORWARD
```

## Step 3: Check Felix Configuration for iptables Mode

Felix may be configured to use nftables instead of iptables, or may have iptables programming disabled.

```bash
# Check the FelixConfiguration for iptables-related settings
calicoctl get felixconfiguration default -o yaml | \
  grep -E "iptables|nftables|dataplane"

# Key fields to check:
# datastoreType: etcdv3 or kubernetes
# iptablesBackend: Legacy, NFT, or Auto
# iptablesRefreshInterval: Should be > 0
# iptablesLockFilePath: Should be valid

# Also check for any node-specific FelixConfiguration overrides
calicoctl get felixconfiguration node.${NODE} -o yaml 2>/dev/null
```

## Step 4: Check Felix Logs for iptables Errors

```bash
# Look for iptables-related errors in Felix logs
kubectl logs -n calico-system "${CALICO_POD}" | \
  grep -i "iptables\|restore\|insert\|error\|fail" | tail -30

# Specific error patterns:
# "iptables-restore failed" - iptables rules could not be applied
# "Unable to update iptables" - permission or lock issue
# "iptables: No chain/target/match by that name" - missing kernel module

# Check if there are any kernel module issues
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables --version
```

## Step 5: Check for iptables Lock Contention

Multiple processes competing for the iptables lock can prevent Calico from applying rules.

```bash
# Check for iptables lock on the node
kubectl exec -n calico-system "${CALICO_POD}" -- \
  ls -la /run/xtables.lock 2>/dev/null || \
  ls -la /var/run/xtables.lock 2>/dev/null

# Check if another process holds the iptables lock
kubectl exec -n calico-system "${CALICO_POD}" -- \
  fuser /run/xtables.lock 2>/dev/null

# Check Felix metrics for iptables errors
kubectl exec -n calico-system "${CALICO_POD}" -- \
  wget -qO- http://localhost:9091/metrics 2>/dev/null | \
  grep "iptables_restore_errors"
```

## Best Practices

- Monitor the `felix_iptables_restore_errors_total` Prometheus metric and alert when it increases
- Ensure calico-node pods run with the `system-node-critical` priority class to prevent eviction during resource pressure
- Verify that required kernel modules (`xt_conntrack`, `ip_tables`) are loaded on all nodes
- Use `iptablesBackend: Auto` in FelixConfiguration to let Felix choose the best backend for the kernel version

## Conclusion

Diagnosing missing Calico iptables rules requires checking Felix readiness, verifying that `cali-` prefixed iptables chains exist on the node, reviewing FelixConfiguration for correct iptables backend settings, and checking Felix logs for specific error messages. The `felix_iptables_restore_errors_total` metric is the most reliable indicator of ongoing iptables programming failures.
