# Securing Against Cilium Security Policy Limitations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security

Description: Learn how to identify and mitigate Cilium network policy limitations to build a more robust Kubernetes security posture. This guide covers practical workarounds for common Cilium constraints.

---

## Introduction

Cilium is a powerful eBPF-based networking and security solution for Kubernetes, but like any tool, it has specific limitations that security engineers must understand. Knowing these boundaries helps you design policies that are both effective and resilient.

Understanding Cilium's security policy limitations is critical for production environments. Without this knowledge, you may inadvertently leave gaps in your network security that attackers can exploit. This guide walks you through the key limitations and how to secure your cluster despite them.

In this post, we will cover the most common Cilium security limitations, provide practical workarounds, and show you how to layer additional controls to compensate for any gaps.

## Prerequisites

- A running Kubernetes cluster (v1.24+)
- Cilium installed (v1.14+) via Helm
- `cilium` CLI tool installed
- `kubectl` configured to access your cluster
- Basic understanding of Kubernetes NetworkPolicy concepts

## Understanding Cilium Security Limitations

Cilium network policies are powerful but have specific constraints you should be aware of when designing your security architecture.

### Limitation 1: Entity-Based Policies and External Traffic

Cilium uses identity-based security, which means traffic from outside the cluster may not always be properly identified. External traffic that does not pass through a Cilium-managed node may bypass identity resolution.

```yaml
# CiliumNetworkPolicy that restricts ingress to known entities
# Note: 'world' entity catches all external traffic
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: restrict-external-access
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: web-frontend
  ingress:
    - fromEntities:
        - cluster
    - fromCIDR:
        - 10.0.0.0/8
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

### Limitation 2: L7 Policy Inspection Overhead

Layer 7 policies require traffic to be redirected through an Envoy proxy, which adds latency. For high-throughput services, this overhead can be significant.

```bash
# Check current Envoy proxy resource usage across all Cilium agents
kubectl -n kube-system get pods -l k8s-app=cilium -o name | \
  xargs -I {} kubectl -n kube-system top pod {}

# Monitor the proxy redirect statistics
cilium status --verbose | grep -A 5 "Proxy"
```

### Limitation 3: DNS-Based Policies and TTL Caching

DNS-based policies rely on intercepting DNS queries. If a pod caches DNS results beyond the TTL or resolves DNS through a non-standard path, the policy may not apply correctly.

```yaml
# CiliumNetworkPolicy with DNS-based egress rules
# Ensure your pods use the cluster DNS server
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: dns-aware-egress
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
              - matchPattern: "*.example.com"
    - toFQDNs:
        - matchPattern: "*.example.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Implementing Compensating Controls

When Cilium limitations affect your security posture, implement additional layers of defense.

```yaml
# Deploy a default-deny policy as a baseline
# This ensures no traffic flows unless explicitly allowed
apiVersion: "cilium.io/v2"
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny-all
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
# Verify the default-deny policy is applied to all endpoints
cilium endpoint list -o json | \
  jq '.[].status.policy.realized.l4-ingress'

# Confirm that no unintended traffic is allowed
cilium monitor --type drop --output json | head -20
```

## Verification

After implementing these security controls, verify they are working as expected.

```bash
# Check that all policies are applied without errors
cilium policy get -o json | jq '.[] | .metadata.name'

# Test connectivity from a test pod to verify policies work
kubectl run test-pod --image=busybox --rm -it --restart=Never -- \
  wget --timeout=3 -q -O - http://web-frontend.production.svc.cluster.local

# Verify Cilium endpoint health
cilium endpoint health

# Check for policy drops in the monitor
cilium monitor --type drop
```

## Troubleshooting

- **Policies not taking effect**: Run `cilium endpoint list` to confirm endpoints have the expected identity labels assigned.
- **DNS policies failing**: Ensure all pods are using the cluster DNS by checking `/etc/resolv.conf` inside the pod.
- **High latency with L7 policies**: Check Envoy proxy resource usage and consider applying L7 policies only where strictly necessary.
- **Identity resolution failures**: Verify that `cilium identity list` shows the expected identities for your pods.

## Conclusion

Cilium provides excellent network security for Kubernetes, but understanding its limitations is essential for building a truly secure cluster. By implementing default-deny policies, layering compensating controls, and regularly verifying policy enforcement, you can mitigate the impact of these limitations. Always test your policies in a staging environment before deploying to production, and use Cilium's monitoring capabilities to detect any gaps in your security posture.
