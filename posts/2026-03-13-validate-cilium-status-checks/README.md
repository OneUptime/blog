# How to Validate Cilium Status Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A guide to interpreting and validating Cilium status output, understanding what each component status means, and defining healthy vs. unhealthy states.

---

## Introduction

Running `cilium status` is simple. Interpreting its output correctly requires understanding what each component represents and what "healthy" looks like versus "degraded" or "unavailable." Validating Cilium status checks means establishing clear criteria for a healthy installation and building automated checks that alert when those criteria are not met.

The `cilium status` command aggregates health information from multiple Cilium components: the agent, the operator, the Hubble relay (if enabled), the BPF programs, the policy engine, the IP address manager, and the service load balancer. A complete validation covers all of these components, not just the high-level "OK" indicator.

This guide defines what a validated healthy Cilium installation looks like and provides the commands to verify each component.

## Prerequisites

- Cilium installed on Kubernetes
- Cilium CLI installed
- `kubectl` access

## Step 1: Basic Status Check

```bash
# Quick status overview
cilium status

# Full verbose status
cilium status --verbose

# Expected healthy output includes:
# Cilium: OK
# NodeMonitor: OK
# Hubble: OK (if enabled)
# KubeProxyReplacement: Strict
# Encryption: WireGuard (if configured)
```

## Step 2: Validate Per-Node Agent Status

```bash
# Check all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Validate each agent individually
for pod in $(kubectl get pods -n kube-system -l k8s-app=cilium -o name); do
  echo "=== $pod ==="
  kubectl exec -n kube-system $pod -- cilium status 2>/dev/null | grep -E "Cilium|KubeProxy|Controller"
done
```

## Step 3: Validate Endpoint Count

```bash
# Check how many endpoints are managed
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Count should match number of running pods
CILIUM_ENDPOINTS=$(kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep -c "ready")
RUNNING_PODS=$(kubectl get pods --all-namespaces --field-selector=status.phase=Running -o name | wc -l)

echo "Cilium endpoints: $CILIUM_ENDPOINTS"
echo "Running pods: $RUNNING_PODS"
# These should be close (some pods may use host networking)
```

## Step 4: Validate Policy Enforcement

```bash
# Check controller errors (should be 0)
kubectl exec -n kube-system ds/cilium -- cilium status | grep -i "controller"

# Check for policy-related errors
kubectl exec -n kube-system ds/cilium -- cilium policy get 2>&1 | grep -i error

# Verify BPF programs are loaded
kubectl exec -n kube-system ds/cilium -- cilium bpf policy get --all | grep -c "OK"
```

## Step 5: Validate Network Connectivity

```bash
# Run the full connectivity test suite
cilium connectivity test

# Or a quick subset
cilium connectivity test --test pod-to-pod
cilium connectivity test --test pod-to-service
cilium connectivity test --test pod-to-external
```

## Step 6: Validation Script

```bash
#!/bin/bash
# validate-cilium.sh - Check Cilium health
set -e

echo "=== Cilium Status ==="
cilium status || { echo "FAIL: cilium status returned error"; exit 1; }

echo "=== Pod Status ==="
NOT_RUNNING=$(kubectl get pods -n kube-system -l k8s-app=cilium --field-selector=status.phase!=Running -o name | wc -l)
if [ "$NOT_RUNNING" -gt 0 ]; then
  echo "FAIL: $NOT_RUNNING Cilium pods not running"
  exit 1
fi

echo "=== Endpoint Health ==="
ERRORS=$(kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep -c "not-ready" || true)
if [ "$ERRORS" -gt 0 ]; then
  echo "WARN: $ERRORS endpoints not ready"
fi

echo "=== All checks passed ==="
```

## Defining Healthy State

| Component | Healthy | Degraded | Unhealthy |
|-----------|---------|---------|-----------|
| All Cilium pods | Running | Some CrashLoop | Not scheduled |
| cilium status | OK | Some errors | Unavailable |
| Endpoints | All ready | Some not-ready | None ready |
| Connectivity test | All pass | Some fail | All fail |
| Controller errors | 0 | < 5 | > 5 |

## Conclusion

Validating Cilium status checks is an ongoing practice, not a one-time step. Establishing a baseline of what "healthy" means for your installation - specific pod counts, endpoint counts, connectivity test pass rates - gives you a foundation for automated monitoring and alerts. The validation script pattern shown here can be integrated into your infrastructure CI/CD pipeline, node startup validation, or periodic health checks.
