# How to Map the Calico Data Path to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Data Path, CNI, Traffic Flows, Networking, iptables, eBPF

Description: A packet-level walkthrough of how real Kubernetes traffic flows through Calico's data path, showing the processing stages for same-node, cross-node, and external traffic.

---

## Introduction

Mapping real traffic to data path stages transforms debugging from guesswork into systematic investigation. When you know that cross-node VXLAN traffic traverses the outer IP routing table before being decapsulated, you know to check outer IP routing (not pod routing) when cross-node connectivity fails but same-node connectivity works.

This post traces four representative traffic scenarios through Calico's data path in iptables mode and eBPF mode, showing which processing stages each packet traverses and what artifacts you can inspect at each stage.

## Prerequisites

- Understanding of Calico's iptables chain structure
- Familiarity with VXLAN encapsulation basics
- A Calico cluster for live verification

## Scenario 1: Same-Node Pod-to-Pod (iptables mode)

```mermaid
graph LR
    PodA[Pod A\n10.0.1.4] --> VethA[veth-A host side]
    VethA --> ROUTING[Kernel routing table\n10.0.1.5 dev veth-B]
    ROUTING --> FORWARD[netfilter FORWARD]
    FORWARD --> CALIWL[cali-FORWARD\ncali-from-wl-dispatch]
    CALIWL --> POLICY[cali-fw-vethA\nEgress policy check]
    POLICY --> INGRESS[cali-tw-vethB\nIngress policy check]
    INGRESS --> PodB[Pod B\n10.0.1.5]
```

Artifacts to inspect:
```bash
# Egress policy chain (from Pod A)

sudo iptables -L cali-fw-<veth-a> -n -v

# Ingress policy chain (to Pod B)
sudo iptables -L cali-tw-<veth-b> -n -v

# Host route for Pod B
ip route show 10.0.1.5
```

## Scenario 2: Cross-Node Pod-to-Pod (VXLAN mode)

```mermaid
sequenceDiagram
    participant PodA as Pod A (Node 1)
    participant Felix1 as Felix/iptables (Node 1)
    participant VXLAN as VXLAN Interface (vxlan.calico)
    participant Network as Underlay Network
    participant Felix2 as Felix/iptables (Node 2)
    participant PodB as Pod B (Node 2)

    PodA->>Felix1: Packet: src=10.0.1.4, dst=10.0.2.5
    Felix1->>Felix1: Route lookup: 10.0.2.0/26 via vxlan.calico
    Felix1->>Felix1: Egress policy check (cali-fw-vethA)
    Felix1->>VXLAN: Forward to vxlan.calico
    VXLAN->>Network: Encapsulated: outer src=Node1-IP, outer dst=Node2-IP\nInner: src=10.0.1.4, dst=10.0.2.5
    Network->>VXLAN: Received on Node 2
    VXLAN->>Felix2: Decapsulated packet
    Felix2->>Felix2: Ingress policy check (cali-tw-vethB)
    Felix2->>PodB: Deliver packet
```

The VXLAN encapsulation/decapsulation is handled by the Linux kernel's VXLAN driver, not by Calico. Felix programs the routes and FDB (forwarding database) entries that tell the VXLAN driver which remote node VTEP IP to use for remote pod CIDRs:

```bash
# View Calico's VXLAN FDB entries
bridge fdb show dev vxlan.calico
# Expected: remote VXLAN MAC-to-node-IP mappings
```

## Scenario 3: Pod-to-External (egress with SNAT)

```mermaid
graph LR
    Pod[Pod\n10.0.1.4] --> VETH[veth pair]
    VETH --> ROUTING[Default route\n0.0.0.0/0 via node gateway]
    ROUTING --> EGRESS[cali-fw-vethA\nEgress policy check]
    EGRESS --> POSTROUTING[POSTROUTING\ncali-nat-outgoing MASQUERADE]
    POSTROUTING --> NIC[Node NIC\nSrc: 203.0.113.1 (Node IP)]
    NIC --> Internet[External service]
```

The MASQUERADE rule is reached from Calico's `nat` table POSTROUTING chain through the `cali-nat-outgoing` chain:
```bash
sudo iptables -t nat -L cali-nat-outgoing -n -v
# Shows: MASQUERADE for pod CIDR traffic to non-cluster destinations
```

## Scenario 4: eBPF Mode - Direct Path

In eBPF mode, the netfilter chain traversal is replaced with TC hook programs:

```mermaid
graph LR
    PodA[Pod A] --> TCEgress[TC Ingress Hook\non host-side veth-A]
    TCEgress --> EBPFPolicy[eBPF egress policy\ncompiled program and map lookups]
    EBPFPolicy --> ServiceMap[eBPF service map\nIf dst is ClusterIP: DNAT]
    ServiceMap --> Routing[Kernel routing table]
    Routing --> TCIngress[TC Egress Hook\non host-side veth-B or tunnel/interface]
    TCIngress --> EBPFIngress[eBPF ingress policy\ncompiled program and map lookups]
    EBPFIngress --> PodB[Pod B]
```

eBPF map inspection:
```bash
# Policy attached to an interface
kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf policy dump <interface> <ingress|egress>

# Service maps - contain ClusterIP frontend and backend entries
sudo bpftool map list | grep 'cali_v4_nat_'
```

## Comparing Packet Counts Between Data Paths

A useful diagnostic technique: count packets at each stage to find where packets are dropped:

```bash
# iptables mode: reset counters and send a packet, then check
sudo iptables -Z
kubectl exec pod-a -- wget -qO- http://10.0.2.5
sudo iptables -L cali-FORWARD -n -v  # Should show packet count > 0
sudo iptables -L cali-fw-<iface> -n -v  # Egress policy count
sudo iptables -L cali-tw-<iface2> -n -v  # Ingress policy count on dest node
```

If a count is 0 at a stage, the packet is not reaching that stage - look earlier in the path for the drop.

## Best Practices

- Build a data path flowchart for your specific encapsulation mode and keep it in your runbook
- Use packet counting at each stage to bisect connectivity issues
- For VXLAN, always check both inner and outer packet paths when debugging cross-node issues

## Conclusion

Mapping real Kubernetes traffic to Calico data path stages reveals exactly where to look for each type of connectivity issue. Same-node traffic uses only the local veth policy chains. Cross-node traffic adds encapsulation. External traffic adds SNAT. eBPF mode collapses netfilter traversal into TC hook programs. Knowing which stages a specific traffic type traverses enables systematic, efficient debugging during incidents.
