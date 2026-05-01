# How to Understand DHCPv6 Relay Message Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Relay, Message Format, Protocol, RFC 8415, Networking

Description: Understand the DHCPv6 RELAY-FORW and RELAY-REPL message format including header fields, relay options, and nested relay messages.

## DHCPv6 Relay Message Structure

DHCPv6 relay messages (RELAY-FORW and RELAY-REPL) have a distinct format from client messages, defined in RFC 8415:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    msg-type   |   hop-count   |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               |
|                                                               |
|            link-address (16 bytes)                           |
|                               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                               |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               |
|                                                               |
|            peer-address (16 bytes)                           |
|                               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                               |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+      options                  |
.                                                               .
```

**Field Descriptions:**
- `msg-type`: 12 = RELAY-FORW, 13 = RELAY-REPL
- `hop-count`: Set to 0 by the first relay and incremented at each relay hop; relays discard a received RELAY-FORW with `hop-count >= 8`
- `link-address`: Address the server uses to identify the client's link; typically a GUA/ULA on the client link, though nested relays may set it to `0`
- `peer-address`: Source address of the client or relay from which the message was received
- `options`: Variable-length relay options

## Key Relay Options

| Code | Name | Description |
|---|---|---|
| 9 | Relay Message | Encapsulated client message or inner relay |
| 18 | Interface-ID | Relay interface identifier |
| 37 | Remote-ID | Enterprise-specific subscriber identifier |
| 38 | Subscriber-ID | Subscriber-specific identifier |
| 79 | Client Link-Layer Address | First-hop relay can include the client's link-layer address |

## Reading RELAY-FORW with tshark

```bash
# Decode RELAY-FORW messages

tshark -i eth0 -f 'udp port 547' \
    -Y 'dhcpv6.msgtype == 12' \
    -V 2>/dev/null

# Example output interpretation:
# DHCPv6
#   Message type: Relay-forw (12)
#   Hop count: 0
#   Link address: 2001:db8:1::1         ← Address used to identify the client's link
#   Peer address: fe80::abcd:1234       ← Source address from the client
#   DHCPv6 Relay Message                ← Option 9: encapsulated message
#     DHCPv6
#       Message type: Solicit (1)       ← Original client message
#   Interface-ID: eth0                  ← Option 18
```

## Python: Parse RELAY-FORW from Packet Capture

```python
from scapy.all import rdpcap
from scapy.layers.dhcp6 import (
    DHCP6_RelayForward,
    DHCP6OptIfaceId,
    DHCP6OptRelayMsg,
    DHCP6OptRemoteID,
)
from scapy.packet import NoPayload

def analyze_dhcpv6_relay(pcap_file):
    packets = rdpcap(pcap_file)

    for pkt in packets:
        if not pkt.haslayer(DHCP6_RelayForward):
            continue

        relay = pkt[DHCP6_RelayForward]
        print(f"RELAY-FORW:")
        print(f"  hop-count: {relay.hopcount}")
        print(f"  link-address: {relay.linkaddr}")
        print(f"  peer-address: {relay.peeraddr}")

        # DHCPv6 relay options are chained as payload layers in Scapy.
        opt = relay.payload
        while not isinstance(opt, NoPayload):
            if isinstance(opt, DHCP6OptRelayMsg):
                print(f"  Inner message type: {opt.message.msgtype}")
            elif isinstance(opt, DHCP6OptIfaceId):
                iface_id = opt.ifaceid.decode("ascii", errors="replace")
                print(f"  Interface-ID (Option 18): {iface_id}")
            elif isinstance(opt, DHCP6OptRemoteID):
                print(f"  Remote-ID (Option 37): {opt.remoteid.hex()}")

            opt = opt.payload

# Usage
# analyze_dhcpv6_relay("/tmp/dhcpv6-relay.pcap")
```

## Nested Relay Messages (Multiple Relay Hops)

When a RELAY-FORW passes through a second relay, it is encapsulated again. If the previous relay used a GUA/ULA source address, the outer relay sets `link-address` to `0`:

```text
Outer RELAY-FORW:
  hop-count: 1
  link-address: 0              (set to 0 because Relay1 used a GUA/ULA source address)
  peer-address: 2001:db8:1::1  (Relay1's address)
  Option 9 (Relay Message):
    Inner RELAY-FORW:
      hop-count: 0
      link-address: 2001:db8:1::1  (Relay1's address)
      peer-address: fe80::client   (Client's link-local)
      Option 9 (Relay Message):
        SOLICIT
      Option 18: "eth0.100"
```

```bash
# Capture and show nested relay depth
tshark -i eth1 -f 'udp port 547' \
    -Y 'dhcpv6.msgtype == 12' \
    -T fields \
    -e dhcpv6.hopcount \
    -e dhcpv6.linkaddr \
    -e dhcpv6.peeraddr
```

## RELAY-REPL Message Format

RELAY-REPL has the same header as RELAY-FORW but with `msg-type=13`. The relay agent:
1. Receives RELAY-REPL from the server or previous relay
2. Extracts the inner message from Option 9
3. Forwards the inner message to the address in `peer-address` (previous relay or client)

```bash
# Monitor relay reply processing
tshark -i eth0 -f 'udp port 547' \
    -Y 'dhcpv6.msgtype == 13' \
    -T fields \
    -e dhcpv6.msgtype \
    -e dhcpv6.linkaddr
```

## Conclusion

RELAY-FORW (type 12) encapsulates client messages and adds relay context: `link-address` (the address the server uses to identify the client's link), `peer-address` (the source client/relay address), and options like Interface-ID (18) and Remote-ID (37). Multiple relay hops nest relay messages inside Option 9, incrementing `hop-count` at each hop. Relay agents discard a received RELAY-FORW with `hop-count >= 8` to prevent loops. Understanding the message format is essential for server-side classification and debugging relay chains.
