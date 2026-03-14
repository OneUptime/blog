# How to Diagnose External API Access Failures from Calico Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, API Access, Egress

Description: Diagnose why Calico pods cannot reach external APIs by investigating egress network policies, DNS resolution, HTTPS connectivity, and NAT rules.

---

## Introduction

External API access failures from pods are a common support escalation. The root cause is often not immediately obvious because there are many layers that can block outbound HTTPS: a GlobalNetworkPolicy with no egress Allow rules, DNS resolution failures that prevent hostname resolution, HTTPS inspection proxies that are not trusted, or missing NAT rules that cause API servers to reject connections from non-routable pod IPs.

This post provides a systematic diagnostic approach that isolates each layer.

## Prerequisites

- Kubernetes cluster with Calico installed
- `kubectl` access with exec permissions
- A test pod with networking tools (`nicolaka/netshoot` image)

## Step 1: Test Each Layer of External API Access

Isolate whether the failure is at DNS, TCP, or HTTPS level.

```bash
# Create a diagnostic pod
kubectl run api-diag --image=nicolaka/netshoot --restart=Never -- sleep 3600
kubectl wait pod/api-diag --for=condition=Ready --timeout=60s

# Layer 1: Test DNS resolution of the API endpoint
kubectl exec api-diag -- nslookup api.example.com
# If this fails: DNS issue (check CoreDNS, check DNS egress policy)

# Layer 2: Test TCP connectivity on port 443
kubectl exec api-diag -- timeout 5 bash -c "echo > /dev/tcp/api.example.com/443" && \
  echo "TCP 443 reachable" || echo "TCP 443 BLOCKED"

# Layer 3: Test HTTPS handshake
kubectl exec api-diag -- curl -v --connect-timeout 5 \
  https://api.example.com 2>&1 | head -30
```

## Step 2: Check Egress Network Policies

A default-deny policy without an egress exception is the most common cause of external API access failures.

```bash
# Check for default-deny GlobalNetworkPolicies
calicoctl get globalnetworkpolicies -o yaml | \
  grep -B 5 -A 20 "policyTypes:"

# A policy with policyTypes including Egress but no egress rules creates an implicit deny
# Look for policies that apply to the failing pod's namespace and labels

# Check namespace-scoped NetworkPolicies for the pod
NAMESPACE="production"
kubectl get networkpolicies -n "${NAMESPACE}" -o yaml | \
  grep -A 30 "policyTypes:"
```

## Step 3: Verify DNS Egress Is Allowed

DNS queries go to UDP/TCP port 53. A default-deny policy that doesn't allow DNS egress will cause all hostname-based API calls to fail.

```bash
# Check if DNS port is in the egress rules
calicoctl get globalnetworkpolicies -o yaml | \
  grep -B 2 -A 5 "53"

# Test DNS from within the pod explicitly
kubectl exec api-diag -- dig @10.96.0.10 api.example.com  # CoreDNS ClusterIP

# Check CoreDNS is receiving queries
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20 | \
  grep "api.example.com"
```

## Step 4: Diagnose HTTPS-Specific Failures

If DNS and TCP work but HTTPS fails, the issue may be certificate validation or a proxy.

```bash
# Test with certificate validation disabled (for diagnosis only)
kubectl exec api-diag -- curl -k -v https://api.example.com 2>&1 | head -30
# If -k succeeds but normal doesn't: TLS certificate issue

# Check for a transparent proxy that intercepts HTTPS
kubectl exec api-diag -- \
  curl -v https://api.example.com 2>&1 | grep "issuer\|subject"
# If issuer is your corporate CA: proxy interception

# Test with explicit proxy configuration
kubectl exec api-diag -- \
  curl -x http://proxy.internal:3128 https://api.example.com
```

## Step 5: Verify NAT Is Correctly Applied

If the external API server requires connection from a specific IP range, pod IPs that bypass NAT may be rejected.

```bash
# Find what source IP the pod appears to use externally
kubectl exec api-diag -- curl -s https://ifconfig.me
# Should show node IP if NAT is working
# If shows pod IP: NAT is not applied - external API may reject it

# Check IP pool NAT setting
calicoctl get ippools -o yaml | grep natOutgoing

# Check iptables masquerade on the node
POD_NODE=$(kubectl get pod api-diag -o jsonpath='{.spec.nodeName}')
CALICO_POD=$(kubectl get pods -n calico-system -l app=calico-node \
  --field-selector spec.nodeName=${POD_NODE} -o name | head -1)
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -t nat -L cali-nat-outgoing -n
```

## Best Practices

- Always include explicit DNS (port 53) and HTTPS (port 443) egress allow rules when creating default-deny policies
- Test external API connectivity from new pods after any network policy changes
- Document which external APIs your pods need to reach and maintain corresponding egress allow rules
- Use OneUptime to monitor external API availability from synthetic probes that simulate pod traffic

## Conclusion

External API access failures from pods follow a predictable diagnostic path: check DNS resolution, TCP port reachability, HTTPS handshake, and NAT source IP translation in that order. The most common root cause is a default-deny GlobalNetworkPolicy that lacks explicit egress allow rules for DNS (UDP/TCP 53) and HTTPS (TCP 443).
