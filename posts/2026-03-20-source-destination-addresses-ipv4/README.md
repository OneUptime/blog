# How to Read Source and Destination Addresses in IPv4 Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, IP Addresses, Packet Analysis, TCP/IP

Description: The Source and Destination Address fields in the IPv4 header each occupy 32 bits and identify the originating and target hosts, forming the basis for all routing and filtering decisions.

## Address Fields in the IPv4 Header

The IPv4 header contains two 32-bit address fields:
- **Source Address** (bytes 12–15): The IP address of the sender.
- **Destination Address** (bytes 16–19): The IP address of the intended recipient.

Under ordinary forwarding, these addresses remain unchanged across the path. NAT rewrites these fields, and IPv4 source-routing options can also alter the destination address. In standard destination-based forwarding, routers select routes by matching the destination address.

## Parsing Addresses from a Raw Packet

```python
import socket
import struct

def parse_ipv4_addresses(raw_packet: bytes):
    """
    Extract source and destination IPv4 addresses from a raw packet.
    Assumes packet begins at the IP header (no Ethernet framing).
    """
    # Source at bytes 12-15, destination at bytes 16-19
    src_bytes = raw_packet[12:16]
    dst_bytes = raw_packet[16:20]

    src_ip = socket.inet_ntoa(src_bytes)
    dst_ip = socket.inet_ntoa(dst_bytes)
    return src_ip, dst_ip

# Craft a test raw header

header = struct.pack("!BBHHHBBH4s4s",
    0x45, 0, 60, 0, 0, 64, 6, 0,
    socket.inet_aton("192.168.1.100"),   # Source
    socket.inet_aton("203.0.113.10"),    # Destination (TEST-NET-3 example address)
)

src, dst = parse_ipv4_addresses(header)
print(f"Source: {src}  Destination: {dst}")
# Source: 192.168.1.100  Destination: 203.0.113.10
```

## Filtering by Address with tcpdump

```bash
# Capture all packets from a specific source
tcpdump -i eth0 'src host 192.168.1.100'

# Capture traffic to a specific destination
tcpdump -i eth0 'dst host 8.8.8.8'

# Capture bidirectional traffic between two hosts
tcpdump -i eth0 'host 192.168.1.100 and host 8.8.8.8'

# Show source and destination IPs for each packet (-n suppresses DNS)
tcpdump -i eth0 -n -q
```

## NAT and Address Translation

Network Address Translation (NAT) modifies these fields in transit. The router performing NAT rewrites the source address on outbound packets (replacing a private IP with a public IP) and the destination address on inbound packets (restoring the private IP). This is why the addresses observed mid-path may differ from those at the endpoints.

## Filtering with iptables

```bash
# Allow traffic only from a specific source subnet
iptables -A INPUT -s 10.0.0.0/8 -j ACCEPT

# Block traffic to a specific destination
iptables -A OUTPUT -d 192.168.0.0/16 -j DROP
```

## Converting Between Formats

```python
import socket
import struct

# Dotted-decimal to 32-bit integer
ip_str = "192.168.1.1"
ip_int = struct.unpack("!I", socket.inet_aton(ip_str))[0]
print(f"{ip_str} = {ip_int} (decimal) = 0x{ip_int:08X} (hex)")

# 32-bit integer back to dotted-decimal
ip_back = socket.inet_ntoa(struct.pack("!I", ip_int))
print(f"0x{ip_int:08X} = {ip_back}")
```

## Key Takeaways

- Source and Destination Addresses occupy bytes 12–15 and 16–19 of the IPv4 header.
- Standard destination-based forwarding uses the Destination Address and longest-prefix match.
- NAT modifies these fields; addresses seen at intermediate hops may differ from endpoints.
- Use `socket.inet_aton()` and `socket.inet_ntoa()` in Python for address conversions.
