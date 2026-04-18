# How to Use IPv4 Options Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, IP Options, Packet Analysis, TCP/IP, Security

Description: IPv4 Options are variable-length fields appended after the fixed 20-byte header, providing features like source routing, record route, and timestamps that are rarely used in modern networks.

## What Are IPv4 Options?

The standard IPv4 header is 20 bytes. When the IHL (Internet Header Length) field is greater than 5, the extra 32-bit words contain Options. Options can appear individually or combined, and the header is padded to a 32-bit boundary.

## Common IPv4 Options

| Option Type | Number | Description |
|-------------|--------|-------------|
| End of Option List | 0 | Marks the end of options |
| No Operation (NOP) | 1 | Padding between options |
| Record Route | 7 | Records the route the packet traverses |
| Timestamp | 68 | Records timestamps at each hop |
| Loose Source Route | 131 | Specifies a partial route |
| Strict Source Route | 137 | Specifies the complete route |

## Reading Options with Scapy

```python
from scapy.all import IP, ICMP, IPOption_RR, sr1

# Create a packet with the Record Route option

# IPOption_RR pre-allocates space for 9 IP addresses
pkt = IP(dst="8.8.8.8", options=IPOption_RR()) / ICMP()

reply = sr1(pkt, timeout=3, verbose=False)

if reply:
    # Extract recorded route from the reply
    for opt in reply[IP].options:
        print(f"Option: {opt.option} = {opt}")
```

## Adding a Timestamp Option

```python
from scapy.all import IP, ICMP, IPOption_Timestamp, sr1

pkt = IP(dst="1.1.1.1", options=IPOption_Timestamp(flg=0)) / ICMP()
reply = sr1(pkt, timeout=3, verbose=False)

if reply:
    for opt in reply[IP].options:
        if hasattr(opt, 'timestamp'):
            print(f"Timestamps: {opt.timestamp}")
```

## Why Options Are Rarely Used Today

1. **Performance**: Routers that encounter options must process them in software rather than hardware fast-path forwarding, causing significant latency.
2. **Security**: Source routing options (LSR, SSR) allow attackers to direct traffic through compromised routers, so most networks filter or strip them.
3. **Firewall drops**: Many firewalls drop all packets with IP options as a security policy.

## Blocking IP Options with iptables

```bash
# Drop packets containing any IP options (IHL > 5 means options present)
# The IHL field is in the low nibble of byte 0; > 5 means options are present
iptables -A INPUT -m ipv4options --any-opt -j DROP

# Alternative: drop strict or loose source route options
iptables -A INPUT -m ipv4options --ssrr -j DROP
iptables -A INPUT -m ipv4options --lsrr -j DROP
```

## Parsing Options Manually

```python
def parse_ip_options(header: bytes) -> list:
    """
    Parse IPv4 options from a raw IP header.
    Returns a list of (option_type, option_data) tuples.
    """
    ihl = (header[0] & 0x0F) * 4  # Header length in bytes
    options = []
    i = 20  # Options start at byte 20

    while i < ihl:
        opt_type = header[i]
        if opt_type == 0:   # End of options
            break
        if opt_type == 1:   # NOP
            i += 1
            continue
        opt_len = header[i + 1]
        opt_data = header[i + 2 : i + opt_len]
        options.append((opt_type, opt_data))
        i += opt_len

    return options
```

## Key Takeaways

- IPv4 Options extend the header beyond the fixed 20 bytes when IHL > 5.
- Common options include Record Route, Timestamp, and Source Routing.
- Most routers and firewalls drop or penalize packets with IP options.
- Avoid using IP options in production; use application-layer mechanisms instead.
