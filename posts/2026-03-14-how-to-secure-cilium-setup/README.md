# Securing Setup Configuration in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, Setup

Description: Learn how to secure Cilium setup in Cilium for Kubernetes. This guide covers practical hardening measures with real examples and commands.

---

## Introduction

Securing Cilium setup in Cilium is essential for maintaining a robust Kubernetes network security posture. Cilium leverages eBPF technology to provide deep visibility and control over network traffic, making it possible to enforce fine-grained security policies at the kernel level.

This guide focuses on practical steps to harden your installation and configuration using CiliumNetworkPolicy resources. You will learn how to create policies that restrict access, implement defense-in-depth strategies, and verify that your security controls are working as intended.

Whether you are setting up a new cluster or hardening an existing one, these security practices will help you reduce your attack surface and protect your workloads from unauthorized access.

## Prerequisites

- A running Kubernetes cluster (v1.24+)
- Cilium installed (v1.14+) via Helm
- `cilium` CLI tool installed
- `kubectl` configured for cluster access
- Hubble enabled for network flow observation
- Basic understanding of Kubernetes networking concepts

## Understanding the Security Model

Before implementing security controls, it is important to understand how Cilium handles Cilium setup.

```mermaid
graph TD
    A[Identify Security Requirements] --> B[Define CiliumNetworkPolicy]
    B --> C[Apply Default-Deny Baseline]
    C --> D[Add Allow Rules for Legitimate Traffic]
    D --> E[Test with Hubble Monitoring]
    E --> F{Policies Working Correctly?}
    F -->|Yes| G[Deploy to Production]
    F -->|No| H[Analyze Dropped Flows]
    H --> D
```

### Initial Assessment

Run these commands to understand your current security posture:

```bash
# Verify Cilium is running and healthy
cilium status
```

```bash
# Check current policy enforcement mode
cilium config view | grep policy-enforcement
```

## Implementing Security Policies

Apply a CiliumNetworkPolicy to restrict access to your setup configuration resources.

```yaml
# Apply this policy to restrict access based on identity
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: initial-setup-policy
  namespace: default
spec:
  endpointSelector: {}
  ingress:
    - fromEntities:
        - health
  egress:
    - toEntities:
        - health
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
```

```bash
# Apply the policy to your cluster
kubectl apply -f policy.yaml

# Verify the policy was accepted
kubectl get cnp -n production
```

### Hardening with Default-Deny

Implement a default-deny baseline to ensure no traffic flows unless explicitly allowed:

```yaml
# Default-deny policy ensures zero-trust networking
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: default-deny-setup
  namespace: production
spec:
  endpointSelector: {}
  ingress: []
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
```

### Monitoring Security Events

```bash
# Monitor for policy-related drops in real time
hubble observe --verdict DROPPED --namespace production --output compact

# Check endpoint security status
# List all active policies
cilium policy get -o json | jq '.[].metadata.name'
```

## Advanced Security Configuration

For enhanced protection, consider these additional hardening measures:

```bash
# Enable policy enforcement in strict mode
# This is configured during Cilium installation via Helm
# helm upgrade cilium cilium/cilium --namespace kube-system \
#   --set policyEnforcementMode=always

# Verify the current enforcement mode
cilium config view | grep policy-enforcement

# List all identities and verify they match expected workloads
cilium identity list
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

After applying security controls, verify they are working correctly:

```bash
# Verify policy is applied
cilium endpoint list
```

```bash
# Test connectivity
cilium connectivity test
```

```bash
# Monitor for policy drops
cilium monitor --type drop --output json | head -20
```

## Troubleshooting

- **Policy not taking effect**: Verify endpoint labels match policy selectors with `cilium endpoint list -o json | jq '.[] | .status.labels'`.
- **Legitimate traffic blocked**: Check Hubble for specific drop reasons with `hubble observe --verdict DROPPED --namespace production`.
- **High latency after policy application**: L7 policies route through Envoy proxy. Consider using L3/L4 policies where L7 inspection is not needed.
- **Cilium agent errors**: Check agent logs with `kubectl -n kube-system logs ds/cilium -c cilium-agent --tail=50`.

## Conclusion

Securing Cilium setup in Cilium requires a layered approach: implement default-deny baselines, create specific allow policies for legitimate traffic, and continuously monitor with Hubble. By following the steps in this guide, you have established strong security controls for your setup configuration workloads. Remember to regularly review and update your policies as your application architecture evolves, and always test changes in a staging environment before applying them to production.
