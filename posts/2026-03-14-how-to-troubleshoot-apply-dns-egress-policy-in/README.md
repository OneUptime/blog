# Troubleshooting DNS Egress Policies in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, DNS, Troubleshooting

Description: Step-by-step troubleshooting guide for DNS egress policy issues in Cilium. Learn to diagnose DNS resolution failures, FQDN cache problems, and policy enforcement gaps.

---

## Introduction

DNS egress policies in Cilium rely on intercepting DNS queries through the Cilium DNS proxy. When these policies malfunction, applications may lose connectivity to external services or, worse, security rules may not be enforced. Troubleshooting requires understanding the full DNS resolution path within Cilium.

Common issues include DNS timeout failures, FQDN cache inconsistencies, and mismatched policy selectors. This guide provides a structured approach to diagnosing each type of problem.

By mastering these troubleshooting techniques, you will be able to quickly restore DNS-based policy enforcement and maintain your security posture.

## Prerequisites

- Kubernetes cluster with Cilium (v1.14+) installed
- `cilium` CLI and Hubble CLI available
- `kubectl` access to the cluster
- DNS egress policies deployed
- Basic understanding of DNS resolution flow in Cilium

## Diagnosing DNS Resolution Failures

When pods cannot resolve DNS names, start by identifying where in the resolution path the failure occurs.

```bash
# Step 1: Check if the pod can reach kube-dns
kubectl -n production exec deploy/api-service -- \
  nslookup kubernetes.default.svc.cluster.local

# Step 2: Check Cilium DNS proxy status
cilium status --verbose | grep -A 10 "DNS"

# Step 3: Verify the DNS proxy is intercepting queries
hubble observe --protocol dns --namespace production --last 50 --output compact

# Step 4: Check for DNS-related policy drops
hubble observe --protocol dns --verdict DROPPED --namespace production --output json | \
  jq '.flow | {
    source: .source.labels,
    query: .l7.dns.query,
    verdict: .verdict,
    reason: .drop_reason_desc
  }'
```

### Checking DNS Proxy Configuration

```bash
# Verify DNS proxy is enabled in Cilium config
cilium config view | grep -i dns

# Check that the DNS proxy listener is active
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium status --verbose | grep "proxy"

# View DNS proxy statistics
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium metrics list | grep dns
```

## Resolving FQDN Cache Issues

The FQDN cache maps domain names to IP addresses. If this cache is stale or empty, FQDN-based egress rules will not match.

```bash
# List all entries in the FQDN cache
cilium fqdn cache list

# Check cache for a specific domain
cilium fqdn cache list | grep "api.external-service.com"

# Force a DNS lookup to refresh the cache
kubectl -n production exec deploy/api-service -- \
  nslookup api.external-service.com

# Verify the cache was updated
cilium fqdn cache list | grep "api.external-service.com"
```

```yaml
# Common mistake: DNS rule and FQDN rule in separate policies
# They MUST be in the same policy for FQDN resolution to work
# CORRECT approach - single policy with both rules:
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: combined-dns-fqdn
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchName: "api.external-service.com"
    - toFQDNs:
        - matchName: "api.external-service.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Debugging Policy Selector Mismatches

```bash
# Verify endpoint labels match policy selectors
kubectl -n production get pods --show-labels

# Check which policies apply to a specific endpoint
cilium endpoint list -o json | \
  jq '.[] | select(.status.labels.id | any(contains("app=api-service"))) | {
    id: .id,
    policy_ingress: .status.policy.realized."l4-ingress",
    policy_egress: .status.policy.realized."l4-egress"
  }'

# Look for policy computation errors
kubectl -n kube-system logs ds/cilium -c cilium-agent | \
  grep -i "policy.*error\|failed.*policy"
```

## Using Hubble for DNS Flow Analysis

```bash
# Create a comprehensive DNS flow analysis
hubble observe --protocol dns --namespace production --last 200 --output json | \
  jq '{
    timestamp: .time,
    source: .flow.source.labels,
    query: .flow.l7.dns.query,
    rcode: .flow.l7.dns.rcode,
    ips: .flow.l7.dns.ips,
    verdict: .flow.verdict
  }'

# Check for NXDOMAIN responses that might indicate misconfigured domain names
hubble observe --protocol dns --output json | \
  jq 'select(.flow.l7.dns.rcode == 3) | .flow.l7.dns.query'
```

## Verification

```bash
# Comprehensive verification after troubleshooting
# 1. DNS resolution works
kubectl -n production exec deploy/api-service -- nslookup api.external-service.com

# 2. FQDN cache is populated
cilium fqdn cache list | grep "api.external-service.com"

# 3. Egress to the FQDN-resolved IP works
kubectl -n production exec deploy/api-service -- \
  curl -s -o /dev/null -w "%{http_code}" https://api.external-service.com

# 4. No unexpected drops
hubble observe --namespace production --verdict DROPPED --last 20
```

## Troubleshooting

- **DNS proxy not intercepting queries**: Restart the Cilium agent pods with `kubectl -n kube-system rollout restart ds/cilium` and verify the proxy restarts.
- **FQDN cache expires too quickly**: Check the TTL values in DNS responses. Cilium respects the TTL from the upstream DNS server.
- **Multiple Cilium agents have different FQDN caches**: This is expected behavior since each agent caches independently. Ensure all nodes have consistent policies.
- **DNS works but FQDN egress fails**: Verify the FQDN rule port matches the application's destination port.

## Conclusion

DNS egress troubleshooting in Cilium requires understanding the interaction between the DNS proxy, FQDN cache, and egress policy rules. The most common issues stem from split DNS/FQDN policies, stale caches, or misconfigured endpoint selectors. By using Hubble for flow analysis and the Cilium CLI for cache inspection, you can quickly isolate and resolve DNS egress policy problems.
