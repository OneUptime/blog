# How to Monitor TCP Connection Establishment Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Latency, Monitoring, Linux, Performance

Description: Measure and monitor TCP connection establishment latency using kernel metrics, tcpdump timing analysis, and custom monitoring scripts.

## Introduction

TCP connection establishment latency (the time from SYN to ESTABLISHED) is a critical performance metric for any service. High connection latency increases response time for every request, even before any application data is exchanged. Monitoring this metric over time reveals network degradation, server overload, and geographic routing changes.

## Measuring Handshake Latency with curl

```bash
# curl's timing breakdown includes TCP connection time

curl -w "\nConnect time: %{time_connect}s\nTTFB: %{time_starttransfer}s\n" \
  -o /dev/null -s http://10.20.0.5:8080

# time_connect: time for TCP handshake to complete
# time_starttransfer: time until first byte received (includes handshake + processing)

# Run in a loop to track over time
while true; do
  CONNECT=$(curl -w "%{time_connect}" -o /dev/null -s http://10.20.0.5)
  echo "$(date +%s) $CONNECT"
  sleep 5
done | tee /tmp/latency.log
```

## Measuring with hping3

```bash
# hping3 measures SYN to SYN-ACK round-trip time
apt install hping3

# Send SYN packets and measure response time
hping3 -S -p 8080 -c 10 10.20.0.5
# rtt min/avg/max = 0.4/0.8/1.2 ms

# Compare to ICMP ping to see TCP overhead vs network RTT
ping -c 10 10.20.0.5
# TCP handshake RTT should be close to ICMP RTT
# If TCP is significantly higher: server is slow to respond (SYN backlog, CPU load)
```

## Extracting Handshake Timing from tcpdump

```bash
# Capture and analyze handshake timing
tcpdump -i eth0 -n -w /tmp/tcp_timing.pcap 'tcp port 8080'

# Analyze with tshark
tshark -r /tmp/tcp_timing.pcap -T fields \
  -e frame.time_relative \
  -e ip.src \
  -e tcp.flags \
  -Y "tcp.flags.syn==1 or (tcp.flags.syn==1 && tcp.flags.ack==1)"

# Calculate handshake time: time(SYN-ACK) - time(SYN) per stream
# Note: tcp.analysis.initial_rtt requires tshark's 2-pass mode (-2)
tshark -2 -r /tmp/tcp_timing.pcap \
  -Y "tcp.analysis.initial_rtt" \
  -T fields -e tcp.analysis.initial_rtt
```

## Linux ss Command for Connection Timing

```bash
# ss shows RTT for established connections (in milliseconds)
ss -tin state established

# Look for rtt field in output:
# rtt:1.2/0.3  <- RTT 1.2ms, variance 0.3ms

# Average RTT across all connections
ss -tin state established | grep -oP 'rtt:\K[\d.]+' | \
  awk '{sum+=$1; count++} END {printf "Avg RTT: %.2f ms\n", sum/count}'
```

## Building a Latency Monitoring Script

```python
import socket
import time

def measure_tcp_connect_latency(host, port, count=10):
    """Measure TCP connection establishment latency."""
    latencies = []

    for i in range(count):
        start = time.perf_counter()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(5)
            s.connect((host, port))
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            latencies.append(elapsed)
            s.close()
        except Exception as e:
            print(f"Connection {i+1} failed: {e}")
        time.sleep(0.1)

    if latencies:
        print(f"TCP Connect Latency to {host}:{port}")
        print(f"  Min: {min(latencies):.2f} ms")
        print(f"  Avg: {sum(latencies)/len(latencies):.2f} ms")
        print(f"  Max: {max(latencies):.2f} ms")
        print(f"  Samples: {len(latencies)}/{count}")

measure_tcp_connect_latency("10.20.0.5", 8080)
```

## Conclusion

TCP connection latency is directly observable through timing analysis of the three-way handshake. Baseline values should be close to ICMP ping RTT. Sustained increases in connection latency without corresponding increases in ICMP RTT indicate server-side issues (accept queue depth, CPU load, or application bottlenecks). Regular monitoring with tools like OneUptime or custom scripts helps detect degradation before users notice.
