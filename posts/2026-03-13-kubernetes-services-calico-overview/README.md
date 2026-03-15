# How to Understand Kubernetes Services with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Services, CNI, Networking, kube-proxy, eBPF, ClusterIP

Description: A comprehensive guide to how Calico integrates with Kubernetes Services, covering ClusterIP routing, kube-proxy replacement, and service policy enforcement.

---

## Introduction

Kubernetes Services are the standard mechanism for stable network access to a set of pods. While Services are a Kubernetes API resource, their implementation at the network layer involves either kube-proxy or Calico's eBPF replacement - both of which interact with Calico's pod networking and policy enforcement.

Understanding how Calico integrates with Services requires understanding both the service routing mechanism (how ClusterIPs get translated to pod IPs) and how Calico's network policy applies to service traffic. This post covers the full integration between Calico and Kubernetes Services.

## Prerequisites

- Understanding of Kubernetes Service types (ClusterIP, NodePort, LoadBalancer)
- Basic familiarity with kube-proxy and iptables
- Understanding of Calico's networking model

## Service Types and Calico's Role

Calico's role differs depending on the service type:

| Service Type | kube-proxy Role | Calico Role |
|---|---|---|
| ClusterIP | DNAT ClusterIP → PodIP | Policy enforcement on pod |
| NodePort | DNAT NodePort → PodIP | Policy enforcement, optional SNAT |
| LoadBalancer | Depends on cloud provider | Policy enforcement |
| ExternalName | DNS CNAME only | Policy can match on DNS |

In iptables mode, kube-proxy manages service routing and Calico manages policy. In eBPF mode, Calico manages both.

## ClusterIP Routing with kube-proxy (iptables mode)

When a pod sends traffic to a ClusterIP, kube-proxy's iptables rules intercept the packet and DNAT it to one of the service's backend pod IPs:

```mermaid
graph LR
    Pod[Client Pod] --> PREROUTING[iptables PREROUTING]
    PREROUTING --> KUBE[KUBE-SERVICES chain]
    KUBE --> DNAT[DNAT: ClusterIP → PodIP]
    DNAT --> Calico[Calico policy enforcement]
    Calico --> Backend[Backend Pod]
```

The Calico policy is evaluated against the pod IP (after DNAT), not the ClusterIP. This has an important implication: NetworkPolicy `from` selectors work on the actual source pod identity, not the service IP.

## ClusterIP Routing with Calico eBPF

In eBPF mode, Calico replaces kube-proxy entirely:

```mermaid
graph LR
    Pod[Client Pod] --> TCEgress[TC Egress Hook]
    TCEgress --> ServiceMap[eBPF Service Map\nClusterIP → PodIP]
    ServiceMap --> Backend[Backend Pod]
```

The service DNAT happens in the eBPF program at the sending pod's TC egress hook. This eliminates the conntrack entry that kube-proxy creates in the kernel's connection tracking table, reducing memory usage and improving performance.

## Writing NetworkPolicy for Service Traffic

An important nuance: NetworkPolicy `from.ipBlock` matching on a ClusterIP does NOT work as intended. By the time Calico evaluates the ingress policy on the backend pod, the packet's source IP is the client pod's IP (after kube-proxy DNAT), not the ClusterIP.

Use pod selector-based policies instead:

```yaml
# Wrong: ClusterIP will never appear as a source in policy evaluation
ingress:
- from:
  - ipBlock:
      cidr: 10.96.0.0/12  # Service CIDR - this will never match pod traffic

# Correct: Use pod selectors to select the actual source pods
ingress:
- from:
  - podSelector:
      matchLabels:
        app: client
```

## Calico eBPF: Service Load Balancing Behavior

Calico eBPF implements the same load balancing algorithms as kube-proxy:
- **Random selection**: Default for ClusterIP services
- **Session affinity**: Supported via `service.spec.sessionAffinity: ClientIP`

With eBPF mode, Calico also supports:
- **Direct Server Return (DSR)**: For NodePort and LoadBalancer services, the backend pod can respond directly to the client without returning via the node that received the request
- **Source IP preservation**: External clients see their actual source IP at the backend pod

## NetworkPolicy on Service Endpoints

When all backends of a service are blocked by NetworkPolicy, the service effectively becomes unreachable. This is intentional - policy applies to the endpoints, not the service VIP. Use `calicoctl get workloadendpoints` to verify which policies apply to service backend pods.

## Best Practices

- In eBPF mode, verify kube-proxy is disabled before relying on Calico for service routing
- Write ingress policy using pod selectors, not service ClusterIPs - the ClusterIP is never the observable source
- Use `externalTrafficPolicy: Local` for LoadBalancer services when client source IP preservation is required (iptables mode)
- Monitor service endpoint health separately from pod health - a pod can be running but removed from service endpoints

## Conclusion

Calico integrates with Kubernetes Services either alongside kube-proxy (iptables mode) or replacing it entirely (eBPF mode). Policy is always enforced against pod IPs, not service ClusterIPs. Understanding this distinction - that ClusterIPs are virtual addresses that are resolved before policy evaluation - is essential for writing correct ingress and egress policies for service traffic.
