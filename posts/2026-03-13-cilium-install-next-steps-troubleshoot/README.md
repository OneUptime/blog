# Troubleshooting Cilium Post-Installation Steps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A troubleshooting guide for common issues that arise during Cilium post-installation steps, including Hubble failures, policy issues, and connectivity test failures.

---

## Introduction

Post-installation steps for Cilium - enabling Hubble, deploying network policies, configuring encryption - can each introduce new failure modes. Troubleshooting these failures requires understanding what each step changes in the cluster and what can go wrong. This guide covers the most common post-installation troubleshooting scenarios with specific diagnostic commands.

The general troubleshooting principle for post-installation issues is regression isolation: identify which step introduced the problem by reverting or disabling it and testing connectivity. Cilium's modular design makes this practical - Hubble can be disabled without affecting networking, policies can be deleted to test baseline connectivity, and encryption can be disabled to isolate network issues.

## Prerequisites

- Cilium installed with some post-installation steps completed
- `kubectl` access with cluster-admin permissions
- Cilium CLI installed

## Troubleshooting: Connectivity Test Failures

```bash
# Run with verbose output to see specific failures

cilium connectivity test --verbose 2>&1 | tee /tmp/ct-output.log

# Identify which test scenarios fail
grep "FAIL\|ERROR" /tmp/ct-output.log

# Check if test namespace got cleaned up properly
kubectl get ns cilium-test
# If stale namespace exists, clean it up
kubectl delete ns cilium-test 2>/dev/null; sleep 5

# Re-run specific failing tests
cilium connectivity test --test pod-to-pod
```

## Troubleshooting: Hubble Not Starting

```bash
# Check Hubble relay pod
kubectl get pods -n kube-system -l k8s-app=hubble-relay
kubectl logs -n kube-system deploy/hubble-relay

# Check Hubble is enabled in Cilium configmap
kubectl get configmap -n kube-system cilium-config -o yaml | grep hubble

# Re-enable Hubble
cilium hubble enable

# Check Hubble relay service
kubectl get svc -n kube-system | grep hubble

# Test Hubble API access
hubble status -P
```

## Troubleshooting: Policy Breaking Connectivity

```bash
# Identify which policy is causing the problem
kubectl get CiliumNetworkPolicy --all-namespaces

# Temporarily remove suspect policy
kubectl delete CiliumNetworkPolicy -n policy-namespace suspect-policy-name

# Test connectivity
kubectl exec test-pod -- curl -s http://target-service

# If connectivity restores, the policy is the problem
# Fix the policy before re-applying

# Monitor drops to identify policy source
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type drop

# Monitor policy verdicts to identify the blocking rule
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type policy-verdict
```

## Troubleshooting: Encryption Issues

```bash
# Check encryption status
cilium encryption status

# If WireGuard:
kubectl exec -n kube-system ds/cilium -- wg show

# If IPsec:
kubectl exec -n kube-system ds/cilium -- ip xfrm state list

# Test connectivity with encryption
cilium connectivity test --test pod-to-pod-encryption

# If encryption is blocking traffic, temporarily disable it in Helm values or
# the Cilium ConfigMap, restart Cilium, and retest to isolate
cilium connectivity test
# If passes, re-enable with Helm values and investigate encryption config
helm upgrade cilium cilium/cilium --namespace kube-system --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
kubectl rollout restart daemonset/cilium -n kube-system
```

## Troubleshooting: Metrics Not Appearing

```bash
# Verify metrics port is listening
kubectl exec -n kube-system ds/cilium -- ss -tlnp | grep 9962

# Test metrics endpoint directly from within the pod
kubectl exec -n kube-system ds/cilium -- curl -s http://localhost:9962/metrics | head -20

# Check if Prometheus scrape config is correct
# The scrape target should be port 9962 on each Cilium pod
kubectl get pod -n kube-system -l k8s-app=cilium -o jsonpath='{.items[*].status.podIP}'
```

## Recovery Procedures

```bash
# Restart Cilium components (use with caution - may temporarily disrupt networking)
kubectl rollout restart daemonset/cilium -n kube-system
kubectl rollout restart deployment/cilium-operator -n kube-system

# Wait for rollout
kubectl rollout status daemonset/cilium -n kube-system

# Re-validate
cilium status
cilium connectivity test
```

## Conclusion

Post-installation issues in Cilium almost always fall into one of four categories: Hubble configuration failures, policy-induced connectivity breaks, encryption negotiation problems, or monitoring integration gaps. The troubleshooting approach for each is the same: isolate the change that introduced the problem, use `cilium-dbg monitor` to identify the specific failure, and fix the root cause rather than the symptom. Systematic isolation prevents wasted debugging time.
