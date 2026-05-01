# How to Diagnose TCP Retransmissions and Window Zero Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Retransmission, Window Zero, Wireshark, tcpdump, Performance

Description: Learn how to identify and diagnose TCP retransmissions and window zero conditions using command-line tools and Wireshark, and determine whether the root cause is packet loss or application slowness.

## What Cause TCP Retransmissions and Window Zero?

**TCP retransmissions** occur when a sent segment is not acknowledged within the retransmission timeout (RTO). Causes:
- Packet loss (network congestion, flapping links)
- Latency spikes or severe jitter causing the ACK to arrive after the RTO expires
- Firewall dropping packets silently

**Window Zero** occurs when the receiver's buffer fills up and it advertises a zero receive window. The sender stops sending new data until the receiver sends a window update, aside from zero-window probes or retransmissions. Causes:
- Application not reading data fast enough
- Insufficient receive buffer configuration
- Slow application processing

## Step 1: Check Global Retransmission Counters

```bash
# Quick retransmission count

netstat -s | grep -i "retransmit\|window"

# Output:
#     12456 segments retransmitted
#     0 retransmits while in timeout state
#     0 out of window
#     32 connections reset due to unexpected data

# Socket summary (useful context, not retransmission counters)
ss -s

# Using nstat for precise counters
nstat -az | grep -E "TcpRetransSegs|TcpInErrs|TcpExt(TCPLostRetransmit|TCPTimeouts|TCPFastRetrans|TCPSackFailures)"

# Key counters:
# TcpRetransSegs       - total retransmitted TCP segments
# TcpExtTCPTimeouts    - retransmission timeouts
# TcpExtTCPFastRetrans - fast retransmits triggered during duplicate-ACK recovery
# TcpInErrs            - inbound TCP errors
```

## Step 2: Monitor Live Retransmissions with ss

```bash
# Watch active TCP connections for retransmissions
watch -n 1 "ss -tin | grep -E 'bytes_retrans:|retrans:|rto:|rtt:'"

# Show connections with retransmitted bytes or retransmit counters
ss -tin | grep -B1 -E 'bytes_retrans:[1-9]|retrans:[1-9][0-9]*/|retrans:[0-9]+/[1-9][0-9]*'

# Key fields in ss -tin output:
# rto:200             - current retransmission timeout in ms
# rtt:1.5/0.5         - mean RTT / mean deviation
# bytes_retrans:117   - retransmitted payload bytes on this socket
# retrans:0/3         - retransmission counters reported by ss
```

## Step 3: Capture and Analyze with tcpdump

```bash
# Capture all traffic on port 443 for 60 seconds
sudo timeout --signal=INT 60 tcpdump -i eth0 -w /tmp/retrans-capture.pcap port 443

# Analyze for retransmissions
tshark -r /tmp/retrans-capture.pcap -Y "tcp.analysis.retransmission or tcp.analysis.fast_retransmission" \
  -T fields -e frame.time -e ip.src -e ip.dst -e tcp.seq \
  -e tcp.analysis.retransmission -e tcp.analysis.fast_retransmission

# Check for zero-window events
tshark -r /tmp/retrans-capture.pcap -Y "tcp.analysis.zero_window or tcp.analysis.zero_window_probe or tcp.analysis.zero_window_probe_ack" \
  -T fields -e frame.time -e ip.src -e ip.dst -e tcp.window_size
```

## Step 4: Wireshark TCP Analysis

In Wireshark:

1. Open the PCAP file
2. Go to **Statistics → TCP Stream Graphs → Time-Sequence Graph (tcptrace)**
3. Look for:
   - **Backward jumps or repeated sequence numbers** - retransmissions
   - **Zero-window markers or long flat periods** - receiver stalls
4. Use display filter: `tcp.analysis.flags` to highlight all TCP anomalies

```text
# Useful Wireshark display filters:
tcp.analysis.retransmission          - retransmitted segments
tcp.analysis.fast_retransmission     - duplicate-ACK driven fast retransmit
tcp.analysis.duplicate_ack           - duplicate ACKs (often indicate loss or reordering)
tcp.window_size == 0                 - calculated receive window is zero
tcp.analysis.zero_window             - window zero events
tcp.analysis.zero_window_probe       - probes sent after window zero
```

## Step 5: Distinguish Loss vs Application Slow

```bash
# Check if retransmissions correlate with network loss or latency
ping -c 100 <destination-ip>   # Basic ICMP loss/latency check

# ICMP loss is only a hint:
# retransmissions without zero-window usually point to loss, reordering, or RTT spikes on the path
# repeated zero-window / zero-window-probe events point to the receiver not draining data fast enough

# Check application processing lag
# For web servers, if your log_format includes $request_time as the last field:
awk '{print $NF}' /var/log/nginx/access.log | sort -n | tail -20
# High request times can support an application-side bottleneck hypothesis
```

## Step 6: Reduce Retransmissions

```bash
# If caused by packet loss - fix congestion, MTU, duplex, or physical link issues
# If caused by high latency/jitter - validate the path and application timeouts before tuning TCP
# Avoid aggressively lowering RTO; it can increase spurious retransmissions

# Enable ECN to signal congestion without dropping, if the path and peers support it
sudo sysctl -w net.ipv4.tcp_ecn=1

# If caused by window zero - improve the receiving application first, then increase receive buffers if needed
sudo sysctl -w net.ipv4.tcp_rmem="4096 1048576 134217728"
```

## Conclusion

TCP retransmissions are usually caused by packet loss, ACK loss, reordering, or RTT spikes, while window zero events indicate the receiving host is not currently accepting more data. Distinguish between them using `nstat` for host-wide counters, `tcp.analysis.retransmission` and `tcp.analysis.zero_window` in Wireshark/TShark for packet-level evidence, and `ss -tin` for per-connection state. Address retransmissions by fixing the network path or congestion issue; address window zero by improving the receiving application and tuning buffers only when measurements show the receiver is buffer-limited.
