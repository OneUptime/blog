# How to Understand L2 Interconnect Fabric with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, IP-in-IP, Overlay, CNI

Description: A comprehensive guide to Layer 2 networking with Calico, covering VXLAN overlay, IP-in-IP tunneling, and when L2 fabric is appropriate for Kubernetes cluster interconnect.

---

## Introduction

In Kubernetes networking, an interconnect fabric refers to the mechanism by which pods on different nodes communicate - specifically, whether the underlay can route pod IPs directly or whether overlay encapsulation is needed to carry pod traffic across the underlying network.

Calico supports overlay interconnect through two encapsulation modes: VXLAN (Virtual Extensible LAN) and IP-in-IP. Both modes create an overlay network that allows pod traffic to traverse underlay networks that don't know about pod IP addresses. This is a common approach for cloud environments where you cannot control the underlying network routing.

Understanding overlay interconnect in the context of Calico means understanding when and why overlay encapsulation is necessary, how VXLAN and IP-in-IP differ, and what tradeoffs each imposes.

## Prerequisites

- Understanding of the OSI model (Layer 2 vs. Layer 3)
- Basic knowledge of Ethernet framing and IP routing
- Familiarity with Calico's IPPool resource

## Why Overlay Encapsulation Exists

Many cloud VPC networks route traffic between VM instances based on the VM's IP address and are not automatically aware of Calico pod IPs. If a pod on Node 1 sends a packet to a pod IP on Node 2, the underlay network needs either routes for those pod IPs or an overlay packet that it can route using node IPs.

Overlay encapsulation solves this by wrapping the pod packet (inner packet) inside a packet that uses node IPs as the outer source and destination:

```mermaid
graph LR
    Inner[Inner packet\nSrc: 10.0.1.4 Pod\nDst: 10.0.2.5 Pod] --> Encap[Encapsulation]
    Encap --> Outer[Outer packet\nSrc: 172.16.1.1 Node\nDst: 172.16.2.1 Node]
    Outer --> VPC[VPC network\nRoutes node IPs]
```

The VPC sees the outer packet (node IPs) and routes it normally. On the destination node, the outer header is removed and the inner packet is delivered to the correct pod.

## VXLAN Mode

VXLAN (Virtual Extensible LAN) encapsulates Ethernet frames in UDP packets. Calico uses VXLAN over UDP port 4789.

**How it works**:
1. Calico creates a `vxlan.calico` virtual interface on each node
2. Felix programs cluster routes and VXLAN neighbor/FDB state so remote pod CIDRs resolve to remote node VTEPs
3. When a packet to a remote pod arrives at `vxlan.calico`, the kernel VXLAN driver encapsulates it in UDP and sends to the remote node
4. The remote node's kernel VXLAN driver decapsulates and delivers to the pod

**Overhead**: ~50 bytes per packet (VXLAN header + UDP + outer IP)

**Use VXLAN when**: Your underlay network blocks non-TCP/UDP protocols or specifically blocks IP protocol 4. For example, Azure supports Calico VXLAN mode but blocks IPIP packets.

## IP-in-IP Mode

IP-in-IP (protocol number 4) encapsulates IP packets directly inside IP packets, without the Ethernet and UDP overhead of VXLAN.

**Overhead**: ~20 bytes per packet (only the outer IP header)

**Use IP-in-IP when**: Your underlay network allows IP protocol 4 and you want minimal encapsulation overhead.

## CrossSubnet Mode

The `CrossSubnet` encapsulation mode combines the benefits of both approaches:
- Pods on the same subnet communicate without any encapsulation (native routing)
- Pods on different subnets communicate using VXLAN or IP-in-IP

This is ideal for multi-AZ deployments where nodes in the same AZ share a subnet but nodes across AZs are on different subnets.

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.0.0.0/16
  vxlanMode: CrossSubnet  # or ipipMode: CrossSubnet
  natOutgoing: true
```

## Comparing Overlay Modes

| Mode | Protocol | Overhead | Requirement |
|---|---|---|---|
| VXLAN | UDP/4789 | ~50 bytes | UDP/4789 allowed |
| IP-in-IP | IP proto 4 | ~20 bytes | Protocol 4 allowed |
| CrossSubnet | Mixed | Variable | Depends on path |
| None (BGP/static routes) | None | 0 bytes | Underlay routes pod CIDRs |

## Best Practices

- Use VXLAN in cloud environments when broad UDP-based overlay compatibility is more important than the lower overhead of IP-in-IP
- Use IP-in-IP only after confirming your cloud security groups/firewall rules allow IP protocol 4
- Use CrossSubnet for multi-AZ clusters to reduce encapsulation overhead for same-AZ traffic
- Monitor MTU carefully with any overlay mode - set MTU to node MTU minus the encapsulation overhead

## Conclusion

Overlay interconnect with Calico uses VXLAN or IP-in-IP overlays to transparently carry pod traffic across underlay networks that don't route pod IPs. VXLAN provides broad UDP-based compatibility at higher overhead; IP-in-IP provides lower overhead where protocol 4 is permitted; CrossSubnet provides an optimal mix for multi-AZ deployments. Choose the mode that matches your underlay network constraints and then size your MTU accordingly.
