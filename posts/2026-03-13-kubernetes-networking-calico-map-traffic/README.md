# How to Map Kubernetes Networking for Calico Users to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Networking, Traffic Flows, Pod Networking, BGP

Description: A concrete walkthrough of real Kubernetes traffic flows in a Calico cluster, connecting abstract networking concepts to observable packet paths and routing decisions.

---

## Introduction

Kubernetes networking concepts — pod IPs, service CIDRs, BGP routes — become meaningful when you trace a real packet through the system. Mapping these flows to what you can actually observe on nodes and in Calico resources transforms networking from theory into a debuggable system.

This post traces five real traffic scenarios through a Calico cluster, showing what happens at each hop, which Calico component is responsible, and what you can observe to verify the behavior. Each scenario builds on the previous one in complexity.

## Prerequisites

- A running Calico cluster with at least two nodes
- `kubectl` and `calicoctl` access
- SSH access to nodes for route table inspection

## Scenario 1: Pod Requests a DNS Name

Every Kubernetes workload starts with DNS. When a pod resolves `my-service.default.svc.cluster.local`:

```mermaid
sequenceDiagram
    participant Pod
    participant CoreDNS
    participant Calico

    Pod->>CoreDNS: DNS query (UDP to kube-dns ClusterIP)
    Note over Calico: Calico routes UDP to CoreDNS pod via service routing
    CoreDNS-->>Pod: DNS response (ClusterIP of my-service)
    Note over Calico: Return packet routed via conntrack
```

Calico is responsible for routing the UDP packet from the pod to the CoreDNS pod IP. Verify:
```bash
kubectl exec my-pod -- nslookup my-service.default.svc.cluster.local
```

## Scenario 2: Pod-to-Pod on the Same Node

```mermaid
graph LR
    PodA[Pod A\n192.168.1.4] -->|packet to 192.168.1.5| vethA[veth-pod-a]
    vethA --> HostNet[Host network stack]
    HostNet --> vethB[veth-pod-b]
    vethB --> PodB[Pod B\n192.168.1.5]
```

On the same node, traffic flows through veth pairs in the host network namespace. No encapsulation is used — it's direct kernel forwarding. Felix programs the route: `192.168.1.5 dev veth-pod-b scope link`.

```bash
# Verify on the node:
ip route show 192.168.1.5
# Output: 192.168.1.5 dev cali<hash> scope link
```

## Scenario 3: Pod-to-Pod Across Nodes (VXLAN mode)

```mermaid
graph LR
    PodA[Pod A\n192.168.1.4\nNode 1] -->|Raw packet| Node1[Node 1\n10.0.0.1]
    Node1 -->|VXLAN encap\nOuter: 10.0.0.1→10.0.0.2\nInner: 192.168.1.4→192.168.2.5| Node2[Node 2\n10.0.0.2]
    Node2 -->|Decap + deliver| PodB[Pod B\n192.168.2.5]
```

Felix programs a route on Node 1: `192.168.2.0/26 via 10.0.0.2 dev vxlan.calico`. The kernel encapsulates the packet in VXLAN (UDP/4789) and sends it to Node 2, which decapsulates and delivers to Pod B.

Verify the VXLAN route:
```bash
ip route show | grep vxlan.calico
```

## Scenario 4: Pod to ClusterIP Service

```mermaid
graph LR
    Pod[Pod\nRequests ClusterIP 10.96.0.1:80] --> DNAT[DNAT\niptables or eBPF]
    DNAT --> BackendPod[Backend Pod\n192.168.2.10:8080]
    BackendPod --> SNAT[SNAT\nReturn path]
    SNAT --> Pod
```

kube-proxy (iptables mode) or Calico eBPF intercepts the packet to the ClusterIP, selects a backend pod via load balancing, and rewrites the destination IP. Verify:
```bash
# iptables mode: inspect DNAT rules
sudo iptables -t nat -L KUBE-SERVICES -n | grep 10.96.0.1

# eBPF mode: inspect service map
sudo bpftool map dump name cali_v4_svc_ports | grep -A5 "10.96.0.1"
```

## Scenario 5: Pod Egress to the Public Internet

```mermaid
graph LR
    Pod[Pod\n192.168.1.4] --> Felix[Felix iptables SNAT\nSNAT to Node IP 10.0.0.1]
    Felix --> Internet[Public Internet]
    Internet --> Felix2[Return traffic\nDNAT back to 192.168.1.4]
    Felix2 --> Pod
```

With `natOutgoing: true` on the IPPool, Felix adds an iptables masquerade rule that translates the pod's RFC 1918 IP to the node's external IP for traffic destined outside the cluster CIDR.

```bash
sudo iptables -t nat -L CALICO-MASQ -n
```

## Best Practices

- Trace each scenario in your lab cluster to build intuition before production incidents
- Keep a network diagram with node IPs, pod CIDRs, service CIDR, and external CIDRs visible during incident response
- Use `tcpdump` at the veth interface to observe packets between a pod and the host network

## Conclusion

Mapping real traffic flows to Calico components — veth pairs, VXLAN tunnels, iptables DNAT rules, eBPF service maps — gives you a concrete mental model for debugging networking issues. Each flow is traceable from source to destination through observable artifacts on the node. Building this traceability into your team's troubleshooting workflow transforms networking incidents from mysterious to diagnosable.
