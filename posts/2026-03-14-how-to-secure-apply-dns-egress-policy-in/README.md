# Securing DNS Egress Policies in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, DNS

Description: Learn how to secure DNS egress traffic with Cilium network policies. This guide covers best practices for restricting outbound DNS queries and preventing data exfiltration through DNS tunneling.

---

## Introduction

DNS egress policies are a fundamental component of Kubernetes network security. Unrestricted DNS access can serve as a vector for data exfiltration, command-and-control communication, and unauthorized service discovery. Cilium provides powerful DNS-aware egress controls that go beyond simple IP-based filtering.

By leveraging Cilium's DNS proxy, you can create policies that restrict which domains your pods are allowed to resolve, effectively limiting outbound connectivity to approved destinations only. This provides a significant security improvement over traditional network policies.

This guide walks you through implementing secure DNS egress policies with Cilium, including practical examples for common scenarios.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium (v1.14+)
- Cilium DNS proxy enabled (enabled by default)
- `cilium` CLI and `kubectl` installed
- Hubble for traffic observation
- Basic understanding of DNS and CiliumNetworkPolicy

## Configuring DNS-Aware Egress Policies

Cilium intercepts DNS queries at the pod level, allowing you to create fine-grained egress rules based on domain names.

### Step 1: Allow DNS Resolution to Cluster DNS Only

```yaml
# First, ensure all pods can only resolve DNS through kube-dns
# This prevents pods from using external DNS servers to bypass policies
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: restrict-dns-to-cluster
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  egress:
    # Allow DNS queries only to kube-dns
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
              # Only allow resolution of specific domains
              - matchPattern: "*.production.svc.cluster.local"
              - matchName: "api.external-service.com"
              - matchName: "metrics.datadog.com"
```

### Step 2: Restrict Egress to Resolved FQDNs

```yaml
# After DNS resolution, allow traffic only to the resolved IPs
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: fqdn-egress-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  egress:
    # Allow DNS to kube-dns
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
    # Allow HTTPS to the resolved FQDN
    - toFQDNs:
        - matchName: "api.external-service.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

### Step 3: Preventing DNS Tunneling

DNS tunneling encodes data in DNS queries. Mitigate this by limiting query types and monitoring query patterns.

```bash
# Monitor DNS queries for suspicious patterns
hubble observe --protocol dns --namespace production --output json | \
  jq '.flow | select(.l7.dns.qtypes != ["A", "AAAA"]) | {
    src: .source.labels,
    query: .l7.dns.query,
    qtype: .l7.dns.qtypes
  }'

# Check the FQDN cache for unexpected entries
cilium fqdn cache list -o json | \
  jq '.[] | select(.fqdn | test("suspicious|unusual") )'
```

## Monitoring DNS Egress with Hubble

```bash
# Observe all DNS egress traffic in real time
hubble observe --protocol dns --namespace production --output compact

# Filter for denied DNS queries
hubble observe --protocol dns --verdict DROPPED --namespace production

# Get statistics on DNS query destinations
hubble observe --protocol dns --last 1000 --output json | \
  jq -r '.flow.l7.dns.query' | sort | uniq -c | sort -rn | head -20
```



### Network Segmentation Best Practices

Effective network segmentation goes beyond individual policies. Consider organizing your workloads into security zones based on their sensitivity level and communication requirements.

```bash
# Review all namespace labels for security zone classification
kubectl get namespaces --show-labels

# Identify cross-namespace communication patterns
hubble observe --output json --last 500 | \
  jq '.flow | select(.source.namespace != .destination.namespace) | {
    src_ns: .source.namespace,
    dst_ns: .destination.namespace,
    port: (.l4.TCP.destination_port // .l4.UDP.destination_port)
  }' | sort | uniq -c | sort -rn

# Ensure each namespace has appropriate policy coverage
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  count=$(kubectl get cnp -n "$ns" --no-headers 2>/dev/null | wc -l)
  echo "Namespace $ns: $count policies"
done
```

When designing your segmentation strategy, ensure that each security zone has explicit ingress and egress policies. This defense-in-depth approach ensures that even if one layer of security is compromised, other layers continue to protect your workloads.

## Verification

```bash
# Verify DNS policies are active
cilium policy get -o json | \
  jq '.[] | select(.spec.egress[]?.toPorts[]?.rules.dns != null) | .metadata.name'

# Test that allowed DNS queries work
kubectl -n production exec deploy/api-service -- \
  nslookup api.external-service.com

# Test that unauthorized DNS queries are blocked
kubectl -n production exec deploy/api-service -- \
  nslookup unauthorized-domain.com

# Check FQDN cache is populated
cilium fqdn cache list
```

## Troubleshooting

- **DNS queries timing out**: Verify that the kube-dns endpoint selector matches your DNS pods. Check labels with `kubectl -n kube-system get pods -l k8s-app=kube-dns --show-labels`.
- **FQDN cache not populating**: Ensure the Cilium DNS proxy is intercepting queries. Check `cilium status --verbose | grep DNS`.
- **Pods cannot resolve cluster-internal services**: Add `matchPattern: "*.cluster.local"` to your DNS rules.
- **Policy not matching after DNS resolution**: FQDN-based egress rules require the DNS query to happen first. Ensure the DNS allow rule is in the same policy.

## Conclusion

Securing DNS egress with Cilium provides a robust layer of defense against data exfiltration and unauthorized outbound communication. By restricting DNS resolution to approved domains and limiting egress to resolved FQDNs only, you significantly reduce your attack surface. Combine these policies with Hubble monitoring to maintain continuous visibility into DNS traffic patterns and detect anomalies early.
