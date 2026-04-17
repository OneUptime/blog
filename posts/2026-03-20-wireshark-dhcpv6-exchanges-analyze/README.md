# How to Analyze DHCPv6 Exchanges in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, DHCPv6, IPv6, Packet Analysis, Network Debugging, DHCP

Description: A guide to capturing and analyzing DHCPv6 message exchanges in Wireshark to diagnose IPv6 address assignment and DNS configuration issues.

DHCPv6 provides stateful IPv6 address assignment and DNS server information to clients. Wireshark can decode all DHCPv6 message types, making it invaluable for diagnosing DHCPv6 failures.

## DHCPv6 Message Types

| Message Type | Code | Direction | Purpose |
|---|---|---|---|
| Solicit | 1 | Client → Server | Discover DHCPv6 servers |
| Advertise | 2 | Server → Client | Respond to Solicit |
| Request | 3 | Client → Server | Request specific address |
| Confirm | 4 | Client → Server | Confirm existing lease after reboot |
| Renew | 5 | Client → Server | Extend lease |
| Rebind | 6 | Client → Server | Contact any server after Renew fails |
| Reply | 7 | Server → Client | Respond with address/config |
| Release | 8 | Client → Server | Return address |
| Decline | 9 | Client → Server | Reject address (e.g., DAD conflict) |

## Display Filters for DHCPv6

```wireshark
# Show ALL DHCPv6 messages

dhcpv6

# Show only Solicit messages
dhcpv6.msgtype == 1

# Show Solicit and Reply exchanges
dhcpv6.msgtype == 1 || dhcpv6.msgtype == 7

# Show only messages from a specific DUID-LLT link-layer address
dhcpv6.duidllt.link_layer_addr contains aa:bb:cc

# Show DHCPv6 on specific ports (546=client, 547=server)
udp.port == 546 || udp.port == 547
```

## Complete DHCPv6 4-Message Exchange

A successful stateful DHCPv6 exchange follows SARR pattern:

```text
1. Client  → ff02::1:2 (All-DHCPv6-Relay-Agents-and-Servers): SOLICIT
2. Server  → Client link-local: ADVERTISE (offers an address)
3. Client  → ff02::1:2: REQUEST (requests the offered address)
4. Server  → Client link-local: REPLY (confirms the lease)
```

Apply this filter to see the full exchange:

```wireshark
# Show the complete SARR exchange
dhcpv6.msgtype == 1 || dhcpv6.msgtype == 2 ||
dhcpv6.msgtype == 3 || dhcpv6.msgtype == 7
```

## Diagnosing DHCPv6 Issues

### No Response to Solicit

```wireshark
# Show only Solicit messages
dhcpv6.msgtype == 1

# If you see Solicits but no Advertise, the server is not responding
# Check: Is the server reachable? Is ff02::1:2 multicast working?
# Show all traffic destined to the DHCPv6 multicast group
ipv6.dst == ff02::1:2
```

### Address Already in Use (Decline)

```wireshark
# Client sent a Decline (address conflict via DAD)
dhcpv6.msgtype == 9
```

### Lease Renewal Failure

```wireshark
# Show Renew and Rebind messages (client is trying to renew)
dhcpv6.msgtype == 5 || dhcpv6.msgtype == 6

# Show any server replies
dhcpv6
```

## Inspecting DHCPv6 Option Fields

In Wireshark, expand a DHCPv6 packet to see:

- **IANA (Identity Association for Non-temporary Addresses)**: Contains the offered IPv6 address, preferred/valid lifetime
- **DNS Recursive Name Server option (23)**: DNS server addresses
- **Domain Search List option (24)**: DNS search domains
- **Client Identifier (1)**: DUID identifying the client

```wireshark
# Filter by DHCPv6 option type
dhcpv6.option.type == 23   # DNS server option
dhcpv6.option.type == 24   # Domain search list
dhcpv6.option.type == 3    # IA_NA (non-temporary address)
```

## Capture DHCPv6 with tcpdump

```bash
# Capture DHCPv6 traffic (UDP ports 546 and 547)
sudo tcpdump -i eth0 '(udp port 546 or udp port 547)' -w dhcpv6-capture.pcap

# Then analyze in Wireshark
wireshark dhcpv6-capture.pcap
```

## Extract DHCPv6 Leases from Capture

```bash
# Use tshark to extract assigned IPv6 addresses from DHCPv6 Reply messages
tshark -r dhcpv6-capture.pcap \
  -Y "dhcpv6.msgtype == 7" \
  -T fields \
  -e dhcpv6.iaaddr.ip \
  -e dhcpv6.duidllt.link_layer_addr
```

Wireshark's DHCPv6 decoder fully parses all options and message types, enabling rapid diagnosis of address assignment failures, DNS delivery issues, and lease management problems in IPv6 networks.
