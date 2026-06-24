# How to Cilium IPv6 Network Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, IPv6, Kubernetes, NetworkPolicy, CiliumNetworkPolicy, Security

Description: Configure Cilium CiliumNetworkPolicy and CiliumClusterWideNetworkPolicy for fine-grained IPv6 traffic control in Kubernetes.

## Introduction

Configure Cilium CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy for fine-grained IPv6 traffic control in Kubernetes. This guide covers the essential configuration, manifest patterns, and verification steps. Your cluster must already be running IPv6 or dual-stack networking, and CIDR-based IPv6 rules should be used for external or otherwise unmanaged peers.

## Step 1: Prerequisites and Setup

```bash
# Confirm the cluster is running IPv6 or dual-stack networking
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDRs}{"\n"}{end}'
kubectl get svc kubernetes -o jsonpath='{.spec.clusterIPs}{"\t"}{.spec.ipFamilies}{"\n"}'

# Confirm Cilium and the policy CRDs are installed
cilium status --wait
kubectl get crd ciliumnetworkpolicies.cilium.io ciliumclusterwidenetworkpolicies.cilium.io
```

## Step 2: Core Implementation

Use a `CiliumNetworkPolicy` when the rule is namespace-scoped. For cluster-internal pod-to-pod traffic, prefer label selectors such as `fromEndpoints` and `toEndpoints`; the IPv6 CIDR example below is for external or unmanaged sources:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ipv6-client-to-api
  namespace: default
spec:
  description: Allow only the trusted IPv6 subnet to reach the API pods on TCP/8080
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromCIDRSet:
        - cidr: 2001:db8:100::/64
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

## Step 3: Configuration

```yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-ipv6-egress
spec:
  description: Allow DNS and outbound HTTPS to approved IPv6 ranges for application pods
  endpointSelector:
    matchExpressions:
      - key: io.kubernetes.pod.namespace
        operator: NotIn
        values:
          - kube-system
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
          rules:
            dns:
              - matchPattern: "*"
    - toCIDRSet:
        - cidr: 2001:db8:200::/48
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Step 4: Apply and Verify

```bash
# Save the manifests from Steps 2 and 3, then apply them
kubectl apply -f ipv6-ingress-policy.yaml
kubectl apply -f ipv6-clusterwide-egress-policy.yaml

# Confirm the policies were accepted by the API server
kubectl get ciliumnetworkpolicies.cilium.io -n default
kubectl get ciliumclusterwidenetworkpolicies.cilium.io

# Exercise an IPv6 path from a client pod
kubectl exec deployment/client -- curl -6 --fail http://api.default.svc.cluster.local:8080/health
```

## Step 5: Monitoring

```bash
# Stream dropped flows from a Cilium agent pod
kubectl -n kube-system exec ds/cilium -- hubble observe --verdict DROPPED

# Inspect the applied policies
kubectl describe ciliumnetworkpolicies.cilium.io allow-ipv6-client-to-api -n default
kubectl describe ciliumclusterwidenetworkpolicies.cilium.io allow-ipv6-egress
```

## Conclusion

Cilium IPv6 network policies require a cluster with IPv6 or dual-stack networking already enabled. Use `CiliumNetworkPolicy` for namespace-scoped rules and `CiliumClusterwideNetworkPolicy` for cluster-scoped rules, expressing external IPv6 peers through `fromCIDR`, `fromCIDRSet`, `toCIDR`, or `toCIDRSet`. Remember that once a policy selects an endpoint and contains an ingress or egress section, that endpoint enters default-deny mode for that direction. Monitor policy verdicts with Hubble to confirm that allowed and denied IPv6 flows match expectations.
