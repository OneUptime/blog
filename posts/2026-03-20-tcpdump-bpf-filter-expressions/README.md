# How to Use tcpdump BPF Filter Expressions Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, BPF, Linux, Networking, Packet Capture, Filtering

Description: Master Berkeley Packet Filter (BPF) syntax to write precise tcpdump filters using byte offset matching, protocol fields, and bitwise operations.

BPF (Berkeley Packet Filter) is the engine behind tcpdump's filtering. Understanding its byte-offset syntax unlocks powerful filtering capabilities - matching specific protocol fields, flag combinations, and payload content that simple host/port filters can't express.

## BPF Syntax Fundamentals

```text
proto[offset:size] operator value

proto:   ip, ip6, tcp, udp, icmp, arp, ether
offset:  byte offset within the protocol header
size:    1 (byte), 2 (short), 4 (int)
operator: =, !=, <, <=, >, >=, &

Examples:
  ip[8]          → 9th byte of IP header (TTL)
  tcp[13]        → 14th byte of TCP header (flags)
  tcp[13:1]      → same (1 byte)
  ip[2:2]        → bytes 2-3 of IP header (total length)
```

## Common Protocol Header Offsets

```text
IP Header (byte offsets):
  0: version+IHL    1: DSCP/ECN
  2: total length   8: TTL
  9: protocol      12: source IP
 16: dest IP       20+: options (if IHL > 5)

TCP Header (byte offsets, relative to TCP start):
  0: src port       2: dst port
  4: seq number     8: ack number
 12: data offset/reserved   13: flags
 14: window size   20: options
```

## TCP Flag Filters

```bash
# Named flags (preferred for readability)

sudo tcpdump 'tcp[tcpflags] & tcp-syn != 0'    # SYN set
sudo tcpdump 'tcp[tcpflags] & tcp-ack != 0'    # ACK set
sudo tcpdump 'tcp[tcpflags] & tcp-rst != 0'    # RST set
sudo tcpdump 'tcp[tcpflags] & tcp-fin != 0'    # FIN set
sudo tcpdump 'tcp[tcpflags] & tcp-push != 0'   # PSH set

# Numeric equivalents:
# tcp-fin  = 0x01, tcp-syn  = 0x02, tcp-rst  = 0x04
# tcp-push = 0x08, tcp-ack  = 0x10, tcp-urg  = 0x20

# Pure SYN (SYN set, ACK not set)
sudo tcpdump 'tcp[13] & 0x12 = 0x02'

# SYN-ACK (both SYN and ACK set)
sudo tcpdump 'tcp[13] & 0x12 = 0x12'
```

## IP Header Filters

```bash
# Filter by IP TTL
sudo tcpdump 'ip[8] < 10'      # TTL less than 10 (many hops used)

# Filter by DSCP value (upper 6 bits of byte 1)
sudo tcpdump 'ip[1] >> 2 = 46'  # DSCP EF (Expedited Forwarding)

# Filter by protocol number (byte 9 of IP header)
sudo tcpdump 'ip[9] = 6'     # TCP (protocol 6)
sudo tcpdump 'ip[9] = 17'    # UDP (protocol 17)
sudo tcpdump 'ip[9] = 1'     # ICMP (protocol 1)
sudo tcpdump 'ip[9] = 50'    # ESP (protocol 50 - IPsec)

# Packets with IP options set (IHL > 5)
sudo tcpdump 'ip[0] & 0x0f > 5'
```

## Filter by Packet Size

```bash
# Packets larger than 1400 bytes (near MTU)
sudo tcpdump 'ip[2:2] > 1400'

# Packets smaller than 64 bytes (control traffic)
sudo tcpdump 'ip[2:2] < 64'

# Alternative using built-in packet length keywords (inclusive)
sudo tcpdump 'greater 1400'  # packet length >= 1400
sudo tcpdump 'less 64'       # packet length <= 64
```

## Filter HTTP Verbs in TCP Payload

```bash
# Capture HTTP GET requests
# "GET " = 0x47455420 at start of TCP payload
sudo tcpdump -A 'tcp dst port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'

# HTTP POST
sudo tcpdump -A 'tcp dst port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x504f5354'

# Likely HTTP method (uppercase ASCII first byte)
sudo tcpdump 'tcp dst port 80 and tcp[((tcp[12] & 0xf0) >> 2):1] >= 0x41 and tcp[((tcp[12] & 0xf0) >> 2):1] <= 0x5a'
```

## ICMP Type Filters

```bash
# ICMP echo request/reply (ping)
sudo tcpdump 'icmp[icmptype] = icmp-echo'          # or: icmp[0] = 8
sudo tcpdump 'icmp[icmptype] = icmp-echoreply'     # or: icmp[0] = 0

# ICMP unreachable
sudo tcpdump 'icmp[icmptype] = icmp-unreach'       # type 3

# ICMP redirect
sudo tcpdump 'icmp[0] = 5'
```

Mastering BPF byte-offset syntax transforms tcpdump from a simple "capture everything" tool into a surgical instrument that captures exactly - and only - the packets you need.
