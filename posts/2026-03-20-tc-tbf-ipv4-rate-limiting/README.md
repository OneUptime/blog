# How to Set Up tc tbf (Token Bucket Filter) for IPv4 Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, TBF, IPv4, Linux, Rate Limiting, QoS

Description: Use the Linux tc Token Bucket Filter (TBF) qdisc to apply simple and effective rate limiting to IPv4 traffic on a network interface.

The Token Bucket Filter (TBF) is the simplest tc qdisc for rate limiting. It allows a configured rate with controlled bursting, making it suitable for applying a flat rate cap to an interface.

## How TBF Works

TBF maintains a virtual "bucket" that fills at the configured `rate`. Each packet consumes tokens from the bucket. When the bucket is full, excess tokens are discarded. When empty, packets are delayed until enough tokens accumulate.

```text
Packet arrives → Enough tokens in bucket? → Send immediately
                      No tokens left?     → Queue (up to latency limit)
                      Queue too long?     → Drop packet
```

## Basic TBF Rate Limit

```bash
# Limit interface eth0 to 10 Mbps outbound

# rate: target rate, 10 megabits per second
# burst: token bucket size, 32 kilobytes
# latency: maximum latency before dropping, 400 milliseconds
sudo tc qdisc add dev eth0 root tbf \
  rate 10mbit \
  burst 32kb \
  latency 400ms

# Verify the qdisc was added
sudo tc qdisc show dev eth0
```

## Understanding the Parameters

| Parameter | Description |
|---|---|
| `rate` | Target throughput (bits per second) |
| `burst` | Token bucket size in bytes; must be at least `rate / 8 / HZ` bytes (HZ = kernel timer rate) |
| `latency` | Max time a packet sits in the queue before being dropped |
| `limit` | Alternative to `latency`; max bytes in queue |

Calculate minimum burst:

```bash
# For rate=10mbit and HZ=250: minimum burst = 10_000_000 / 8 / 250 = 5000 bytes ≈ 5 KB (40 kbit)
# Use a larger burst for smoother traffic
```

## Limit Different Rates for Different Interfaces

```bash
# Limit the LAN interface to 100 Mbps
sudo tc qdisc add dev eth1 root tbf rate 100mbit burst 100kb latency 400ms

# Limit a WireGuard VPN interface to 20 Mbps
sudo tc qdisc add dev wg0 root tbf rate 20mbit burst 64kb latency 400ms
```

## Allowing Burstable Rates

Set `burst` higher to allow temporary bursts above the rate limit while maintaining the average:

```bash
# Allow 1 MB burst at full line rate before throttling to 5 Mbps
sudo tc qdisc add dev eth0 root tbf \
  rate 5mbit \
  burst 1mb \
  latency 100ms
```

## Checking TBF Statistics

```bash
# View bytes sent, dropped, and overlimit counts
sudo tc -s qdisc show dev eth0

# Example output:
# qdisc tbf 8001: root refcnt 2 rate 10Mbit burst 32Kb lat 400ms
#  Sent 1234567 bytes 890 pkt (dropped 12, overlimits 45 requeues 0)
```

- **dropped**: packets dropped because queue was full
- **overlimits**: packets that exceeded the token bucket (were queued or dropped)

## Removing TBF

```bash
sudo tc qdisc del dev eth0 root
```

## Combining TBF with Other qdiscs

TBF is a classless qdisc - it doesn't support multiple traffic classes. For per-class rate limits, use HTB. Use TBF when you simply need a flat rate cap on an entire interface without prioritization.
