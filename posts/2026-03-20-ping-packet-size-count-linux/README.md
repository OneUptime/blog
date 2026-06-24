# How to Set Ping Packet Size and Count on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ping, ICMP, Linux, MTU, Networking, Diagnostic

Description: Control ping packet size, count, and interval on Linux to test specific network conditions, measure throughput potential, and diagnose MTU issues.

For IPv4, the default ping packet (56 bytes of data + 28 bytes ICMP/IP header = 84 bytes) is too small to reveal many real-world network problems. Controlling size and count lets you simulate different traffic patterns and expose issues that small pings miss.

## Set Packet Count

```bash
# Send exactly 10 packets

ping -c 10 192.168.1.1

# Send 1 packet (fast check)
ping -c 1 10.0.0.1 && echo "Host is up"

# Send 1000 packets for statistical analysis
ping -c 1000 10.0.0.1 | tail -3
```

## Set Packet Size

The `-s` flag sets the ICMP data payload size. In the IPv4 examples below, that does not include the 28-byte IP+ICMP headers:

```bash
# Default ping payload size
ping -s 56 -c 4 10.0.0.1    # Total packet: 84 bytes

# Small packet (minimal overhead)
ping -s 32 -c 4 10.0.0.1    # Total: 60 bytes

# Large payload
ping -s 1000 -c 4 10.0.0.1  # Total: 1028 bytes

# Maximum payload for a 1500-byte IPv4 MTU
ping -s 1472 -c 4 10.0.0.1  # Total: 1500 bytes
```

## Test Multiple Sizes for MTU Discovery

Different sizes help find where fragmentation or drops begin:

```bash
#!/bin/bash
# mtu-probe.sh - Find effective MTU by testing payload sizes

HOST="10.0.0.1"
echo "Testing packet sizes to $HOST..."

for size in 100 500 1000 1200 1400 1440 1460 1464 1472; do
    result=$(ping -c 2 -s "$size" -M do "$HOST" 2>&1)
    if echo "$result" | grep -q "bytes from"; then
        echo "  $size bytes: OK"
    else
        echo "  $size bytes: FAILED (too large or dropped)"
    fi
done
```

## Flood Ping for Load Testing

Flood ping sends packets as fast as possible (requires root):

```bash
# Flood ping - sends/receives as fast as possible
# Prints a '.' for each sent packet, backspace for each received
# High loss can indicate congestion, ICMP rate limiting, or other problems under load
sudo ping -f -c 10000 10.0.0.1

# Flood with large packets (rough load test, not a bandwidth benchmark)
sudo ping -f -s 1400 -c 10000 10.0.0.1
# After completion, note: X packets transmitted, Y received, Z% packet loss
```

## Set Interval Between Packets

```bash
# Slower interval (0.5 second between packets)
ping -i 0.5 -c 20 10.0.0.1

# Faster interval (0.1 second between packets; root not required)
ping -i 0.1 -c 100 10.0.0.1

# Default is 1 second between packets
ping -i 1 -c 10 10.0.0.1
```

## Set Reply Timeout and Total Duration

```bash
# In no-reply cases, wait up to 2 seconds for a response
ping -c 4 -W 2 10.0.0.1

# Total timeout: stop after 10 seconds regardless of count
ping -w 10 10.0.0.1
```

## Practical Example: Statistics Collection

```bash
# Collect reliable statistics with 200 packets at 0.5s interval
ping -c 200 -i 0.5 -s 1000 10.0.0.1 | tail -3

# Expected output:
# 200 packets transmitted, 199 received, 0.5% packet loss, time 99804ms
# rtt min/avg/max/mdev = 0.812/1.024/3.821/0.312 ms

# If mdev is high relative to avg, you likely have jitter
# If loss is > 0%, investigate congestion, ICMP rate limiting, or link problems
```

Varying packet size and count gives you a far more complete picture of link behavior than the default ping - especially when investigating MTU black holes and changes in latency or loss under larger probes.
