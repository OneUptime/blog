# Validating Cilium Installation Next Steps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: A validation guide for verifying each post-installation step for Cilium is working correctly, from connectivity tests to Hubble observability to policy enforcement.

---

## Introduction

After completing each Cilium post-installation step, validation is essential to confirm the change worked as expected. Without systematic validation, you may proceed to the next step while the previous one is silently broken, creating a confusing state where multiple issues interact. This guide provides specific validation commands for each post-installation step, with expected outputs that define success.

Validation is not just a one-time checklist. Each time you make a configuration change to Cilium - upgrading a version, enabling a new feature, modifying a policy - re-running the relevant validations confirms the change had the intended effect. Automating these validations in a CI/CD pipeline creates a safety net for ongoing operations.

## Prerequisites

- Cilium installed and initial steps completed
- Cilium CLI installed
- `kubectl` configured

## Validate: Connectivity Test

```bash
# Run full connectivity test suite
cilium connectivity test

# Validate specific scenarios
cilium connectivity test --test pod-to-pod
cilium connectivity test --test pod-to-service
cilium connectivity test --test pod-to-external

# Expected: all tests pass (0 failures)
# Success criteria: "x/x tests passed"
```

## Validate: Hubble Enablement

```bash
# Check Hubble is enabled in status
cilium status | grep -E "Hubble|hubble"
# Expected: "Hubble Relay:    OK"

# Verify Hubble relay pod is running
kubectl get pods -n kube-system -l k8s-app=hubble-relay
# Expected: Running

# Test Hubble connectivity
cilium hubble port-forward &
hubble status
# Expected: Hubble is healthy

# Verify flows are being collected
hubble observe --last 10
# Expected: recent flows from cluster
```

## Validate: Network Policy Enforcement

```bash
# After applying a policy, verify enforcement mode changed
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | \
  grep "policy-enforcement"
# Expected: "always" for endpoints with policies applied

# Verify the policy is loaded
kubectl exec -n kube-system ds/cilium -- cilium policy get
# Expected: your policy rules listed

# Run policy trace to confirm behavior
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:client-pod \
  --dst-k8s-pod default:server-pod \
  --dport 8080
# Expected: "Final verdict: ALLOWED/DENIED" as expected
```

## Validate: Prometheus Metrics

```bash
# Port-forward to Cilium metrics endpoint
kubectl port-forward -n kube-system ds/cilium 9962:9962 &

# Check metrics are being exported
curl -s http://localhost:9962/metrics | grep -c "cilium_"
# Expected: >100 metric families

# Check Hubble metrics
kubectl port-forward -n kube-system deploy/hubble-relay 4245:4245 &
# Or via ServiceMonitor if Prometheus operator is configured
```

## Validate: Encryption

```bash
# Check encryption status
kubectl exec -n kube-system ds/cilium -- cilium status | grep Encryption
# Expected: "Encryption: WireGuard" or "Encryption: IPsec"

# Verify encrypted traffic (WireGuard)
kubectl exec -n kube-system ds/cilium -- cilium encrypt status
# Expected: interface active, keys installed

# Run connectivity test with encryption validation
cilium connectivity test --test encryption
```

## Validate: IPAM

```bash
# Verify all nodes have CiliumNode objects
kubectl get CiliumNode
# Expected: one entry per node

# Verify CIDR allocations are non-overlapping
kubectl get CiliumNode -o jsonpath='{.items[*].spec.ipam.podCIDRs[*]}' | tr ' ' '\n' | sort

# Check IPAM pool utilization
kubectl exec -n kube-system ds/cilium -- cilium ip list
```

## Automated Validation Script

```bash
#!/bin/bash
# validate-post-install.sh
set -e

echo "1. Testing connectivity..."
cilium connectivity test --test pod-to-pod || { echo "FAIL: connectivity"; exit 1; }

echo "2. Checking Hubble..."
cilium status | grep -q "Hubble Relay.*OK" || { echo "FAIL: Hubble"; exit 1; }

echo "3. Checking metrics..."
kubectl port-forward -n kube-system ds/cilium 9962:9962 &
PF_PID=$!
sleep 2
curl -sf http://localhost:9962/metrics | grep -q "cilium_" || { echo "FAIL: metrics"; kill $PF_PID; exit 1; }
kill $PF_PID

echo "All validations passed!"
```

## Conclusion

Systematic validation after each Cilium post-installation step is the difference between a deployment you are confident in and one you are hoping works correctly. The commands in this guide define clear success criteria for each step and can be automated into CI/CD pipelines. Run these validations after initial installation, after upgrades, and after significant configuration changes.
