# How to Prevent IPv6 Theft and Denial of Service via Flow Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Flow Label, DoS, QoS

Description: Learn how IPv6 Flow Labels can be abused for denial-of-service attacks and traffic theft, and how to implement defenses at the network and firewall level.

## Overview

The IPv6 Flow Label is a 20-bit field intended to allow routers and load balancers to handle packets from the same flow consistently without repeatedly inspecting transport headers. While this improves performance, attackers can still disturb flow-label-based classification if a network or appliance trusts the label without enough surrounding context.

## IPv6 Flow Label: Intended Use

```text
IPv6 Header (40 bytes):
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Traffic Class |            Flow Label                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Flow Label: 20 bits, values 0-0xFFFFF
- Source sets it once per flow
- Routers and load distributors combine it with other header fields for hashing/classification
- Some layer 3/4 load balancers may use it as part of a fast session key
```

RFC 6437 defines the Flow Label specification: it should be set to a pseudo-random value per flow and remain constant for the lifetime of the flow.

## Attack 1: Flow Label Hijacking (Backend Steering)

Some layer 3/4 load balancers can use `{source address, flow label}` or `{destination address, source address, flow label}` as a fast session key. An attacker who can observe a victim's Flow Label and spoof the victim source address can try to steer spoofed packets into the same backend selection. That does not, by itself, inject into an existing TCP session because the server still validates transport-layer state.

```bash
# Observe the victim's flow label
tshark -i eth0 -Y 'ipv6.src == victim-ip && tcp' -T fields -e ipv6.flow
# → Capture: 703506   (0xABC12)

# Forge a spoofed packet with the same source and flow label
python3 -c "
from scapy.all import IPv6, TCP, send
pkt = IPv6(src='victim-ip', dst='server-ip', fl=0xABC12)/TCP(sport=12345, dport=80, flags='S')
send(pkt, verbose=0)
"
# If the load balancer keys only on source+flow label or dst+source+flow label
# the spoofed packet can be steered to the same backend
```

**Defense:** Devices should not rely on the Flow Label alone. RFC 6437 requires stateless classifiers to combine it with other packet fields, and RFC 7098 discusses using at least source address plus Flow Label for layer 3/4 load balancing. Devices that do NAPT or TCP state tracking must still validate transport-layer state.

## Attack 2: Flow Label Cycling DoS

RFC 6437 notes that an attacker can rapidly cycle Flow Label values on otherwise related traffic. This can make stateless load distribution perform badly and can cause stateful classifiers to behave incorrectly or treat the traffic as suspect. It is not a generic guarantee that each new label creates a new firewall state entry.

```bash
# Attacker sends packets with rapidly changing flow labels
# This can disturb flow-label-based hashing or classifier behavior
python3 -c "
import random
from scapy.all import IPv6, TCP, send
for i in range(100000):
    pkt = IPv6(dst='target', fl=random.randint(1, 0xFFFFF))/TCP(dport=80, flags='S')
    send(pkt, verbose=0)
"
# → Flow-label-based handling degrades or becomes suspect
```

## Attack 3: ECMP Hash Manipulation

Routers that include the Flow Label in ECMP hashing can have path selection influenced by the sender. RFC 6438 requires the hash to include at least `{destination address, source address, flow label}`, and many implementations also include transport ports. An attacker can reduce path diversity for traffic they originate or successfully spoof, but not steer unrelated traffic by setting a single label.

```bash
# If a router includes the flow label in its ECMP hash, keeping a fixed label
# can keep a given {src,dst,flow} combination on one path
# This reduces path diversity for that sender's traffic
```

## Detection

```bash
# Detect suspicious label churn: high cardinality of unique (src, flow) pairs from one source
tshark -i eth0 -Y 'ipv6' -T fields -e ipv6.src -e ipv6.flow \
  | sort -u | awk '{count[$1]++; if(count[$1] > 1000) print "ALERT: " $1 " has " count[$1] " unique flow labels"}'

# Monitor flow label entropy per source
# Normal: 1 flow label per persistent connection
# Attack: thousands of different flow labels per second from one source
```

```bash
# tshark: Collect flow label statistics
tshark -a duration:60 -i eth0 -Y 'ipv6' -T fields -e ipv6.src -e ipv6.flow \
  | sort -u | wc -l   # Count unique (src, flow) pairs
```

## Firewall and Rate Limiting Controls

```bash
# ip6tables: Rate limit new IPv6 TCP connections
ip6tables -A INPUT -p tcp -m conntrack --ctstate NEW --syn -m limit --limit 100/second --limit-burst 500 -j ACCEPT
ip6tables -A INPUT -p tcp -m conntrack --ctstate NEW --syn -j DROP

# nftables: Rate limit IPv6 new connections
nft add rule ip6 filter input ct state new tcp flags & \(syn | ack\) == syn limit rate 100/second burst 500 packets accept
nft add rule ip6 filter input ct state new tcp flags & \(syn | ack\) == syn drop
```

### Router-Level Mitigation (Cisco)

```text
! Generic CoPP safeguard for IPv6 traffic punted to the control plane
! This is coarse rate limiting, not Flow-Label-specific matching
class-map match-any MATCH-IPV6-ANY
  match ipv6 any

policy-map COPP
  class MATCH-IPV6-ANY
   police rate 1000 pps burst 256 packets
   conform-action transmit
   exceed-action drop

control-plane
  service-policy input COPP
```

## RFC 6437 Compliance for Source Hosts

RFC 6437 (The IPv6 Flow Label Specification) requires that:
- Flow Labels be chosen from an approximately uniform or pseudo-random distribution per flow
- Non-zero Flow Labels remain constant for the flow lifetime
- A source that does not set Flow Labels MUST set the value to 0

```bash
# Linux: Check current flow label settings
sysctl net.ipv6.flowlabel_consistency   # 1 = keep flow labels consistent/unique
sysctl net.ipv6.auto_flowlabels         # 0-3; 1 = enabled by default, 3 = enforced

# Enable automatic flow label generation by default
sysctl -w net.ipv6.auto_flowlabels=1
```

## Summary

IPv6 Flow Label abuse is primarily a risk when networks or appliances use the label for flow-specific treatment without enough validation. RFC 6437 and RFC 7098 describe risks such as disturbed load distribution, unintended service treatment, and backend steering if labels are spoofed or rapidly cycled. Defenses include: never hashing on the Flow Label alone, validating source and transport context where required, rate-limiting new connections, monitoring for unusual flow-label churn, and enabling sane host-side label generation such as Linux `auto_flowlabels=1`.
