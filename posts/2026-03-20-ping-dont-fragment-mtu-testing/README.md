# How to Use Ping with the Don't Fragment Flag for MTU Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ping, MTU, PMTUD, IPv4, Networking, Diagnostic

Description: Use ping with the Don't Fragment (DF) bit to manually discover the maximum MTU along a network path and diagnose MTU black hole problems.

MTU mismatches cause mysterious connectivity problems - connections that partially work or hang after the initial handshake. Using ping with the DF bit lets you manually discover the path MTU and pinpoint where oversized packets are being silently dropped.

## Understanding the DF Bit and Path MTU

```text
Standard Ethernet: 1500 byte MTU
VPN (WireGuard):   ~1420 byte MTU
PPPoE:             1492 byte MTU

When a packet is too large for a link:
  - Without DF bit: router fragments the packet
  - With DF bit:    router drops the packet and sends ICMP "fragmentation needed"

An "MTU black hole" occurs when:
  - DF bit is set on outbound IPv4 packets
  - A router drops an oversized packet
  - But ICMP "fragmentation needed" is blocked by a firewall
  → Connection hangs silently
```

## Ping with DF Bit on Linux

```bash
# -M do = set DF bit and don't allow fragmentation

# -s = payload size (add 28 for total IP packet size)

# Test if 1500-byte packets reach the target
ping -M do -s 1472 -c 3 192.168.1.1
# -s 1472 + 28 (IP+ICMP headers) = 1500 total bytes

# Expected if path MTU is at least 1500:
# 1480 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.8 ms

# Expected if MTU is less than 1500:
# ping: local error: Message too long, mtu=1420
# or: Frag needed and DF set (mtu = 1452)
```

## Binary Search for Path MTU

Find the exact maximum IPv4 packet size up to 1500 bytes that passes through:

```bash
#!/bin/bash
# find-pmtu.sh - Binary search for path MTU

HOST="${1:-8.8.8.8}"
LOW=0
HIGH=1473  # exclusive upper bound for a 1500-byte IPv4 packet

echo "Finding path MTU to $HOST..."

while [ $((HIGH - LOW)) -gt 1 ]; do
    MID=$(( (HIGH + LOW) / 2 ))
    if ping -4 -M do -s "$MID" -c 1 -W 2 "$HOST" > /dev/null 2>&1; then
        LOW=$MID
    else
        HIGH=$MID
    fi
done

echo "Path MTU to $HOST: $((LOW + 28)) bytes (payload: $LOW bytes)"
```

## Test Common VPN MTU Sizes

Different tunnel types have different MTU overheads:

```bash
# Test Ethernet (1500 MTU - payload 1472)
ping -M do -s 1472 -c 3 10.0.0.1
echo "Ethernet 1500 MTU test"

# Test PPPoE (1492 MTU - payload 1464)
ping -M do -s 1464 -c 3 10.0.0.1
echo "PPPoE 1492 MTU test"

# Test WireGuard (1420 MTU - payload 1392)
ping -M do -s 1392 -c 3 10.0.0.1
echo "WireGuard 1420 MTU test"

# Test VXLAN (1450 MTU - payload 1422)
ping -M do -s 1422 -c 3 10.0.0.1
echo "VXLAN 1450 MTU test"
```

## Diagnose an MTU Black Hole

If large pings fail but small ones work, you likely have an MTU black hole:

```bash
# Small packet works fine
ping -4 -M do -s 100 -c 3 web-server.example.com
# OK

# Large packet silently fails
ping -4 -M do -s 1400 -c 3 web-server.example.com
# No response (ICMP "fragmentation needed" blocked by firewall)

# Fix: clamp TCP MSS to the path MTU
sudo iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Or lower the interface MTU
sudo ip link set eth0 mtu 1400
```

## Quick Reference: Payload Sizes

```text
Total Packet  Payload (-s)  Use case
------------  ------------  ----------------------------
   84 bytes     56 bytes    Default ping
  576 bytes    548 bytes    IPv4 host receive requirement (RFC 791)
 1500 bytes   1472 bytes    Standard Ethernet
 1492 bytes   1464 bytes    PPPoE
 1476 bytes   1448 bytes    GRE over IPv4
 1450 bytes   1422 bytes    VXLAN
 1420 bytes   1392 bytes    WireGuard
```

MTU testing with the DF bit is the fastest way to identify and prove MTU black holes - a common but difficult-to-diagnose cause of VPN and WAN connectivity issues.
