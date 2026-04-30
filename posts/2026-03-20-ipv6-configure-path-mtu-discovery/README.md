# How to Configure Path MTU Discovery for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Path MTU Discovery, PMTUD, MTU, Networking

Description: Configure Path MTU Discovery for IPv6 on Linux and other systems, understand how PMTU caching works, and ensure PMTUD operates correctly in your environment.

## Introduction

Path MTU Discovery (PMTUD) for IPv6 is defined in RFC 8201 and is essential for efficient packet delivery. Unlike IPv4 where router fragmentation can silently handle oversized packets, IPv6 requires PMTUD to avoid packet loss. When a packet is too large for a link, the router sends an ICMPv6 Packet Too Big message and drops the packet - PMTUD allows the source to learn this and adjust.

## How IPv6 PMTUD Works

```text
PMTUD Process:

1. Source sends packet sized to local interface MTU (e.g., 1500 bytes)
2. Router with smaller-MTU next link:
   - Drops the packet
   - Sends ICMPv6 Packet Too Big (Type 2) with the next-link MTU
3. Source receives PTB message:
   - Updates PMTU cache for this destination
   - Resends packet at the reduced size
4. Process repeats if further bottlenecks exist
5. PMTU cache entries expire (default: 10 minutes on Linux)
   - Later traffic can use a larger MTU again and rediscover the path if it changed
```

## Configuring PMTUD on Linux

PMTUD is used by default on Linux. In most cases, you inspect cached PMTU state and tune related timers rather than enabling it with a global IPv6 sysctl:

```bash
# Check how long cached IPv6 PMTU information is kept
cat /proc/sys/net/ipv6/route/mtu_expires
# Default: 600 seconds (10 minutes)

# Inspect the resolved route for a specific destination
ip -6 route get 2001:db8::1

# Example output if a PMTU exception is cached:
# 2001:db8::1 from :: via fe80::1 dev eth0 src 2001:db8::100
#    cache expires 594sec mtu 1280

# Force PMTU rediscovery by flushing cached cloned routes / PMTU exceptions
sudo ip -6 route flush cache

# View PMTU-related IPv6 and ICMPv6 counters
grep -E 'Ip6InTooBigErrors|Ip6FragCreates|Icmp6InPktTooBigs|Icmp6OutPktTooBigs' /proc/net/snmp6
# Key counters:
# Icmp6InPktTooBigs   - received ICMPv6 Packet Too Big messages
# Icmp6OutPktTooBigs  - transmitted ICMPv6 Packet Too Big messages
# Ip6InTooBigErrors   - incoming IPv6 packets dropped locally as too big
# Ip6FragCreates      - fragments created by this host
```

## Checking PMTU for a Specific Destination

```bash
# Inspect the resolved route and any cached PMTU for a destination
ip -6 route get 2001:db8::1

# Example output showing PMTU:
# 2001:db8::1 from :: via fe80::1 dev eth0 src 2001:db8::100
#    cache  expires 594sec mtu 1280

# Test PMTUD interactively using ping with IPv6 and large packet sizes
ping -6 -M do -s 1452 2001:db8::1
# -M do: enforce kernel PMTU checks so oversized probes are rejected locally
# For IPv6, this uses the socket's PMTU discovery setting; IPv6 has no DF bit
# -s 1452: data size (1452 + 8 ICMPv6 + 40 IPv6 = 1500 bytes total)

# If path MTU is smaller, ping will report an MTU-related error or Packet Too Big response
```

## Firewall Configuration for PMTUD

PMTUD fails silently when firewalls block ICMPv6 Packet Too Big. This is the most common cause of "black hole" connectivity issues:

```bash
# Allow ICMPv6 Packet Too Big through the firewall (CRITICAL)
# Using ip6tables
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Using nftables
# nft add rule ip6 filter input icmpv6 type packet-too-big accept
# nft add rule ip6 filter output icmpv6 type packet-too-big accept
# nft add rule ip6 filter forward icmpv6 type packet-too-big accept

# Verify existing rules allow PTB (look for packet-too-big or type 2)
sudo ip6tables -L -v | grep -i "packet-too-big\|icmpv6"

# Test if PMTU messages are reaching the source
sudo tcpdump -i eth0 'icmp6 and icmp6[icmp6type] == icmp6-packettoobig'
```

## PMTU Black Hole Detection

Linux ages cached PMTU information automatically, and TCP can use Packetization Layer PMTU Discovery (PLPMTUD) when ICMP-based PMTUD fails:

```bash
# Check PMTU cache lifetime
cat /proc/sys/net/ipv6/route/mtu_expires
# Default: 600 seconds (10 minutes)

# Cached PMTU information ages out after this interval

# TCP settings live under net.ipv4 on Linux and apply to IPv6 TCP as well
# Check whether TCP MTU probing (PLPMTUD fallback) is enabled
cat /proc/sys/net/ipv4/tcp_mtu_probing
# 0 = disabled
# 1 = enabled when an ICMP black hole is detected
# 2 = always enabled (uses tcp_base_mss as the initial MSS)

# Enable TCP MTU probing (helps TCP recover when ICMP-based PMTUD fails)
sudo sysctl -w net.ipv4.tcp_mtu_probing=1
```

## Verifying PMTUD End-to-End

```python
import subprocess
import re

def check_pmtu_to_destination(destination: str) -> dict:
    """
    Resolve an IPv6 route and parse any cached PMTU information
    reported by 'ip -6 route get'.
    """
    result = subprocess.run(
        ["ip", "-6", "route", "get", destination],
        capture_output=True, text=True
    )
    output = result.stdout

    mtu_match = re.search(r'mtu (\d+)', output)
    expires_match = re.search(r'expires (\d+)sec', output)
    via_match = re.search(r'via (\S+)', output)

    return {
        "destination": destination,
        "cached_mtu": int(mtu_match.group(1)) if mtu_match else None,
        "expires_in": int(expires_match.group(1)) if expires_match else None,
        "via": via_match.group(1) if via_match else None,
        "raw": output.strip(),
    }

result = check_pmtu_to_destination("2001:db8::1")
if result["cached_mtu"]:
    print(f"PMTU to {result['destination']}: {result['cached_mtu']} bytes")
    print(f"Cache expires in: {result['expires_in']} seconds")
else:
    print(f"No cached PMTU for {result['destination']} (will use interface MTU)")
```

## Conclusion

IPv6 PMTUD is enabled by default on modern systems and requires no manual configuration in typical environments. The critical operational requirement is ensuring ICMPv6 Packet Too Big messages are never blocked by firewalls. PMTU cache entries are time-limited, so the system naturally adapts to path changes. When connectivity issues occur with large transfers but small packets work fine, always check for PMTUD black holes by verifying ICMPv6 type 2 messages can reach the source.
