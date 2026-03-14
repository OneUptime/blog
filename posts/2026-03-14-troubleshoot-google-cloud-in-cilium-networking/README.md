# Troubleshooting Cilium on Google Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking

Description: Diagnose and resolve common issues with running Cilium networking on Google Cloud (GKE) including GKE dataplane v2 integration and VPC-native routing using systematic debugging techniques and Cilium diagnostic tools.

---

## Introduction

Troubleshooting cilium on google cloud requires understanding how Cilium implements this feature and where failures can occur in the data path. Google Cloud offers native Cilium integration through GKE Dataplane v2, which replaces kube-proxy with Cilium. When running Cilium on GKE, you get eBPF-based networking that integrates with VPC-native pod addressing, Cloud NAT for egress, and Google Cloud network policies. You can also deploy Cilium manually on GCE-based clusters with native routing using VPC routes.

Issues in this area typically manifest as connectivity failures, unexpected traffic behavior, or performance degradation. The diagnostic approach starts with checking Cilium component health, then narrows down to the specific data path or configuration element that is failing.

This guide provides structured diagnostic steps using Cilium CLI tools, BPF debugging, and kernel-level inspection.

## Prerequisites

- A Kubernetes cluster with Cilium installed
- `kubectl` with cluster-admin access
- The Cilium CLI installed
- Basic familiarity with Linux networking tools
- Access to Cilium agent pods for debugging

## Checking Cilium Component Health

Start with a broad health check before diving into specific issues:

```bash
# Overall Cilium health status
cilium status --verbose

# Check for any Cilium pods that are not running
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium -o wide

# Look for recent errors in Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -iE "error|fail|warn"

# Check Cilium operator logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cilium-operator --tail=30
```

## Inspecting the Data Path

Examine the Cilium data path for issues related to cilium on google cloud:

```bash
# Check BPF program status
kubectl exec -n kube-system ds/cilium -- cilium bpf tunnel list 2>/dev/null | head -20

# Monitor dropped packets in real time
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop

# Check endpoint status for affected pods
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Verify current configuration
cilium config view | grep -E "gke|native|routing"

# Check Cilium metrics for anomalies
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep -iE "drop|error|fail"
```

## Analyzing Connectivity Issues

Test specific connectivity paths to isolate the problem:

```bash
# Deploy a diagnostic pod
kubectl run diag-pod --image=nicolaka/netshoot --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/diag-pod --timeout=60s

# Test pod-to-pod connectivity
kubectl exec diag-pod -- ping -c 3 $(kubectl get pod -l app=target -o jsonpath='{.items[0].status.podIP}') 2>/dev/null

# Test pod-to-service connectivity
kubectl exec diag-pod -- curl -s --max-time 5 http://kubernetes.default.svc:443 2>&1

# Test external connectivity
kubectl exec diag-pod -- curl -s --max-time 5 http://1.1.1.1 2>&1

# Check DNS resolution
kubectl exec diag-pod -- nslookup kubernetes.default

# Clean up
kubectl delete pod diag-pod
```

## Using Hubble for Flow Analysis

If Hubble is enabled, use it to trace traffic flows:

```bash
# Observe all flows related to a specific pod
kubectl exec -n kube-system ds/cilium -- hubble observe --pod default/diag-pod --last 20

# Filter for dropped flows
kubectl exec -n kube-system ds/cilium -- hubble observe --verdict DROPPED --last 20

# Filter by protocol
kubectl exec -n kube-system ds/cilium -- hubble observe --protocol tcp --last 20

# Check for policy-related drops
kubectl exec -n kube-system ds/cilium -- hubble observe --verdict DROPPED --type policy-verdict --last 20
```

## Checking Node-Level Networking

Inspect the underlying network configuration:

```bash
# Check network interfaces
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')   -it --image=nicolaka/netshoot -- ip link show

# Check routing table
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')   -it --image=nicolaka/netshoot -- ip route show

# Check iptables rules (if iptables mode is used)
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')   -it --image=nicolaka/netshoot -- iptables -t nat -L -n | head -30
```

## Verification

After resolving the issue, verify the fix:

```bash
# Run Cilium connectivity test
cilium connectivity test

# Verify no errors in logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=20 --since=5m | grep -c "error"

# Check endpoint health
cilium endpoint list | grep -v "ready" | head -5

# Verify Cilium status
cilium status
```

## Troubleshooting

- **Cilium monitor shows no output**: The monitor may not be capturing traffic on the correct endpoint. Use `cilium monitor --related-to ENDPOINT_ID` to filter for a specific endpoint.
- **Hubble observe shows no flows**: Ensure Hubble is enabled in the Cilium configuration. Check with `cilium config view | grep hubble`.
- **BPF maps are full**: Check map sizes with `cilium bpf ct list global | wc -l`. If approaching limits, increase conntrack table size in Helm values.
- **Performance issues after configuration change**: Check if BPF program complexity has increased. Use `cilium bpf prog list` to see loaded programs and their complexity.

## Conclusion

Troubleshooting cilium on google cloud follows a top-down approach: verify component health, inspect the data path, test specific connectivity paths, analyze flows with Hubble, and check node-level networking. The Cilium CLI and monitor tools provide deep visibility into the eBPF data path that standard Kubernetes tools cannot offer. Always verify your fix with the full connectivity test suite before closing the issue.
