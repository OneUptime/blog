# How to Configure SRv6 on Linux with iproute2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Linux, iproute2, Segment Routing, Ip route, Kernel

Description: Configure SRv6 segment routing on Linux using iproute2 commands, including encapsulation routes, endpoint behaviors, and local SID programming.

## Introduction

The Linux kernel has supported SRv6 encapsulation since version 4.10 via the `seg6` lightweight tunnel, with `seg6local` endpoint behaviors added in version 4.14. You can program SRv6 encapsulation at ingress nodes and SRv6 endpoint functions at transit and egress nodes without any additional software.

## Enable SRv6 in the Kernel

```bash
# Enable SRv6 globally

sysctl -w net.ipv6.conf.all.seg6_enabled=1
sysctl -w net.ipv6.conf.default.seg6_enabled=1

# Enable per-interface (required at endpoints to accept SRH packets with DA = local)
sysctl -w net.ipv6.conf.eth0.seg6_enabled=1

# Persist in /etc/sysctl.conf:
echo "net.ipv6.conf.all.seg6_enabled=1" >> /etc/sysctl.conf
```

## Ingress Node: Encapsulating Traffic into SRv6

```bash
# Encapsulate IPv6 traffic in SRv6 (mode encap)
# Traffic to fd00:99::/64 will be encapsulated with SID list [R2, R3]
ip -6 route add fd00:99::/64 \
  encap seg6 mode encap \
  segs 5f00:2:0:e001::,5f00:3:0:e000:: \
  dev eth0

# mode encap: add new IPv6 header + SRH
# segs: comma-separated SID list (first SID = first to visit)

# Encapsulate IPv4 traffic in SRv6 (SRv6 tunnel for IPv4)
ip route add 192.168.99.0/24 \
  encap seg6 mode encap \
  segs 5f00:2:0:e001::,5f00:3:0:e004:: \
  dev eth0

# Inline mode (insert SRH without new IP header)
ip -6 route add fd00:99::/64 \
  encap seg6 mode inline \
  segs 5f00:2:0:e001:: \
  dev eth0
```

## Transit Node: End Function

```bash
# End function: decrement Segments Left, update IPv6 dst, forward
ip -6 route add 5f00:2:0:e001::/128 \
  encap seg6local action End \
  dev lo

# End.X: cross-connect to specific next-hop (L3 adjacency SID)
ip -6 route add 5f00:2:0:e002::/128 \
  encap seg6local action End.X \
  nh6 fd00:12::1 \
  dev eth0
```

## Egress Node: Decapsulation Functions

```bash
# End.DT6: decapsulate and do IPv6 table lookup in main table
ip -6 route add 5f00:3:0:e000::/128 \
  encap seg6local action End.DT6 table 254 \
  dev lo

# End.DT4: decapsulate IPv6 outer, do IPv4 table lookup
ip route add 5f00:3:0:e004::/128 \
  encap seg6local action End.DT4 vrftable 254 \
  dev lo

# End.DX6: decapsulate and forward to specific IPv6 next-hop
ip -6 route add 5f00:3:0:e006::/128 \
  encap seg6local action End.DX6 \
  nh6 fd00:23::3 \
  dev eth1
```

## Verifying SRv6 Routes

```bash
# List all SRv6 routes
ip -6 route show | grep -E "seg6|encap"

# Show specific SID
ip -6 route show 5f00:2:0:e001::/128

# Capture SRH packets
tcpdump -i eth0 -n "ip6 proto 43" -v
# proto 43 = Routing Header (includes SRH)

# Match packets where the next-header field (offset 6) is the Routing Header (43)
tcpdump -i eth0 -n "ip6[6]==43" -XX | head -40
```

## Complete 3-Node SRv6 Setup

```bash
#!/bin/bash
# Run on each node - adjust NODE, LOCATOR, and peers accordingly

NODE=1
LOCATOR="5f00:${NODE}::/48"

# Assign locator address
ip -6 addr add "5f00:${NODE}::/128" dev lo

# Enable SRv6
sysctl -w net.ipv6.conf.all.seg6_enabled=1

# Node 1 (ingress): encapsulate
if [ "$NODE" = "1" ]; then
  ip -6 route add fd00:99::/64 \
    encap seg6 mode encap \
    segs 5f00:2:0:e001::,5f00:3:0:e000:: \
    dev eth0
fi

# Node 2 (transit): End.X
if [ "$NODE" = "2" ]; then
  ip -6 route add 5f00:2:0:e001::/128 \
    encap seg6local action End.X \
    nh6 fd00:23::3 dev eth1
fi

# Node 3 (egress): End.DT6
if [ "$NODE" = "3" ]; then
  ip -6 route add 5f00:3:0:e000::/128 \
    encap seg6local action End.DT6 table 254 dev lo
fi
```

## Conclusion

Linux's iproute2 provides a complete SRv6 data plane with `seg6` encapsulation routes and `seg6local` endpoint actions. The kernel handles SRH insertion, processing, and decapsulation natively. Use this for lab validation before deploying on production routers. Monitor SRv6 traffic flows with OneUptime using ICMP probes to SID addresses.
