# How to Analyze DHCP Packets in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Wireshark, Packet Analysis, Network Diagnostics

Description: Wireshark provides detailed DHCP packet dissection showing all options, message types, and field values, enabling engineers to diagnose lease failures, verify option delivery, and investigate...

## Capturing DHCP Traffic

Start a capture in Wireshark on your network interface. Apply a capture filter before starting:

```text
# Capture filter (BPF syntax)

port 67 or port 68
```

## Display Filters for DHCP

```text
# Show all DHCP packets
dhcp

# Filter by message type
dhcp.option.dhcp == 1   # DHCPDISCOVER
dhcp.option.dhcp == 2   # DHCPOFFER
dhcp.option.dhcp == 3   # DHCPREQUEST
dhcp.option.dhcp == 5   # DHCPACK
dhcp.option.dhcp == 6   # DHCPNAK

# Filter by client MAC
dhcp.hw.mac_addr == aa:bb:cc:dd:ee:ff

# Filter by offered IP
dhcp.ip.your == 192.168.1.105

# Show packets with specific option (e.g., option 43)
dhcp.option.type == 43
```

## Reading the DHCP Dissection

When you click a DHCP packet in Wireshark and expand "Dynamic Host Configuration Protocol":

- **BOOTP op code**: 1=Boot Request, 2=Boot Reply
- **Client IP address**: 0.0.0.0 for new requests
- **Your (client) IP address**: Offered/Assigned IP
- **Next server IP address**: `siaddr`, the next bootstrap/PXE server IP if one is provided
- **Client MAC address**: Hardware address of client
- **Options section**:
  - Option 53: DHCP Message Type
  - Option 54: DHCP Server Identifier
  - Option 51: Lease Time
  - Option 1: Subnet Mask
  - Option 3: Router
  - Option 6: Domain Name Server

## tshark CLI Equivalent

```bash
# Show DHCP message type and key fields for each packet
tshark -r capture.pcap -Y "dhcp" \
    -T fields \
    -e frame.number \
    -e ip.src \
    -e ip.dst \
    -e dhcp.option.dhcp \
    -e dhcp.ip.your \
    -e dhcp.option.router \
    -e dhcp.option.domain_name_server \
    -E header=y -E separator=,

# Statistics: count each DHCP message type
tshark -r capture.pcap -q -z dhcp,stat
```

## Following a Complete DORA Conversation

In Wireshark:
1. Click any DHCP packet from your client.
2. Right-click → **Follow** → **UDP Stream**.
3. The packets in that UDP conversation will be shown in sequence.

Or filter by transaction ID:
```text
dhcp.id == 0x12345678
```

## Identifying Issues in Wireshark

| Observation | Diagnosis |
|-------------|-----------|
| Discovers only (no offers) | DHCP server or relay unreachable, or replies blocked |
| NAK message | Client's IP invalid for current network |
| Multiple offers from different IPs | Multiple DHCP servers present; investigate for a rogue server if unexpected |
| Offer with wrong gateway | Misconfigured server |
| Missing option 3 (router) | No default gateway delivered |

## Key Takeaways

- Use `dhcp` as the display filter in Wireshark for DHCP traffic.
- Click the Options section to verify every DHCP option value delivered to the client.
- `tshark -q -z dhcp,stat` provides a quick count of each DHCP message type in a capture.
- Filter by `dhcp.hw.mac_addr` to isolate a single client's complete DHCP conversation.
