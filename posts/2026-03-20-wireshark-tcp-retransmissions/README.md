# How to Identify TCP Retransmissions in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Retransmission, Networking, Performance, Diagnostic

Description: Use Wireshark display filters and the Expert Information panel to identify TCP retransmissions, duplicate ACKs, and out-of-order packets that indicate network packet loss.

TCP retransmissions are the smoking gun for packet loss. Every retransmission means a packet was sent, didn't get acknowledged in time, and had to be re-sent - adding latency and reducing throughput.

## Filter for TCP Retransmissions

```wireshark
# Show all TCP retransmission types

tcp.analysis.retransmission or tcp.analysis.fast_retransmission

# Fast retransmissions (triggered by 3 duplicate ACKs - reactive)
tcp.analysis.fast_retransmission

# Regular retransmissions (timeout-based - slower recovery)
tcp.analysis.retransmission

# Out-of-order segments (reordering or loss)
tcp.analysis.out_of_order

# Duplicate ACKs (signal of loss before retransmission)
tcp.analysis.duplicate_ack

# Show all analysis flags at once
tcp.analysis.flags
```

## Understanding the Retransmission Types

```text
Type                   Meaning
---------------------  ------------------------------------------
Retransmission         Segment retransmitted after RTO timer expired
                       (slow - waited for timeout)

Fast Retransmission    Retransmitted after 3 duplicate ACKs
                       (fast - didn't wait for timeout)

Out-of-Order           Segment arrived but earlier ones are missing
                       (reordering or loss of earlier segment)

Duplicate ACK          Receiver re-ACKed to signal a gap
                       (precursor to fast retransmission)

Spurious Retransmission Retransmitted but original was received
                       (timeout too aggressive, not actual loss)
```

## Use Expert Information for Overview

```text
Analyze → Expert Information

Shows all flagged events by severity:
  Warning → Out-of-order segments, connection resets (RST),
            previous segment not captured, zero window
  Note    → Retransmissions, fast retransmissions,
            spurious retransmissions, duplicate ACKs

Sort by "Severity" to see the most serious issues first.
Count of each type gives you a quick health summary.
```

## Analyzing Retransmission Patterns

```wireshark
# Retransmissions from a specific IP (identify the losing side)
tcp.analysis.retransmission and ip.src == 192.168.1.100

# Retransmissions to a specific server
tcp.analysis.retransmission and ip.dst == 10.0.0.50

# Retransmissions on HTTPS traffic
tcp.analysis.retransmission and tcp.port == 443
```

## Calculate Retransmission Rate

```bash
# Using tshark (command line Wireshark) to count retransmissions
tshark -r capture.pcap -q -z io,stat,1,"tcp.analysis.retransmission"

# Count total packets vs retransmissions
TOTAL=$(tshark -r capture.pcap | wc -l)
RETRANS=$(tshark -r capture.pcap -Y 'tcp.analysis.retransmission' | wc -l)
echo "Retransmission rate: $RETRANS / $TOTAL"
```

## Color Coding for Quick Identification

Wireshark colors retransmissions by default:

```text
Salmon/pink background, near-black text → Bad TCP
  (retransmissions, out-of-order, duplicate ACKs,
  tcp.analysis.flags without window/keepalive updates)

Pale yellow background, dark red text   → TCP RST
  (tcp.flags.reset == 1)

To verify or customize:
  View → Coloring Rules
  Look for "Bad TCP" and "TCP RST" rules
```

## Correlate Retransmissions with Application Slowness

```wireshark
# Filter a specific TCP stream and look for retransmissions within it
tcp.stream == 5 and tcp.analysis.retransmission

# Check the time between retransmission and original packet:
# In packet details look at:
# [Expert Info: Retransmission (RTO: 200ms)]
# High RTO = high loss, conservative TCP backoff

# The sequence number in retransmission matches the original
# tcp.seq == <sequence number of lost packet>
```

High retransmission rates correlate directly with slow application performance - every retransmission adds at least one RTT (often much more) to response times.
