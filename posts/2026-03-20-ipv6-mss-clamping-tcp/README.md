# How to Use TCP MSS Clamping for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MSS Clamping, TCP, MTU, Ip6tables

Description: Understand how TCP Maximum Segment Size clamping works for IPv6, when to use it, and how to configure MSS clamping with ip6tables and nftables.

## Introduction

TCP Maximum Segment Size (MSS) clamping modifies the MSS value in TCP SYN packets as they pass through a router or firewall. It is a practical workaround for PMTU black holes: when ICMPv6 Packet Too Big messages cannot be guaranteed to reach the source, MSS clamping helps ensure TCP never sends segments larger than the effective path MTU. Because each host limits what it sends based on the MSS advertised by its peer, clamping is commonly applied to SYN packets in both directions. MSS clamping is especially important on tunnel endpoints and anywhere the path MTU is reduced by encapsulation.

## How MSS Clamping Works

```text
Normal TCP without MSS clamping on a tunnel:

SYN: Host A advertises MSS=1440 (1500 - 40 IPv6 - 20 TCP)
SYN-ACK: Host B advertises MSS=1440
Data: Host A sends 1440-byte TCP payloads
Inner packet: 1440 + 40 IPv6 + 20 TCP = 1500 bytes
Tunnel: Adds 20-byte overhead → 1520-byte outer packet
Problem: Outer link MTU=1500, so the tunnel can only carry a 1480-byte inner packet
Result: Fragmentation or packet loss

With MSS clamping on the tunnel gateway for Host A's outbound traffic:
SYN-ACK: Host B advertises MSS=1440
Gateway rewrites: MSS=1420 (1480 effective inner MTU - 60)
Host A sees the clamped MSS and sends ≤1420-byte TCP payloads
Inner packet: 1420 + 40 IPv6 + 20 TCP = 1480 bytes
Tunnel: 1480 + 20 overhead = 1500-byte outer packet
Result: No fragmentation, no packet loss
```

## Configuring MSS Clamping with ip6tables

```bash
# Method 1: Static MSS value (use when you know the exact path MTU)

# Formula: MSS = (effective_mtu) - 40 (IPv6) - 20 (TCP)
# For a 6in4 tunnel with 1480 effective MTU: MSS = 1480 - 60 = 1420
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1420

# Method 2: Dynamic clamping (preferred - uses kernel path MTU information)
# Automatically clamps to (path MTU - 60 bytes for IPv6)
sudo ip6tables -t mangle -A FORWARD \
    -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Clamp only on a specific tunnel interface
sudo ip6tables -t mangle -A FORWARD \
    -o he-ipv6 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Clamp on both inbound and outbound directions for a tunnel
# so each side sees a safe advertised MSS
sudo ip6tables -t mangle -A FORWARD \
    -i he-ipv6 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu
sudo ip6tables -t mangle -A FORWARD \
    -o he-ipv6 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Verify rules
sudo ip6tables -t mangle -L FORWARD -v -n
```

## Configuring MSS Clamping with nftables

```bash
# Add MSS clamping in nftables (modern alternative to ip6tables)
sudo nft add table ip6 mangle
sudo nft add chain ip6 mangle forward \
    '{ type filter hook forward priority mangle ; policy accept ; }'

# Clamp to specific MSS value
sudo nft add rule ip6 mangle forward \
    tcp flags syn tcp option maxseg size set 1420

# Clamp dynamically using route MTU information
# (equivalent to TCPMSS --clamp-mss-to-pmtu)
sudo nft add rule ip6 mangle forward \
    tcp flags syn tcp option maxseg size set rt mtu

# Verify
sudo nft list table ip6 mangle

# Example persistent config for systems that load /etc/nftables.conf
# via nftables.service
cat << 'EOF' | sudo tee /etc/nftables.conf
#!/usr/sbin/nft -f
table ip6 mangle {
    chain forward {
        type filter hook forward priority mangle; policy accept;
        tcp flags syn tcp option maxseg size set rt mtu
    }
}
EOF
# If your distribution provides nftables.service:
sudo systemctl enable nftables
sudo systemctl restart nftables
```

## Calculating the Correct MSS Value

```python
def calculate_mss(effective_mtu: int, ipv6_header: int = 40,
                  tcp_header: int = 20) -> dict:
    """
    Calculate the TCP MSS value for a given effective MTU.
    """
    mss = effective_mtu - ipv6_header - tcp_header
    return {
        "effective_mtu": effective_mtu,
        "mss": mss,
        "overhead": ipv6_header + tcp_header,
        "adequate": mss > 0,
    }

# Example effective MTUs; actual tunnel overhead varies by protocol and configuration
scenarios = [
    ("Ethernet (no tunnel)",     1500),
    ("6in4 tunnel",              1480),
    ("GRE tunnel",               1476),
    ("WireGuard",                1420),
    ("OpenVPN UDP",              1426),
    ("GRE + IPsec",              1424),
    ("IPv6 minimum",             1280),
]

print(f"{'Scenario':<30} {'MTU':<6} {'MSS':<6}")
print("-" * 44)
for name, mtu in scenarios:
    result = calculate_mss(mtu)
    print(f"{name:<30} {result['effective_mtu']:<6} {result['mss']:<6}")
```

## Testing MSS Clamping

```bash
# Before testing, capture IPv6 TCP handshakes and inspect the MSS option
sudo tcpdump -i eth0 -vv 'ip6 protochain 6'

# Watch for SYN / SYN-ACK packets with MSS options in the capture output:
# IP6 ... Flags [S],  ... options [mss 1440, ...]
# IP6 ... Flags [S.], ... options [mss 1420, ...]

# Verify MSS is being clamped with tcpdump
sudo tcpdump -l -i he-ipv6 -vv 'ip6 protochain 6' 2>&1 | grep 'mss'
# Should show the reduced MSS value in SYN or SYN-ACK packets after clamping
```

## Conclusion

TCP MSS clamping is a reliable workaround for IPv6 PMTU black holes. The `--clamp-mss-to-pmtu` option is preferred over static values because it dynamically adjusts to the actual path MTU. Apply clamping rules at tunnel endpoints in both directions, typically with both the `-i` (inbound) and `-o` (outbound) interface filters, so each peer sees a safe advertised MSS. MSS clamping only affects the initial TCP MSS negotiation, so it works without breaking existing connections and adds minimal overhead.
