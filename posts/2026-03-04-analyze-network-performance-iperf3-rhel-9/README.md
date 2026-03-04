# How to Analyze Network Performance with iperf3 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iperf3, Network Performance, Linux

Description: Learn how to use iperf3 on RHEL to measure network throughput, latency, and performance between two hosts, including TCP and UDP testing, bidirectional tests, and interpreting results.

---

When you need to know how fast your network actually is (not what the spec sheet says), iperf3 is the tool. It measures TCP and UDP throughput between two endpoints, and it's the standard for network performance testing. Whether you're validating a new link, benchmarking a VPN tunnel, or tracking down a bottleneck, iperf3 gives you real numbers.

## Installing iperf3

```bash
# Install iperf3
sudo dnf install -y iperf3
```

Install it on both the server and client machines.

## Basic Throughput Test

iperf3 works in client-server mode. One machine runs as the server, the other as the client.

```bash
# On the server side (start listening)
iperf3 -s

# On the client side (connect and test)
iperf3 -c 192.168.1.100
```

The default test runs for 10 seconds using TCP and reports throughput in Mbits/sec.

## Understanding the Output

```
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-1.00   sec   112 MBytes   939 Mbits/sec    0
[  5]   1.00-2.00   sec   112 MBytes   940 Mbits/sec    0
...
[  5]   0.00-10.00  sec  1.09 GBytes   938 Mbits/sec    0      sender
[  5]   0.00-10.00  sec  1.09 GBytes   937 Mbits/sec          receiver
```

- **Transfer** - Total data transferred in the interval
- **Bitrate** - Throughput in bits per second
- **Retr** - TCP retransmissions (high numbers indicate problems)

## Customizing the Test Duration

```bash
# Run for 30 seconds
iperf3 -c 192.168.1.100 -t 30

# Run for 60 seconds
iperf3 -c 192.168.1.100 -t 60
```

## Using Multiple Parallel Streams

A single TCP stream might not saturate a fast link. Use parallel streams.

```bash
# 4 parallel streams
iperf3 -c 192.168.1.100 -P 4

# 8 parallel streams
iperf3 -c 192.168.1.100 -P 8
```

## UDP Testing

UDP tests measure throughput and also report jitter and packet loss, which are critical for VoIP and video.

```bash
# UDP test with target bandwidth of 100 Mbits/sec
iperf3 -c 192.168.1.100 -u -b 100M

# UDP test with 1 Gbit target
iperf3 -c 192.168.1.100 -u -b 1G
```

UDP output includes:

```
[  5]   0.00-10.00  sec  1.16 GBytes   997 Mbits/sec  0.015 ms  2/149529 (0.0013%)  sender
```

- **Jitter** - Variation in packet arrival time (0.015 ms is excellent)
- **Lost/Total** - Packet loss ratio

## Bidirectional Testing

```bash
# Test in both directions simultaneously
iperf3 -c 192.168.1.100 --bidir

# Test in reverse (server sends to client)
iperf3 -c 192.168.1.100 -R
```

The reverse test (`-R`) is useful because upload and download paths might have different performance.

## Setting the Server Port

```bash
# Start server on a custom port
iperf3 -s -p 5201

# Connect to the custom port
iperf3 -c 192.168.1.100 -p 5201
```

Don't forget to open the port in the firewall:

```bash
sudo firewall-cmd --permanent --add-port=5201/tcp
sudo firewall-cmd --reload
```

## Testing with Specific Bandwidth Targets

```bash
# Limit to 10 Mbits/sec (simulate a slow link)
iperf3 -c 192.168.1.100 -b 10M

# Limit to 100 Mbits/sec
iperf3 -c 192.168.1.100 -b 100M
```

## JSON Output for Scripting

```bash
# Output in JSON format
iperf3 -c 192.168.1.100 -J > /tmp/iperf_results.json

# Extract summary throughput from JSON
iperf3 -c 192.168.1.100 -J | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"end\"][\"sum_sent\"][\"bits_per_second\"]/1e6:.0f} Mbps')"
```

## Testing Over VPN Tunnels

Compare direct and VPN performance:

```bash
# Test direct (physical network)
iperf3 -c 192.168.1.100 -t 30

# Test through WireGuard tunnel
iperf3 -c 10.0.0.1 -t 30

# Test through OpenVPN tunnel
iperf3 -c 10.8.0.1 -t 30
```

## Window Size and Buffer Tuning

```bash
# Set TCP window size
iperf3 -c 192.168.1.100 -w 256K

# Set the send/receive buffer length
iperf3 -c 192.168.1.100 -l 128K
```

## Running a Persistent Server

For ongoing testing, run iperf3 as a systemd service.

```bash
# Create a systemd service
sudo tee /etc/systemd/system/iperf3.service > /dev/null << 'EOF'
[Unit]
Description=iperf3 Network Performance Server
After=network.target

[Service]
ExecStart=/usr/bin/iperf3 -s -p 5201
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start and enable
sudo systemctl daemon-reload
sudo systemctl start iperf3
sudo systemctl enable iperf3
```

## Interpreting Results

**Good throughput on a 1 Gbps link:** 900-940 Mbps is typical (protocol overhead).

**High retransmissions:** Indicates packet loss, congestion, or faulty hardware. Check:
```bash
# Check interface errors
ip -s link show dev ens192

# Check for drops
ethtool -S ens192 | grep -i drop
```

**UDP jitter above 1 ms:** Might be acceptable for web traffic but problematic for VoIP.

**Throughput varies wildly between tests:** Could indicate shared bandwidth, QoS policies, or thermal throttling on network hardware.

## Wrapping Up

iperf3 is the definitive tool for measuring network performance on RHEL. Run it as a server on one end, connect as a client from the other, and you get hard numbers. Test with TCP for throughput, UDP for jitter and packet loss, and always test in both directions. The JSON output makes it easy to automate periodic performance testing and track changes over time.
