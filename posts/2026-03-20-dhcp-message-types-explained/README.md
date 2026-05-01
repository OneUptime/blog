# How to Understand DHCP Message Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, Protocol, DHCP Messages, Network Diagnostics

Description: DHCP defines eight message types (1–8) carried in option 53, each serving a specific role in the lease lifecycle from initial discovery through release and decline, plus the DHCPINFORM for...

## DHCP Message Type Option (Option 53)

DHCP message type is carried in option 53, a single byte:

| Value | Message | Sent By | Purpose |
|-------|---------|---------|---------|
| 1 | DHCPDISCOVER | Client | Initial broadcast to find servers |
| 2 | DHCPOFFER | Server | Offer an IP address |
| 3 | DHCPREQUEST | Client | Accept offer or renew lease |
| 4 | DHCPDECLINE | Client | Reject assigned IP (already in use) |
| 5 | DHCPACK | Server | Confirm lease assignment |
| 6 | DHCPNAK | Server | Reject renewal or invalid request |
| 7 | DHCPRELEASE | Client | Release current IP back to server |
| 8 | DHCPINFORM | Client | Request options only (has static IP) |

## Message Flows

### Normal DORA (New Lease)
```text
Client → DHCPDISCOVER (broadcast)
Server → DHCPOFFER (broadcast/unicast)
Client → DHCPREQUEST (broadcast, confirms offer)
Server → DHCPACK (broadcast/unicast, confirms lease)
```

### Renewal (T1)
```text
Client → DHCPREQUEST (unicast to server)
Server → DHCPACK (unicast) or DHCPNAK (if invalid)
```

### DHCPDECLINE (IP Already in Use)
```text
Client → DHCPDISCOVER
Server → DHCPOFFER (192.168.1.50)
Client → DHCPREQUEST
Server → DHCPACK
Client → ARP probe 192.168.1.50 ... conflict detected!
Client → DHCPDECLINE
```

### DHCPINFORM (Get Options Without IP)
```text
Client → DHCPINFORM (has static IP, wants DNS/domain options)
Server → DHCPACK (options only, no lease time; yiaddr not filled)
```

## Capturing and Identifying Message Types

```bash
# Capture DHCP traffic and show message types

sudo tcpdump -i eth0 'port 67 or port 68' -v -n 2>/dev/null | \
  grep -E "DHCP|Message|Request|Offer|Discover|Ack|Nak"

# tshark: show message type for each DHCP packet
tshark -i eth0 -Y "dhcp" \
  -T fields -e ip.src -e ip.dst -e dhcp.type
```

## DHCPNAK: When the Server Rejects

```bash
# Look for DHCPNAK in the DHCP server logs
journalctl -u isc-dhcp-server | grep DHCPNAK

# Common reasons for DHCPNAK:
# - Client requests IP from wrong subnet
# - Client's previous IP was assigned to another device
# - Admin policy change rejected the old IP
```

## DHCPDECLINE Handling on Server

When the server receives a DHCPDECLINE:
- It marks the declined IP as not available.
- The IP is not offered again until the server makes it available again.
- This can deplete the pool if DHCPDECLINE storms occur.

## Key Takeaways

- Option 53 carries the DHCP message type (1–8).
- DHCPNAK tells the client to restart the DORA process.
- DHCPDECLINE is sent by the client when an ARP probe after DHCPACK detects the suggested IP is already in use.
- DHCPINFORM is used by statically configured hosts that want network options but not an IP assignment.
