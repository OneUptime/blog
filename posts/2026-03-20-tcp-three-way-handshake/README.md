# How to Understand the TCP Three-Way Handshake (SYN, SYN-ACK, ACK)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Protocol, Troubleshooting, Wireshark, IPv4

Description: Understand the TCP three-way handshake process, the role of SYN, SYN-ACK, and ACK packets, and how to observe and troubleshoot handshake failures.

## Introduction

The TCP three-way handshake is the normal connection establishment procedure used by TCP. It synchronizes sequence numbers between client and server before data transfer begins in a normal connection, ensuring reliable and ordered communication. Understanding this process is fundamental to diagnosing connection failures at the transport layer.

## The Three-Way Handshake

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: SYN (seq=100, ack=0)
    Note right of S: Server receives SYN, knows client wants to connect
    S->>C: SYN-ACK (seq=300, ack=101)
    Note left of C: Client receives SYN-ACK and sends final ACK
    C->>S: ACK (seq=101, ack=301)
    Note right of S: Connection ESTABLISHED on both sides
```

1. **SYN**: Client selects an unpredictable Initial Sequence Number (ISN) and sends SYN
2. **SYN-ACK**: Server selects its own ISN, acknowledges client's ISN+1
3. **ACK**: Client acknowledges server's ISN+1, connection established

## Capturing the Handshake

```bash
# Capture TCP packets with SYN or ACK flags on port 80

tcpdump -i eth0 -n 'tcp port 80 and (tcp[tcpflags] & (tcp-syn|tcp-ack) != 0)'

# More readable: capture with sequence numbers
tcpdump -i eth0 -n -S 'tcp port 80'
# -S flag shows absolute (not relative) sequence numbers

# Example output:
# 10:00:00 C > S: Flags [S], seq 1234567890 (SYN)
# 10:00:00 S > C: Flags [S.], seq 987654321, ack 1234567891 (SYN-ACK)
# 10:00:00 C > S: Flags [.], ack 987654322 (ACK)
```

## TCP Flags

| Flag | Meaning | Bit |
|---|---|---|
| SYN | Synchronize sequence numbers | 0x002 |
| ACK | Acknowledgment field valid | 0x010 |
| RST | Reset connection | 0x004 |
| FIN | No more data to send | 0x001 |
| PSH | Push data to application | 0x008 |
| URG | Urgent pointer valid | 0x020 |

## What Each Phase Establishes

```bash
# After the SYN-ACK, both sides know:
# - Each other's initial sequence numbers
# - Window sizes (how much data can be buffered)
# - TCP options (MSS, SACK, window scaling, timestamps)

# View negotiated options in tcpdump
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0'
# Shows: mss 1460, sackOK, timestamp, nop, wscale 7
```

## Connection States During Handshake

```bash
# Check connection states on the server
ss -tn state syn-recv
# Shows half-open connections waiting for the third ACK

ss -tn state established
# Shows fully established connections

# On the client
ss -tn state syn-sent
# Shows connections awaiting SYN-ACK
```

## Common Handshake Failures

```bash
# Failure 1: SYN reaches server but no SYN-ACK returns
# -> Server firewall/host stack drops it, or the return path blocks the SYN-ACK
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0'   # Watch for SYN arriving

# Failure 2: SYN-ACK arrives but connection still fails
# -> Client firewall may block it, client may RST, or the final ACK may be dropped
tcpdump -i eth0 -n 'tcp port 80'   # Watch the full exchange

# Failure 3: RST appears during or right after setup
# -> RST instead of SYN-ACK usually means no listener or an active reject
# -> RST after the third ACK usually means the application or proxy aborted
```

## Conclusion

The TCP three-way handshake is primarily a connection setup protocol (sequence synchronization, window advertisement, and option negotiation); unpredictable ISNs also reduce off-path spoofing risk. In a well-placed packet capture, handshake failures are usually visible in the flag sequence. A missing SYN-ACK points to the server side or return path; a missing final ACK points to the client side or network path; an immediate RST depends on which side sent it.
