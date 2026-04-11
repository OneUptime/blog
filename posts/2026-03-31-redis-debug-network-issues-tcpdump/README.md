# How to Debug Redis Network Issues with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, tcpdump, Network, Troubleshooting

Description: Capture and analyze Redis network traffic with tcpdump to diagnose connection resets, packet loss, TLS handshake failures, and protocol-level issues.

---

When Redis clients report timeouts, connection resets, or intermittent errors that do not appear in Redis logs, the problem is often at the network layer. `tcpdump` captures raw TCP packets on the Redis port, revealing connection handshake failures, RST packets, retransmissions, and actual command/response bytes.

## Basic Capture on Redis Port

```bash
# Capture all traffic on Redis port 6379
sudo tcpdump -i eth0 port 6379 -w /tmp/redis-capture.pcap

# Press Ctrl+C after capturing the problematic period
# Analyze the capture
sudo tcpdump -r /tmp/redis-capture.pcap -A
```

## Filtering by Client IP

```bash
# Capture traffic from a specific client
sudo tcpdump -i eth0 "port 6379 and host 10.0.1.15" -w /tmp/redis-client.pcap

# Capture both directions
sudo tcpdump -i any "port 6379" -w /tmp/redis-all.pcap
```

## Detecting Connection Resets (RST packets)

RST packets indicate abrupt connection terminations - often caused by firewall timeouts, `tcp-keepalive` misconfiguration, or proxy idle timeouts:

```bash
# Show only RST packets
sudo tcpdump -i eth0 "port 6379 and tcp[tcpflags] & tcp-rst != 0"
```

Output:

```text
14:23:15.412 IP 10.0.1.15.52341 > 10.0.3.10.6379: Flags [R], seq 1234567
14:23:15.413 IP 10.0.3.10.6379 > 10.0.1.15.52341: Flags [R.], seq 9876543
```

RSTs from the client side suggest idle connection timeouts. Fix with:

```bash
redis-cli CONFIG SET tcp-keepalive 60
```

## Detecting TCP Retransmissions

Retransmissions indicate packet loss or network congestion:

```bash
tshark -r /tmp/redis-capture.pcap -Y "tcp.analysis.retransmission"
```

Note: `tcpdump` itself does not perform TCP stream analysis or label retransmissions. Use `tshark` (Wireshark's CLI companion) or open the pcap in Wireshark with the filter:

```text
tcp.analysis.retransmission
```

## Reading Redis Protocol in Capture

Redis uses RESP (REdis Serialization Protocol). Read ASCII output from a capture:

```bash
sudo tcpdump -i eth0 port 6379 -A -s 1500 2>/dev/null | grep -A5 "^\*"
```

Example output showing a SET command:

```text
*3
$3
SET
$12
user:42:name
$5
Alice
```

Response:

```text
+OK
```

## Detecting TLS Handshake Failures

For TLS-enabled Redis, capture and check for handshake alerts:

```bash
sudo tcpdump -i eth0 port 6380 -w /tmp/redis-tls.pcap

# Check for TLS alert records (content type 0x15 = alert)
tshark -r /tmp/redis-tls.pcap -Y "tls.alert_message"
```

Or use Wireshark with the Redis TLS certificate to decrypt and inspect.

## Measuring Network Latency

Use `tcpdump` timestamps to calculate round-trip time between command and response:

```bash
sudo tcpdump -i eth0 port 6379 -ttt -A 2>/dev/null | head -100
```

The `-ttt` flag shows time delta between packets. Large deltas (> 1ms on a LAN) indicate network latency issues.

## Continuous Monitoring for Anomalies

```bash
#!/bin/bash
# Count RST packets per minute
while true; do
  count=$(timeout 60 sudo tcpdump -i eth0 "port 6379 and tcp[tcpflags] & tcp-rst != 0" -q 2>/dev/null | wc -l)
  echo "$(date): RST packets in last 60s: $count"
  if [ "$count" -gt 10 ]; then
    echo "ALERT: High RST count - possible connection instability"
  fi
done
```

## Summary

`tcpdump` exposes Redis network-layer issues that application logs miss. Use it to detect RST packets (connection resets), TCP retransmissions (packet loss), and TLS handshake failures. Filter by client IP to isolate specific connection problems, and read ASCII output to verify that the RESP protocol data matches expected commands. Address RST issues with TCP keepalive configuration and verify firewall idle timeout settings.
