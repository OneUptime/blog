# How to Configure DSCP Marking for IPv4 Packets on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DSCP, IPv4, QoS, Linux, iptables, Networking

Description: Mark IPv4 packets with DSCP values using iptables and nftables to enable end-to-end QoS prioritization across network equipment.

DSCP (Differentiated Services Code Point) is a 6-bit field in the IPv4 DS field (historically the ToS byte). Network equipment uses DSCP values to prioritize packets. Marking packets at the host enables QoS policies across routers and switches that honor DSCP.

## DSCP Classes Reference

| DSCP Class | Value | Use Case |
|---|---|---|
| EF (Expedited Forwarding) | 46 (0x2e) | VoIP, real-time audio/video |
| AF41 | 34 | Interactive video conferencing |
| CS5 | 40 | Call signaling |
| AF11 | 10 | High-throughput data |
| CS0 (BE) | 0 | Best effort (default) |
| CS6 | 48 | Network control (routing protocols) |

## Marking with iptables

```bash
# Mark SSH traffic (outbound) with DSCP AF21 (low-latency data)

sudo iptables -t mangle -A OUTPUT -p tcp --dport 22 \
  -j DSCP --set-dscp-class AF21

# Mark VoIP SIP signaling with CS5
sudo iptables -t mangle -A OUTPUT -p udp --dport 5060 \
  -j DSCP --set-dscp-class CS5

# Mark RTP (audio) UDP with EF
sudo iptables -t mangle -A OUTPUT -p udp --dport 10000:20000 \
  -j DSCP --set-dscp-class EF

# Mark HTTP with AF11 (high-throughput data)
sudo iptables -t mangle -A OUTPUT -p tcp --dport 80 \
  -j DSCP --set-dscp-class AF11

# Mark bulk transfers (backup) with CS0 (best effort)
sudo iptables -t mangle -A OUTPUT -p tcp --dport 873 \
  -j DSCP --set-dscp 0
```

## Marking by Raw DSCP Value

```bash
# Set DSCP to decimal 40 (CS5) directly
sudo iptables -t mangle -A OUTPUT -p udp --dport 5060 \
  -j DSCP --set-dscp 40

# View current marking rules
sudo iptables -t mangle -L OUTPUT -n -v
```

## Marking with nftables

```bash
# Create a mangle table for DSCP marking
sudo nft add table ip mangle
sudo nft add chain ip mangle output { type route hook output priority mangle \; }

# Mark VoIP SIP signaling with DSCP CS5 (value 40, shifted into the full DS field byte: 40 << 2 = 160 = 0xa0)
sudo nft add rule ip mangle output udp dport 5060 ip dscp set cs5

# Mark HTTPS with AF41
sudo nft add rule ip mangle output tcp dport 443 ip dscp set af41

# List the rules
sudo nft list chain ip mangle output
```

## Marking Forwarded Traffic

```bash
# Mark packets being forwarded through this Linux router
sudo iptables -t mangle -A FORWARD -p udp --dport 5060 \
  -j DSCP --set-dscp-class CS5
```

## Verifying DSCP Marking

```bash
# Capture traffic and check DSCP values with tcpdump
sudo tcpdump -i eth0 -n -v 'udp port 5060' | grep "tos"
# Look for: tos 0xa0 (CS5 with ECN bits clear)

# Or with Wireshark, filter: ip.dsfield.dscp == 40
```

## Reading DSCP in tc Filters

Once packets are marked, tc can use DSCP values to classify them into HTB classes:

```bash
# Match DSCP EF (0xb8 in the IPv4 DS field byte, mask 0xfc to isolate the DSCP bits)
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip tos 0xb8 0xfc flowid 1:10
```

DSCP marking on Linux hosts integrates with enterprise switches and routers that implement DSCP-based QoS policies for end-to-end traffic prioritization.
