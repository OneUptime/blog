# Troubleshooting Cilium Connectivity Test Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Connectivity, Testing, EBPF

Description: A comprehensive guide to diagnosing and fixing failures in the Cilium connectivity test, covering common failure modes and their root causes.

---

## Introduction

The `cilium connectivity test` command runs a comprehensive suite of end-to-end networking tests that validate your Cilium installation. When these tests fail, the failure messages can be cryptic without context about what each test is verifying. Troubleshooting connectivity test failures requires understanding what the tests check, what infrastructure they deploy, and what diagnostics to collect when something goes wrong.

Connectivity test failures fall into a few broad categories: infrastructure failures (test pods cannot be scheduled), network policy failures (policies not enforced or incorrectly enforced), DNS failures, encryption failures, and environment-specific issues (node MTU mismatches, cloud provider restrictions). This guide covers the diagnostic approach for each category.

## Prerequisites

- Cilium installed on Kubernetes
- Cilium CLI installed
- `kubectl` access to the cluster with permissions to create pods and namespaces

## Step 1: Run the Test and Capture Output

```bash
# Run connectivity test with verbose output
cilium connectivity test --verbose 2>&1 | tee /tmp/connectivity-test.log

# Run only specific test scenarios to isolate failures
cilium connectivity test --test pod-to-pod-encryption
cilium connectivity test --test no-policies

# Run with increased timeout for slow clusters
cilium connectivity test --connect-timeout 30s --request-timeout 60s
```

## Step 2: Identify Failing Tests

```bash
# Parse test output for failures
grep -E "FAIL|ERROR|timeout" /tmp/connectivity-test.log

# Common failure patterns:
# "curl: (7) Failed to connect" - connectivity failure
# "timed out" - performance or policy issue
# "x/y completed" shows partial failures
```

## Step 3: Check Test Pod Status

```bash
# Check if test pods are running
kubectl get pods -n cilium-test

# If pods are pending, check scheduling issues
kubectl describe pod -n cilium-test echo-same-node | grep -A 20 "Events:"

# Delete stale test namespace if tests didn't clean up
kubectl delete namespace cilium-test
```

## Step 4: Diagnose Policy Failures

```bash
# Monitor drops while tests run
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop &

# Re-run connectivity test
cilium connectivity test --test no-policies

# Check policy enforcement mode
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep "policy-enforcement"
```

## Step 5: DNS Troubleshooting

```bash
# Test DNS from a pod
kubectl run dns-test --image=busybox --restart=Never -it --rm -- nslookup kubernetes

# Check CoreDNS status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check if Cilium DNS proxy is causing issues
kubectl exec -n kube-system ds/cilium -- cilium status | grep DNS
```

## Step 6: MTU Issues

```bash
# Check configured MTU
kubectl exec -n kube-system ds/cilium -- cilium status | grep -i mtu

# Check actual interface MTU
kubectl exec -n kube-system ds/cilium -- ip link show | grep mtu

# Node MTU
ip link show eth0 | grep mtu
```

## Step 7: Environment-Specific Issues

```bash
# For AWS: check security groups allow required ports
# For Azure: check NSG rules
# For GKE: check firewall rules

# Generate a sysdump after failure
cilium sysdump --output-filename connectivity-test-failure-$(date +%Y%m%d)
```

## Common Failures and Fixes

| Failure | Likely Cause | Fix |
|---------|-------------|-----|
| Pod-to-pod timeout | MTU mismatch | Align MTU across nodes |
| DNS resolution fails | CoreDNS not reached | Check DNS policy |
| Pod scheduling fails | Insufficient resources | Add nodes or increase limits |
| Policy tests fail | Policy audit mode | Check enforcement mode |
| Node-to-node fails | Firewall rules | Open required ports |

## Conclusion

Troubleshooting `cilium connectivity test` failures is a structured process of isolating the failure type, collecting targeted diagnostics, and addressing the root cause. The test suite is comprehensive enough that failures point directly to real networking issues rather than false positives. Resolving connectivity test failures builds confidence that your Cilium installation is correctly configured and ready for production workloads.
