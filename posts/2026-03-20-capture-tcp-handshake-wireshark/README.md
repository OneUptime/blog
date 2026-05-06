# How to Capture and Analyze a TCP Handshake with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Networking, Packet Analysis, Troubleshooting

Description: Capture a TCP three-way handshake in Wireshark, navigate the packet details, and extract timing and option information from the connection establishment.

## Introduction

Wireshark is the most powerful graphical packet analyzer available. For TCP handshake analysis, it provides automatic stream following, sequence number tracking, color-coded TCP states, and detailed TCP option parsing. This guide walks through capturing and interpreting a complete TCP handshake.

## Capturing the Handshake

```bash
# Option 1: Capture directly in Wireshark

# Start Wireshark → select interface → start capture
# Apply display filter: tcp.port == 80

# Option 2: Capture with tcpdump and open in Wireshark
tcpdump -i eth0 -w /tmp/capture.pcap 'tcp port 80'

# While capture is running, trigger a connection:
curl http://10.20.0.5

# Stop capture, open /tmp/capture.pcap in Wireshark
```

## Wireshark Display Filters for Handshakes

```text
# Show only SYN packets (connection initiations)
tcp.flags.syn == 1 && tcp.flags.ack == 0

# Show only SYN-ACK packets
tcp.flags.syn == 1 && tcp.flags.ack == 1

# Show both SYN and SYN-ACK for a specific host
tcp.flags.syn == 1 && ip.addr == 10.20.0.5

# Show the full TCP conversation for one connection
tcp.stream eq 0
```

## Reading the Packet Details

Click on the SYN packet in Wireshark and expand:

```text
Internet Protocol Version 4
  Source: 192.168.1.10
  Destination: 10.20.0.5
  TTL: 64
Transmission Control Protocol
  Source Port: 52341
  Destination Port: 80
  Sequence Number: 1234567890 (relative: 0)
  Flags: 0x002 (SYN)
  Window: 65535
  Options:
    Maximum segment size: 1460 bytes    ← MSS advertised by this sender
    SACK permitted                       ← Selective ACK support
    Timestamps: val=1234567, ecr=0      ← TCP timestamps
    Window scale: 7 (multiply by 128)   ← Window scaling
```

## Calculating Handshake Timing

```text
# In Wireshark's Time column (relative timestamps):
# Frame 1: 0.000000  SYN from client to server
# Frame 2: 0.000823  SYN-ACK from server to client  ← 0.82ms from SYN to SYN-ACK here
# Frame 3: 0.000891  ACK from client to server
#
# Total handshake time: 0.891ms (excellent for LAN)
# On a client-side capture, SYN → SYN-ACK is roughly one RTT plus any server response time
```

## Using Wireshark's TCP Stream Analysis

Right-click a packet → Follow → TCP Stream:

```text
# Shows the complete conversation in order
# Useful for seeing application data right after the handshake
GET / HTTP/1.1
Host: 10.20.0.5
...

HTTP/1.1 200 OK
Content-Type: text/html
...
```

## Using Wireshark Statistics

```text
# Navigate to: Statistics → TCP Stream Graphs → Time Sequence (Stevens)
# Shows sequence number progression over time - good for seeing slow start,
# congestion events, and retransmissions

# Statistics → Conversations → TCP
# Shows all TCP connections with bytes sent/received
```

## Command-Line TCP Analysis with tshark

```bash
# tshark: command-line Wireshark
# Extract handshake details from a pcap
tshark -r /tmp/capture.pcap -Y "tcp.flags.syn==1" \
  -T fields -e frame.time -e ip.src -e ip.dst \
  -e tcp.srcport -e tcp.dstport -e tcp.flags -e tcp.options.mss_val
```

## Conclusion

Wireshark turns raw packet data into readable TCP state information. The handshake analysis reveals MSS values and TCP options such as window scale, SACK, and timestamps that affect the entire connection's performance. Timing between SYN and SYN-ACK reflects the observed delay between those packets, including network latency and any server response time. Combining display filters with stream following lets you trace individual connections through complex captures.
