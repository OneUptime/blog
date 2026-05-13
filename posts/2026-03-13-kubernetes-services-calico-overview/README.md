# How to Understand Kubernetes Services with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Service, CNI, Networking, Kube-proxy, eBPF, ClusterIP

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
| ExternalName | DNS CNAME only, no proxying | Policy applies to the resolved external traffic |

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

Calico stores service frontends and backends in BPF maps and handles service load balancing in eBPF, including source-side connect-time load balancing for supported connections. This avoids kube-proxy's iptables/IPVS service path and uses BPF maps instead of the kernel conntrack table for service connection state, reducing overhead and improving performance.

## Writing NetworkPolicy for Service Traffic

An important nuance: NetworkPolicy rules matching a Service ClusterIP do NOT work as intended for pod-to-service traffic. By the time Calico evaluates policy, the packet is matched against the selected backend pod IP. For ingress policy on the backend pod, the packet's source IP is the client pod's IP, not the ClusterIP.

Use pod selector-based policies instead:

```yaml
# Wrong: Service CIDRs do not identify the client pods in policy evaluation

ingress:
- from:
  - ipBlock:
      cidr: 10.96.0.0/12  # Service CIDR - this does not match the client pod source

# Correct: Use pod selectors to select the actual source pods
ingress:
- from:
  - podSelector:
      matchLabels:
        app: client
```

## Calico eBPF: Service Load Balancing Behavior

Calico eBPF implements Kubernetes Service semantics without kube-proxy:
- **Service backend selection**: Uses BPF maps for service frontends and backends, with basic load balancing for ClusterIP services
- **Session affinity**: Supported for "sticky" services such as `service.spec.sessionAffinity: ClientIP`

With eBPF mode, Calico also supports:
- **Direct Server Return (DSR)**: For external service traffic when DSR is enabled and the underlying network supports it, the backend pod can respond directly without returning via the node that received the request
- **Source IP preservation**: External clients see their actual source IP at the backend pod in the eBPF service path

## NetworkPolicy on Service Endpoints

When all backends of a service are blocked by NetworkPolicy, the service effectively becomes unreachable. This is intentional - policy applies to the endpoints, not the service VIP. Use `calicoctl get workloadendpoints` to verify which policies apply to service backend pods.

## Best Practices

- In eBPF mode, verify kube-proxy is disabled before relying on Calico for service routing
- Write ingress policy using pod selectors, not service ClusterIPs - the ClusterIP is never the observable source
- Use Calico service rules when you want policy to reference Kubernetes Service names directly
- Use `externalTrafficPolicy: Local` for LoadBalancer services when client source IP preservation is required (iptables mode)
- Monitor service endpoint health separately from pod health - a pod can be running but removed from service endpoints

## Conclusion

Calico integrates with Kubernetes Services either alongside kube-proxy (iptables mode) or replacing it entirely (eBPF mode). Policy is always enforced against pod IPs, not service ClusterIPs. Understanding this distinction - that ClusterIPs are virtual addresses that are resolved before policy evaluation - is essential for writing correct ingress and egress policies for service traffic.
