# How to Explain Kubernetes Services with Calico to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Services, CNI, Team Communication, kube-proxy, Networking

Description: A practical guide for explaining Kubernetes service networking with Calico to engineering teams, focusing on how ClusterIPs work and how policy applies to service traffic.

---

## Introduction

Kubernetes Services are the first networking concept most developers learn, but the interaction between services and network policy is one of the most misunderstood areas of Kubernetes networking. Developers often assume they can write NetworkPolicy against a service's ClusterIP — and are confused when it doesn't work as expected.

Explaining service networking with Calico to your team requires clarifying the relationship between service VIPs, pod IPs, and policy enforcement. This post gives you the analogies and live demonstrations to make that clear.

## Prerequisites

- A Calico cluster with at least one service deployed
- `kubectl` access for live demonstrations
- A test client pod for connectivity testing

## The Core Concept: Services as Virtual Addresses

Start with the fundamental service concept:

> "A Kubernetes Service ClusterIP is a virtual IP address. It is never assigned to any physical interface. When traffic is sent to a ClusterIP, the networking layer (kube-proxy or Calico eBPF) intercepts the packet and translates the destination to an actual pod IP before the packet is delivered."

The practical implication for policy:

> "By the time Calico's network policy evaluates an ingress packet on a backend pod, the source is the client pod's IP — not the service ClusterIP. The ClusterIP is gone from the packet. This is why you cannot write ingress policy matching on a ClusterIP as a source."

## Live Demonstration: Service Traffic Source IP

Show your team what IP the backend pod actually sees as the source:

```bash
# Deploy a simple echo server as backend
kubectl run backend --image=ealen/echo-server --port=8080
kubectl expose pod backend --name=backend-svc --port=80 --target-port=8080

# Deploy a client pod
kubectl run client --image=nicolaka/netshoot -- sleep 3600

# Have the client send traffic via the service ClusterIP
SVC_IP=$(kubectl get svc backend-svc -o jsonpath='{.spec.clusterIP}')
kubectl exec client -- curl -s http://$SVC_IP/api/request | jq '.request.headers'
```

The echo server response will show the client's pod IP as the source — not the service ClusterIP. This makes the policy implication concrete.

## Explaining kube-proxy vs. Calico eBPF

For developers, frame the difference in terms of the result, not the mechanism:

| Feature | kube-proxy (iptables) | Calico eBPF |
|---|---|---|
| Service routing | Yes | Yes |
| Source IP for NodePort | Node IP (Cluster mode) | Original client IP |
| Performance at scale | Degrades with rule count | Constant (hash map) |
| Observability | iptables -L | bpftool map dump |

The key developer benefit of Calico eBPF: accurate source IPs in application logs for external traffic, without needing `externalTrafficPolicy: Local`.

## Explaining Service Network Policy

Developers often ask: "Can I write a policy that allows traffic from my service but blocks direct pod-to-pod traffic?"

The honest answer is: not directly, because services don't exist at the packet level. But you can achieve the same effect differently:

**Method 1**: Allow from the specific client pod labels that are the only callers of the service.

**Method 2**: For NodePort/LoadBalancer services, use `externalTrafficPolicy: Local` and write ingress policy matching on the node's IP range.

```yaml
# Allow ingress from client pods that use the service
ingress:
- from:
  - podSelector:
      matchLabels:
        role: api-client
```

## Explaining Headless Services

Headless services (with `clusterIP: None`) are simpler from a networking perspective — they return pod IPs directly in DNS responses, with no virtual IP and no kube-proxy DNAT:

```bash
# DNS lookup for a headless service returns pod IPs directly
kubectl exec client -- nslookup headless-svc.default.svc.cluster.local
# Returns: individual pod IPs, not a single ClusterIP
```

For headless services, Calico policy works exactly as for direct pod-to-pod traffic, because the traffic actually goes directly to pod IPs.

## Best Practices

- Document for your team: "Never use ClusterIP as a source in ingress NetworkPolicy from clauses"
- Show the echo server source IP demonstration to every developer who writes NetworkPolicy
- Use headless services for stateful applications where clients need to connect to specific pods

## Conclusion

The most important concept for explaining Kubernetes Services with Calico is that ClusterIPs are virtual — they are resolved to pod IPs before Calico's policy enforcement sees the packet. Writing policy for service traffic means writing policy against the actual pod identities (source pod labels), not the virtual service address. Once teams internalize this, most service-related policy confusion disappears.
