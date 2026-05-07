# How to Analyze DHCP DORA Process with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, DHCP, Networking, Packet Analysis, DORA, Troubleshooting

Description: Learn how to capture and analyze the DHCP DORA (Discover, Offer, Request, Acknowledge) process using Wireshark to troubleshoot IP address assignment.

---

DHCP uses a four-step handshake known as DORA - Discover, Offer, Request, Acknowledge - to assign IP addresses to clients. Wireshark lets you capture and inspect each message to diagnose lease failures, address conflicts, and misconfigurations.

---

## Capture DHCP Traffic

```bash
# Capture DHCP traffic on the network interface (Linux)

sudo wireshark -i eth0 -k

# Or capture with tcpdump and open in Wireshark later
sudo tcpdump -i eth0 -w dhcp-capture.pcap 'udp port 67 or udp port 68'
wireshark dhcp-capture.pcap
```

---

## Apply a Wireshark Display Filter

```text
# Show only DHCP packets
dhcp

# Show only DHCP Discover messages
dhcp.option.dhcp == 1

# Show only DHCP Offer messages
dhcp.option.dhcp == 2

# Show only DHCP Request messages
dhcp.option.dhcp == 3

# Show only DHCP Acknowledge messages
dhcp.option.dhcp == 5
```

---

## Understanding the DORA Messages

| Step        | Direction                   | Description                                         |
|-------------|-----------------------------|-----------------------------------------------------|
| Discover    | Client → Broadcast          | Client requests an IP; sent to 255.255.255.255      |
| Offer       | Server → Client or Broadcast | Server offers an IP with lease time and options   |
| Request     | Client → Broadcast          | Client formally requests the offered IP             |
| Acknowledge | Server → Client or Broadcast | Server confirms the lease                         |

---

## What to Look for in Each Packet

**Discover:**
- Source IP: `0.0.0.0`, Destination: `255.255.255.255`
- Transaction ID (`xid`) ties the exchange together
- Client hardware (MAC) address in `chaddr` field

**Offer:**
- `yiaddr` field shows the IP being offered
- Options include lease time, subnet mask, gateway, DNS

**Request:**
- Client echoes back the offered IP in Option 50
- Server ID in Option 54 tells which server is being accepted

**Acknowledge:**
- Confirms the IP, lease duration, and options
- `DHCPNAK` instead of `DHCPACK` indicates a rejection

---

## Diagnose DHCP Issues

```text
# Check for DHCPNAK responses
dhcp.option.dhcp == 6

# Filter by specific client MAC address
dhcp.hw.mac_addr == aa:bb:cc:dd:ee:ff

# Filter by transaction ID to follow one full DORA
dhcp.id == 0x12345678
```

---

## Summary

Use Wireshark with the `dhcp` display filter to isolate and inspect DHCP DORA traffic. Match packets by `xid` (transaction ID) to follow a single client exchange. Look at `yiaddr`, Option 50, and Option 54 to verify address assignment, and watch for DHCP NAK messages which indicate lease rejections.
