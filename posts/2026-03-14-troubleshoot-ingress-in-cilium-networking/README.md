# Troubleshooting Ingress in Cilium Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking

Description: Diagnose and resolve common issues with Cilium Ingress controller and Gateway API support for routing external HTTP/HTTPS traffic to cluster services using systematic debugging techniques and...

---

## Introduction

Troubleshooting ingress in cilium networking requires understanding how Cilium implements this feature and where failures can occur in the data path. Cilium provides a built-in Ingress controller and Gateway API implementation powered by Envoy. It handles external HTTP/HTTPS traffic routing to cluster services without requiring a separate third-party ingress controller. Cilium Ingress supports TLS termination and path-based routing, Gateway API adds features such as header manipulation, and both integrate with Cilium network policies for security.

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

Examine the Cilium data path for issues related to ingress in cilium networking:

```bash
# Check Cilium's BPF load-balancer maps
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg bpf lb list 2>/dev/null | head -20

# Monitor dropped packets in real time
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg monitor --type drop

# Check endpoint status for affected pods
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg endpoint list

# Verify current configuration
kubectl get ingressclass cilium 2>/dev/null && cilium config view | grep ingress

# Check Cilium metrics for anomalies
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg metrics list --match-pattern "drop|error|fail"
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
kubectl exec diag-pod -- curl -ks --max-time 5 https://kubernetes.default.svc:443 2>&1

# Test external connectivity
kubectl exec diag-pod -- curl -ks --max-time 5 https://1.1.1.1/cdn-cgi/trace 2>&1

# Check DNS resolution
kubectl exec diag-pod -- nslookup kubernetes.default

# Clean up
kubectl delete pod diag-pod
```

## Using Hubble for Flow Analysis

If Hubble is enabled, use it to trace traffic flows:

```bash
# Observe all flows related to a specific pod
kubectl exec -n kube-system ds/cilium -c cilium-agent -- hubble observe --pod default/diag-pod --last 20

# Filter for dropped flows
kubectl exec -n kube-system ds/cilium -c cilium-agent -- hubble observe --verdict DROPPED --last 20

# Filter by protocol
kubectl exec -n kube-system ds/cilium -c cilium-agent -- hubble observe --protocol tcp --last 20

# Check for policy-related drops
kubectl exec -n kube-system ds/cilium -c cilium-agent -- hubble observe --verdict DROPPED -t policy-verdict --last 20
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
kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg endpoint list | grep -v "ready" | head -5

# Verify Cilium status
cilium status
```

## Troubleshooting

- **Cilium monitor shows no output**: The monitor may not be capturing traffic on the correct endpoint. Use `cilium-dbg monitor --related-to ENDPOINT_ID` to filter for a specific endpoint.
- **Hubble observe shows no flows**: Ensure Hubble is enabled in the Cilium configuration. Check with `cilium config view | grep hubble`.
- **BPF maps are full**: Check connection-tracking entries with `kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg bpf ct list | wc -l`. If approaching limits, increase the `bpf.ctTcpMax` and `bpf.ctAnyMax` Helm values.
- **Performance issues after configuration change**: Check datapath and proxy metrics with `kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg metrics list --match-pattern "drop|error|fail"` and inspect `cilium-dbg status --verbose` for failing controllers or proxy errors.

## Conclusion

Troubleshooting ingress in cilium networking follows a top-down approach: verify component health, inspect the data path, test specific connectivity paths, analyze flows with Hubble, and check node-level networking. The Cilium CLI and monitor tools provide deep visibility into the eBPF data path that standard Kubernetes tools cannot offer. Always verify your fix with the full connectivity test suite before closing the issue.
