# How to Use Wireshark to Diagnose Slow HTTP Response Times

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, HTTP, Response Time, Performance, TCP Analysis

Description: Learn how to use Wireshark's built-in analysis tools to measure HTTP response times, identify slow segments in TCP connections, and pinpoint whether slowness is in the network, server, or...

## Understanding HTTP Timing in Wireshark

HTTP response time breaks down into:
1. **TCP handshake time**: SYN → SYN-ACK → ACK
2. **Time to first byte (TTFB)**: Last ACK of handshake → First byte of HTTP response
3. **Data transfer time**: First byte → Last byte
4. **TCP teardown time**: FIN → FIN-ACK → ACK

## Step 1: Capture HTTP Traffic

```bash
# Capture HTTP traffic (port 80 for HTTP, port 8080 for dev servers)

sudo tcpdump -i eth0 -n -w /tmp/http-capture.pcap 'port 80 or port 8080'

# Trigger the slow request
curl -v http://example.com/slow-endpoint
```

```text
Wireshark capture filter:
port 80 or port 8080
```

## Step 2: Apply HTTP Display Filter

```text
In Wireshark display filter bar:
http                    → All HTTP traffic
http.request            → HTTP requests only
http.response           → HTTP responses only
http.response.code == 200  → Successful responses
http.response.code >= 400  → Errors

To focus on one server:
http and ip.addr == 93.184.216.34

To see slow responses:
http.time > 1.0         → Responses taking more than 1 second
```

## Step 3: Measure Time to First Byte

```text
Method 1: Use frame.time_delta

Filter: http
Click on the HTTP GET request packet
Note the time value

Then click on the HTTP 200 OK response packet
The difference in "Arrival Time" = TTFB

Method 2: Wireshark Expert Analysis
Analyze → Expert Information → Warnings
Look for: TCP Previous Segment Not Captured, TCP Retransmission
These indicate network-level delays
```

```bash
# Measure TTFB with curl (easier for scripting)
curl -o /dev/null -s -w "DNS: %{time_namelookup}\nConnect: %{time_connect}\nTTFB: %{time_starttransfer}\nTotal: %{time_total}\n" http://example.com
```

## Step 4: Use Wireshark TCP Stream Graphs

```text
After capturing, analyze the TCP stream:

1. Right-click any HTTP packet → Follow → TCP Stream
   Shows full HTTP conversation in text

2. Statistics → TCP Stream Graphs → Time Sequence (Stevens)
   - X axis: time, Y axis: sequence number
   - Steep slope = fast transfer
   - Flat line = waiting (server processing, window full, or network congestion)
   - Flat line from server side = server slow to respond (TTFB)
   - Flat line after ACK = network bottleneck

3. Statistics → TCP Stream Graphs → Throughput
   - Shows instantaneous throughput over time
   - Drops to zero = waiting for data
```

## Step 5: Identify the Bottleneck Location

```text
Scenario A: Slow TCP Handshake
Capture shows:
  t=0.000: SYN
  t=0.850: SYN-ACK   <- 850ms handshake = network latency to server
Diagnosis: Server is geographically distant or network has high latency

Scenario B: Fast Handshake, Slow TTFB
Capture shows:
  t=0.000: SYN
  t=0.005: SYN-ACK   <- 5ms handshake (good)
  t=0.005: ACK
  t=0.005: HTTP GET
  t=3.450: HTTP 200 OK  <- 3.45 second wait = SERVER PROCESSING TIME
Diagnosis: Server-side processing is slow (database query, computation)

Scenario C: Fast Handshake, Fast TTFB, Slow Transfer
Capture shows:
  t=0.000: SYN
  t=0.005: SYN-ACK
  t=0.006: HTTP GET
  t=0.100: HTTP 200 OK (first byte)
  t=12.30: Last packet   <- Slow data transfer
Diagnosis: Network bandwidth limitation or TCP window issue
```

## Step 6: Check for TCP Analysis Warnings

```text
In Wireshark, look for red/yellow rows:

[TCP Retransmission]       → Packet loss, server resending data
[TCP Previous Segment Not Captured]  → Packet loss in capture
[TCP Zero Window]          → Receiver buffer full
[TCP Window Full]          → Sender stopped by receiver window
[TCP ACKed Unseen Segment] → Gaps in sequence numbers

Filter for problems:
tcp.analysis.retransmission or tcp.analysis.window_full or tcp.analysis.zero_window
```

## Step 7: Generate HTTP Statistics Report

```text
Wireshark built-in HTTP statistics:

Statistics → HTTP → Request Sequences
→ Shows waterfall of HTTP requests with timing

Statistics → HTTP → Packet Counter
→ Request/response counts by method and code

Statistics → HTTP → Requests
→ Per-URL request statistics

Statistics → HTTP → Load Distribution
→ Request distribution across HTTP hosts and servers

Statistics → IO Graphs
→ Add filter: http.response and http.time > 1.0
→ Shows when slow responses occur over time
```

## Step 8: Correlate with Server Logs

```bash
# If Wireshark shows large TTFB, check server-side timing
# Nginx access log format with timing:
# $request_time = total time
# $upstream_response_time = backend processing time

grep "slow-endpoint" /var/log/nginx/access.log | \
    awk '{print $NF}' | sort -n | tail -20

# Apache mod_reqtimeout / mod_logio
grep "slow-endpoint" /var/log/apache2/access.log | \
    awk '{print $(NF)}' | sort -n | tail -20

# Application performance monitoring
# Compare Wireshark TTFB with server request_time:
# If server_time is fast but Wireshark TTFB is slow = network issue
# If server_time matches Wireshark TTFB = application is slow
```

## Conclusion

Wireshark diagnoses slow HTTP responses by showing exactly where time is spent: TCP handshake (network RTT), TTFB (server processing), and transfer speed (bandwidth/TCP window). Use `Statistics → TCP Stream Graphs → Time Sequence` to visualize flat lines indicating wait periods. If the flat line occurs before the server responds, it's server-side; if it occurs during transfer, it's bandwidth or TCP window related. Filter `http.time > 1.0` to quickly identify slow responses in large captures.
