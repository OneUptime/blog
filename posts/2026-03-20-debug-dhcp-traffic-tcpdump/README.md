# How to Debug DHCP Traffic with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, tcpdump, Networking, Debugging, Packet Capture

Description: Using tcpdump to capture DHCP traffic reveals the complete DORA exchange, DHCP options, server responses, and failure conditions, making it the most direct way to diagnose DHCP issues.

## Basic DHCP Capture

```bash
# Capture all DHCP traffic (UDP 67 and 68) on eth0

sudo tcpdump -i eth0 -n 'port 67 or port 68'

# With verbose output (shows DHCP options)
sudo tcpdump -i eth0 -n -v 'port 67 or port 68'

# Save to file for later analysis
sudo tcpdump -i eth0 -n 'port 67 or port 68' -w /tmp/dhcp.pcap
```

## Reading the Capture

Sample verbose output:
```text
12:01:01 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request
    DHCP Message Type: DHCP Discover (1)
    Client Ethernet: aa:bb:cc:dd:ee:ff
    Hostname: my-laptop
    Parameter Request List: ...

12:01:01 IP 10.0.0.53.67 > 255.255.255.255.68: BOOTP/DHCP, Reply
    DHCP Message Type: DHCP Offer (2)
    Your IP: 192.168.1.105
    Server IP: 10.0.0.53
    Options: subnet-mask, router, domain-name-server, ...
```

## Filtering Specific DHCP Events

```bash
# Capture only DHCP Discovers
sudo tcpdump -i eth0 -v 'port 67 or port 68' | grep -A10 "Discover"

# Capture only DHCP NAK responses
sudo tcpdump -i eth0 -v 'port 67 or port 68' | grep -A5 "DHCP-NAK\|DHCPNAK"

# Capture traffic for a specific MAC address
sudo tcpdump -i eth0 -v 'port 67 or port 68' | grep -A15 "aa:bb:cc:dd:ee:ff"
```

## Parsing a PCAP File

```bash
# Read and decode a saved capture
tcpdump -r /tmp/dhcp.pcap -v

# Extract specific fields with tshark
tshark -r /tmp/dhcp.pcap -T fields \
    -e frame.time \
    -e ip.src \
    -e ip.dst \
    -e dhcp.option.dhcp \
    -e dhcp.ip.your \
    -e dhcp.option.dhcp_server_id \
    -Y "dhcp"
```

## Python: Parse DHCP Packets from pcap

```python
from scapy.all import rdpcap, IP, BOOTP, DHCP

pcap = rdpcap("/tmp/dhcp.pcap")

for pkt in pcap:
    if pkt.haslayer(DHCP):
        opts = dict(o for o in pkt[DHCP].options if isinstance(o, tuple) and len(o) == 2)
        msg_type = opts.get("message-type", 0)
        type_names = {1:"Discover", 2:"Offer", 3:"Request",
                      4:"Decline", 5:"ACK", 6:"NAK", 7:"Release"}
        print(f"DHCP {type_names.get(msg_type, msg_type)}: "
              f"src={pkt[IP].src} "
              f"offered={pkt[BOOTP].yiaddr}")
```

## Diagnosing with tcpdump

| What You See | What It Means |
|-------------|--------------|
| Discover, no Offer | DHCP server not reachable |
| Discover + Offer + no ACK | Firewall blocking port 68 responses |
| Discover + NAK | Client requesting IP from wrong subnet |
| Multiple Offers | Rogue DHCP server present |
| Discover with 0.0.0.0 src | Normal - client has no IP yet |

## Key Takeaways

- `sudo tcpdump -i eth0 -v 'port 67 or port 68'` is the fastest diagnostic for DHCP issues.
- Seeing only Discovers with no Offers means the server is unreachable or the pool is exhausted.
- Multiple DHCP Offers indicate a rogue server - investigate immediately.
- Use `-w /tmp/dhcp.pcap` to save captures for later Wireshark analysis.
