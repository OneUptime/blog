# How to Debug Mobile IPv6 Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, Debugging, MIPv6, Troubleshooting, tcpdump, Networking

Description: Systematically debug Mobile IPv6 connectivity issues including failed Binding Updates, tunnel problems, proxy NDP failures, and handover latency.

## Introduction

Mobile IPv6 problems fall into a few categories: registration failures (BU/BA issues), tunnel forwarding failures, proxy NDP problems, and handover latency. This guide provides a systematic debugging approach for each.

## Step 1: Enable UMIP Debug Logging

```bash
# Start mip6d with maximum verbosity

sudo mip6d -c /etc/mip6d.conf -d 10

# Or enable debug logging for a running daemon
sudo kill -USR1 $(pidof mip6d)

# Watch logs in real time
journalctl -u mip6d -f

# Key log patterns to watch for:
# "BU received from..."     - incoming BU (HA side)
# "Sending BA to..."        - outgoing BA
# "BA received from..."     - BU was accepted (MN side)
# "BU seq number mismatch"  - sequence number issue
# "IPsec policy missing"    - security configuration error
```

## Step 2: Capture and Inspect Mobility Header Packets

```bash
# Capture all Mobility Header packets (proto 135)
sudo tcpdump -i eth0 -n -vv "ip6 proto 135" -w /tmp/mipv6.pcap

# View summary
tcpdump -r /tmp/mipv6.pcap -n

# Use Wireshark for detailed decode
wireshark /tmp/mipv6.pcap &
# Display filter: mip6

# Quick check: BUs and BAs
sudo tcpdump -i eth0 -n "ip6 proto 135" | head -20
```

## Step 3: Verify Binding Cache (HA Side)

```bash
# Check HA Binding Cache
sudo mip6d -n

# If empty: no BUs received or accepted
# Expected when MN is registered:
# HoA: 2001:db8:home::100
# CoA: 2001:db8:foreign::50
# Lifetime: 547s

# Check proxy NDP entries (must exist for each registered MN)
ip -6 neigh show proxy dev eth0
# Expected: 2001:db8:home::100 dev eth0

# If proxy entry missing, add manually and check UMIP
ip -6 neigh add proxy 2001:db8:home::100 dev eth0
```

## Step 4: Test the Tunnel

```bash
# On the HA: verify the tunnel interface exists for the MN
ip -6 tunnel show | grep -i "mip\|mobile"

# Test tunnel connectivity
ping6 -I mip6-tunnel 2001:db8:home::100

# Check if tunneled traffic is reaching the MN
# On the MN:
sudo tcpdump -i eth0 -n "ip6 proto 41"
# Proto 41 = IPv6-in-IPv6 encapsulation

# If no tunnel traffic: check routing
ip -6 route show
ip -6 route get 2001:db8:home::100
```

## Step 5: Diagnose IPsec Issues

```bash
# IPsec policy failures are the most common BU rejection cause

# Check IPsec policies
ip xfrm policy show | grep "proto 135"

# Check IPsec Security Associations
ip xfrm state show

# Test if an SA exists for the MN↔HA path
ip xfrm state show | grep -E "2001:db8:foreign::50|2001:db8:home::1"

# If no SA: IKEv2 negotiation may have failed
journalctl -u strongswan -n 50 | grep -i "error\|failed\|reject"

# Force IKE SA renegotiation
sudo swanctl --initiate --child mipv6-binding
sudo swanctl --list-sas
```

## Step 6: Common Issues and Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| BU silently dropped | No IPsec SA | Check/reinitiate IKE SA |
| BA status 132 | Not home subnet | MN's HoA prefix mismatch |
| BA status 135 | Sequence out of window | Restart MN mip6d daemon |
| No proxy NDP entry | UMIP not adding it | Verify `proxy_ndp=1` sysctl |
| Tunnel drops packets | MTU mismatch | Set tunnel MTU to 1280 |
| High handover latency | Slow NUD detection | Enable link-layer triggers |

## Step 7: MTU Troubleshooting

IPv6-in-IPv6 tunneling adds 40 bytes of overhead.

```bash
# Check tunnel MTU (should be home-link-MTU minus 40)
ip -6 link show mip6-tunnel | grep mtu

# Reduce MTU on tunnel interface to avoid fragmentation
ip link set mip6-tunnel mtu 1460  # 1500 - 40 bytes

# Test that large packets pass through the tunnel
ping6 -c 5 -s 1400 2001:db8:home::100
```

## Conclusion

Mobile IPv6 debugging requires working through the stack: IPsec SAs, BU acceptance, Binding Cache population, proxy NDP, and tunnel forwarding. Systematic packet capture with tcpdump and detailed UMIP logging pinpoints the failure layer quickly. Use OneUptime to monitor end-to-end connectivity for MIPv6-dependent services across handover events.
