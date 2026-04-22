# How to Simulate Bandwidth Limits on IPv4 with tc netem rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Netem, IPv4, Bandwidth, Network Simulation, Linux

Description: Use tc netem's rate option to simulate constrained IPv4 bandwidth on a network interface for testing application behavior under limited throughput.

The netem `rate` parameter allows you to simulate a specific bandwidth cap directly within the netem qdisc, making it easy to emulate slow connections like DSL, mobile networks, or degraded WAN links. Applied as a root qdisc, these examples shape outbound traffic from the interface; use IFB or traffic classification when you need inbound or IPv4-only shaping.

## Basic Bandwidth Simulation

```bash
# Simulate a 1 Mbps outbound link (typical slow DSL)

sudo tc qdisc add dev eth0 root netem rate 1mbit

# Simulate a 10 Mbps outbound link
sudo tc qdisc add dev eth0 root netem rate 10mbit

# Verify
sudo tc qdisc show dev eth0
```

## Combining Rate with Latency and Loss

netem allows you to combine multiple impairments in a single command:

```bash
# Simulate a slow 3G mobile connection:
# - 5 Mbps bandwidth limit
# - 100ms latency with 20ms jitter
# - 1% packet loss
sudo tc qdisc add dev eth0 root netem \
  rate 5mbit \
  delay 100ms 20ms \
  loss 1%
```

## Emulating Common Network Types

```bash
# Dial-up modem (56K)
sudo tc qdisc add dev eth0 root netem rate 56kbit delay 150ms

# ADSL-style (2 Mbps outbound; use IFB for inbound shaping)
sudo tc qdisc add dev eth0 root netem rate 2mbit delay 20ms

# Cable internet (50 Mbps)
sudo tc qdisc add dev eth0 root netem rate 50mbit delay 10ms

# Satellite link (10 Mbps, 600ms latency)
sudo tc qdisc add dev eth0 root netem rate 10mbit delay 600ms 50ms

# 4G LTE (variable 10-50 Mbps, 30-50ms latency)
sudo tc qdisc add dev eth0 root netem rate 20mbit delay 40ms 10ms 20%
```

## Testing Bandwidth with iperf3

```bash
# Apply a 10 Mbps outbound limit
sudo tc qdisc add dev eth0 root netem rate 10mbit

# Test actual throughput with iperf3
# On the server:
iperf3 -s

# On the client (limit should cap throughput near 10 Mbps):
iperf3 -c <SERVER_IP> -t 30

# Expected output:
# [ ID] Interval         Transfer     Bitrate
# [  5]  0.00-30.00 sec  37.5 MBytes  10.5 Mbits/sec
```

## Changing Rate Without Full Reset

```bash
# Change the rate from 10 Mbps to 5 Mbps dynamically
sudo tc qdisc change dev eth0 root netem rate 5mbit
```

## Rate with Packet Overhead Accounting

```bash
# Account for additional per-packet overhead (26 bytes)
sudo tc qdisc add dev eth0 root netem \
  rate 10mbit 26
```

## Using netem Rate vs. TBF for Rate Limiting

| Feature | netem rate | TBF |
|---|---|---|
| Configurable burst support | No | Yes |
| Combine with loss/delay | Yes | No (separately) |
| Accuracy at low rates | Good | Excellent |
| Use case | Testing/simulation | Production rate limiting |

Use netem `rate` for testing; use TBF or HTB for production rate limiting.

## Cleanup

```bash
sudo tc qdisc del dev eth0 root
```

Bandwidth simulation with netem is invaluable for testing video streaming buffering, large file transfer performance, and how your application handles slow network conditions before releasing to production.
