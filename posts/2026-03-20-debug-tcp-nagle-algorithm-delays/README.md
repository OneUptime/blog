# How to Debug TCP Nagle Algorithm Delays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Nagle Algorithm, Latency, Linux, Performance, Debugging

Description: Identify and debug latency issues caused by the TCP Nagle algorithm coalescing small packets, adding 40-200ms delays to interactive applications.

## Introduction

Nagle's algorithm improves network efficiency by coalescing multiple small writes into a single TCP segment. While beneficial for bulk transfers, it introduces up to one RTT of latency for interactive applications that send small amounts of data and then wait for a response. This 40ms "Nagle delay" (triggered by the receiver's delayed ACK, which on Linux defaults to TCP_DELACK_MIN of 40ms and is capped at TCP_DELACK_MAX of 200ms) can make applications feel sluggish.

## Understanding the Nagle Delay

```text
Without Nagle:
App writes "GET /" (5 bytes) → immediate TCP segment sent
App receives response immediately

With Nagle:
App writes "GET /" (5 bytes)
Nagle: "Outstanding unACKed data? Wait for more data or ACK"
Receiver's delayed ACK: "Wait 40ms before sending ACK"
Combined: 40ms+ delay before the request is actually sent!

The "ACK delay" interaction:
Client sends small request → waits for ACK before sending more
Server uses delayed ACK (waits 40ms before sending ACK)
Result: 40ms minimum latency for every small request!
```

## Detecting Nagle Delays

```bash
# Capture timing of small packets to see Nagle delays

tcpdump -i eth0 -n -w /tmp/nagle_test.pcap 'tcp and host 10.20.0.5'

# Analyze gaps between consecutive small TCP segments
tshark -r /tmp/nagle_test.pcap -T fields \
  -e frame.time_delta \
  -e tcp.len \
  -Y "tcp.len < 100 and tcp.len > 0" 2>/dev/null | \
  awk '$1 > 0.040 {print "40ms+ gap:", $1"s", "len="$2"B"}'
```

## Checking if Nagle is Active

```bash
# Check if TCP_NODELAY is set (Nagle disabled) for a connection
ss -tin state established | grep nodelay
# "nodelay" = Nagle is DISABLED for this socket
# No "nodelay" = Nagle is ENABLED (default)

# For a specific process's sockets
# Note: `ss -i` prints the nodelay flag on the indented info line below the
# connection/PID line, so use `grep -A1` to include that following line.
ss -tinp state established | grep -A1 "pid=$(pgrep myapp)" | grep nodelay
```

## Testing the Nagle Delay

```python
import socket
import time

def test_nagle_delay(host, port):
    """Measure latency with Nagle enabled vs disabled."""

    # Test with Nagle ENABLED (default)
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))

    start = time.time()
    s.send(b'x')    # Small write (triggers Nagle if more data pending)
    s.recv(1)       # Wait for echo
    nagle_latency = (time.time() - start) * 1000
    s.close()

    # Test with Nagle DISABLED (TCP_NODELAY)
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    s.connect((host, port))

    start = time.time()
    s.send(b'x')
    s.recv(1)
    nodelay_latency = (time.time() - start) * 1000
    s.close()

    print(f"With Nagle:    {nagle_latency:.1f} ms")
    print(f"Without Nagle: {nodelay_latency:.1f} ms")
    print(f"Nagle overhead: {nagle_latency - nodelay_latency:.1f} ms")

# test_nagle_delay('10.20.0.5', 8080)
```

## Fixing Nagle Delays

```python
# For any interactive or real-time application:
import socket

# Disable Nagle (enable TCP_NODELAY) on client sockets
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
client.connect(('10.20.0.5', 8080))

# For HTTP/gRPC servers (like gunicorn, uvicorn):
# They often have TCP_NODELAY as a configuration option
# gunicorn: worker_class = uvicorn.workers.UvicornWorker
# uvicorn: uses TCP_NODELAY by default for HTTP connections
```

## When to Keep Nagle Enabled

```bash
# Keep Nagle ENABLED for:
# - Bulk file transfers (it helps coalesce data, improving efficiency)
# - Applications that batch their writes
# - Any connection where latency doesn't matter

# Disable Nagle (TCP_NODELAY=1) for:
# - Interactive terminals (SSH, telnet)
# - Real-time gaming
# - Trading/financial systems
# - RPC/gRPC with small messages
# - Database protocol clients (psql, redis, etc.)
```

## Conclusion

Nagle algorithm delays are especially insidious because they only affect applications with a request-response pattern using small messages. The 40ms delay (from the interaction with delayed ACK) can make interactive systems feel laggy. Always enable TCP_NODELAY for interactive applications. For bulk transfer clients, keep Nagle enabled - it actually helps by reducing packet count and network overhead.
