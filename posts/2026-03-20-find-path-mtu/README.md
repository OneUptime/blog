# How to Find the Path MTU Between Two Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, PMTUD, Networking, Linux, Tracepath, Troubleshooting

Description: Discover the Path MTU (PMTU) between two hosts using tracepath, ping with DF bit, and socket-level PMTU discovery to determine the maximum packet size.

## Introduction

Path MTU is the smallest MTU of any link on the path between two hosts. Knowing the path MTU is essential for configuring applications, VPN overlays, and protocol encapsulation. Unlike interface MTU (which you can read directly), path MTU must be discovered dynamically since it depends on the complete network path which may include links with various MTUs.

## Method 1: tracepath

```bash
# tracepath discovers the path MTU and shows where it changes:

tracepath -n 10.20.0.5
# Output:
# 1?: [LOCALHOST]                 pmtu 9000
# 1:  10.20.0.1          0.5ms
# 2:  10.1.0.1           2.1ms
# 3:  203.0.113.1        5.2ms  pmtu 1500  ← PMTU drops here
# 4:  10.20.0.5          7.8ms reached
#     Resume: pmtu 1500 hops 4 back 4

# The last reported pmtu value = path MTU
# Here: path MTU = 1500

# IPv6:
tracepath -6 -n 2001:db8::1
```

## Method 2: ping with DF Bit (Binary Search)

```bash
#!/bin/bash
# Find exact IPv4 path MTU by binary search with ping

DEST="10.20.0.5"
LOW=68       # RFC 1191 lower bound for IPv4 PMTU estimates
HIGH=9000    # Maximum to test (jumbo frames)

echo "Finding path MTU to $DEST..."

while [ $((HIGH - LOW)) -gt 1 ]; do
    MID=$(( (LOW + HIGH) / 2 ))
    PAYLOAD=$((MID - 28))  # Subtract IP header (20) + ICMP header (8)

    if ping -4 -M do -s $PAYLOAD -c 1 -W 2 $DEST > /dev/null 2>&1; then
        LOW=$MID
    else
        HIGH=$MID
    fi
done

echo "Path MTU: ${LOW} bytes"
echo "Maximum payload without fragmentation:"
echo "  ICMP/ping: $((LOW - 28)) bytes"
echo "  UDP:       $((LOW - 28)) bytes"
echo "  TCP:       $((LOW - 40)) bytes (MSS without IP/TCP options)"
```

## Method 3: Socket-Level PMTUD

```python
#!/usr/bin/env python3
# Read Linux's current PMTU estimate from a connected UDP socket

import errno
import socket

def get_path_mtu(destination, port=9):
    """Get Linux's current PMTU estimate for a connected IPv4 UDP socket."""
    IP_MTU = getattr(socket, "IP_MTU", 14)
    IP_MTU_DISCOVER = getattr(socket, "IP_MTU_DISCOVER", 10)
    IP_PMTUDISC_DO = getattr(socket, "IP_PMTUDISC_DO", 2)

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.IPPROTO_IP, IP_MTU_DISCOVER, IP_PMTUDISC_DO)

    try:
        sock.connect((destination, port))
        mtu = sock.getsockopt(socket.IPPROTO_IP, IP_MTU)

        # A deliberately oversized datagram can trigger a PMTU update.
        try:
            sock.send(b'X' * 65507)
        except OSError as e:
            if e.errno != errno.EMSGSIZE:
                raise
            mtu = sock.getsockopt(socket.IPPROTO_IP, IP_MTU)

        return mtu
    except OSError as e:
        print(f"Error: {e}")
        return None
    finally:
        sock.close()

dest = "10.20.0.5"
mtu = get_path_mtu(dest)
if mtu is not None:
    print(f"Path MTU estimate to {dest}: {mtu} bytes")
    print(f"Max UDP payload:      {mtu - 28} bytes")
    print(f"TCP MSS:              {mtu - 40} bytes")
```

## Common Path MTU Values

```text
Network Type             | Typical Path MTU
-------------------------|------------------
Standard Ethernet        | 1500 bytes
Jumbo frames (LAN)       | 9000 bytes
PPPoE (DSL/cable)        | 1492 bytes
GRE tunnel               | 1476 bytes (1500 - 24)
IPsec ESP tunnel mode    | ~1400-1450 bytes (varies with cipher/mode/NAT-T)
VXLAN                    | 1450 bytes (1500 - 50)
WireGuard VPN            | 1420 bytes (common default on 1500-byte underlay)
WireGuard in VXLAN       | 1370 bytes (1450 - 80)
Cellular/Mobile          | 1400-1500 bytes (variable)
Satellite                | 576-1500 bytes (variable)
```

## Verify with Direct Test

```bash
# Verify the discovered path MTU actually works:
PATH_MTU=1500  # Replace with your discovered MTU

# ICMP test at path MTU (should succeed):
ping -4 -M do -s $((PATH_MTU - 28)) -c 3 10.20.0.5

# ICMP test 1 byte above path MTU (should fail):
ping -4 -M do -s $((PATH_MTU - 27)) -c 1 10.20.0.5
# Should show a fragmentation-needed / "message too long" error with the MTU.

# TCP should automatically discover and use path MTU:
# Connect with iperf3 and check ss output:
iperf3 -c 10.20.0.5 -t 5 &
sleep 1
ss -tin state established dst 10.20.0.5 | grep -E 'mss|pmtu'
# MSS should be approximately PATH_MTU - 40
```

## Conclusion

Use `tracepath -n` for a quick path MTU discovery - it shows where the path MTU changes and reports the detected path MTU. For programmatic use on Linux, a connected UDP socket can read the kernel's current path MTU estimate with `IP_MTU`; after an `EMSGSIZE` error, read `IP_MTU` again to see the updated value. TCP discovers path MTU automatically using PMTUD; configure VPN tunnels and application-level UDP protocols to use `path_mtu - overhead` to avoid fragmentation. The common problem environments are IPsec VPNs (variable overhead) and VXLAN overlays (50 bytes overhead) where the effective path MTU is significantly less than the underlying Ethernet MTU.
