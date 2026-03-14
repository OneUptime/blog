# How to Explain L2 Interconnect Fabric with Calico to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, L2, Networking, VXLAN, Team Communication, Overlay

Description: A practical guide for explaining Calico's L2 overlay networking (VXLAN, IP-in-IP) to engineering teams, using analogies to make encapsulation intuitive.

---

## Introduction

Explaining L2 overlay networking to a team requires making encapsulation intuitive. Most developers understand sending a letter in an envelope - overlay networking is just putting one envelope inside another. The inner envelope has the pod addresses; the outer envelope has the node addresses that the network knows how to route.

This post gives you the analogies, diagrams, and live demonstrations to explain Calico's L2 interconnect to teams with varying networking backgrounds.

## Prerequisites

- A Calico cluster running in VXLAN or IP-in-IP mode
- `tcpdump` available on nodes
- Understanding of your team's networking background

## The Double Envelope Analogy

Start with this analogy:

> "Imagine you want to send a letter to someone who lives in an apartment building, but the postal service only knows about building addresses - not apartment numbers. You put your letter (addressed to Apartment 5B) inside another envelope addressed to the building. The post office delivers the outer envelope to the building; the building's lobby handles getting your letter to Apartment 5B."

In Kubernetes overlay networking:
- **Inner envelope**: Pod IP to Pod IP (the actual application traffic)
- **Outer envelope**: Node IP to Node IP (what the cloud network knows how to route)
- **Building lobby**: The VXLAN or IP-in-IP decapsulation on the destination node

## Demonstrating Encapsulation Live

Show the team what encapsulation looks like with `tcpdump`:

```bash
# On a worker node, capture traffic on the VXLAN interface
sudo tcpdump -i vxlan.calico -n -c 5

# In another terminal, generate cross-node pod-to-pod traffic
kubectl exec pod-on-node-1 -- wget -qO- http://<pod-on-node-2>
```

Expected output:
```plaintext
10:23:45.123 IP 172.16.1.1 > 172.16.2.1: VXLAN, vni 4096
    IP 10.0.1.4 > 10.0.2.5: TCP 80
```

Point out: "Two IP addresses in one packet. Outer: node IPs the network knows. Inner: pod IPs only Calico knows."

## What to Tell Developers

For developers who want to know why this matters for their applications:

> "The overlay is transparent to your application. Your pod thinks it's talking directly to another pod's IP. The encapsulation happens below the socket layer - your Go, Python, or Java code doesn't know or care about VXLAN."

The only thing developers might notice: slightly higher network latency (a few microseconds for encap/decap) and a reduced effective MTU. If they're sending very large application messages (close to 64KB), they may need to consider the MTU impact.

## What to Tell Network Engineers

Network engineers who manage the underlay infrastructure need to know:

1. **VXLAN uses UDP/4789**: Ensure your firewall/security group rules allow UDP port 4789 between all nodes in the cluster
2. **IP-in-IP uses protocol 4**: If using IP-in-IP, ensure IP protocol 4 is allowed between nodes
3. **MTU planning**: The encapsulation reduces the effective payload MTU - coordinate with the application team on expected message sizes

Show the comparison:

| Protocol | Port/Protocol | What to Allow in Firewall |
|---|---|---|
| VXLAN | UDP 4789 | Allow UDP 4789 between all node IPs |
| IP-in-IP | IP proto 4 | Allow protocol 4 between all node IPs |
| None (BGP) | BGP (TCP 179) | Allow TCP 179 between nodes and BGP peers |

## What to Tell Platform Engineers

For platform engineers who will configure and operate the overlay:

```bash
# Check what mode is configured
calicoctl get ippools default-ipv4-ippool -o yaml | grep -E "vxlanMode|ipipMode"

# Verify VXLAN interface exists on nodes
ip link show vxlan.calico

# View VXLAN FDB (which node IP handles which pod CIDR)
bridge fdb show dev vxlan.calico
```

The VXLAN FDB is programmed by Felix and should have one entry per remote node. If entries are missing, Felix may not have established connectivity to remote nodes.

## Common Questions

**Q: Does the overlay add a lot of latency?**
A: The encapsulation/decapsulation is done in kernel space and adds ~5-15 microseconds per round trip - imperceptible for most applications.

**Q: Why not just use BGP instead of overlays?**
A: BGP requires your network fabric to support and accept BGP sessions from Kubernetes nodes. Cloud VPC networks typically don't support this. Overlays work with any network that can route UDP traffic between VMs.

## Best Practices

- Show the `tcpdump` encapsulation demo to any team member who will be troubleshooting network connectivity - seeing the double IP header makes debugging much clearer
- Document which overlay mode is configured in your cluster in the team wiki
- Include the required firewall ports (UDP 4789 for VXLAN) in your cluster provisioning runbook

## Conclusion

Explaining L2 overlay networking with the double envelope analogy makes encapsulation immediately intuitive for any audience. Developers understand their application is unaffected. Network engineers know which ports to open. Platform engineers know how to inspect and debug the VXLAN state. The `tcpdump` live demonstration connects the analogy to observable reality in a way that slides never can.
