# How to Configure Stochastic Fairness Queueing (SFQ) for IPv4 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, SFQ, Traffic Control, QoS, IPv4, Linux, Fairness

Description: Configure Stochastic Fairness Queueing (SFQ) on a Linux interface to ensure fair bandwidth sharing among IPv4 flows and prevent a single high-bandwidth flow from starving others.

## Introduction

Stochastic Fairness Queueing (SFQ) is a queueing discipline that hashes flows into buckets and services them in a round-robin fashion. It ensures that a single large flow (such as a file download) cannot monopolize the interface at the expense of small interactive flows (like SSH or DNS queries).

## How SFQ Works

SFQ uses a packet hash to classify packets into buckets. With the internal classifier, it uses source and destination addresses and, when available for supported protocols, source and destination ports. Each bucket is served in round-robin order, so even if one flow generates thousands of packets, other flows still get their turn.

## Basic SFQ Configuration

```bash
# Apply SFQ to the root of eth0

sudo tc qdisc add dev eth0 root sfq perturb 10

# Verify the rule
sudo tc qdisc show dev eth0
```

The `perturb 10` parameter perturbs the internal hash every 10 seconds to prevent hash collisions from permanently disadvantaging a flow.

## SFQ Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `perturb N` | Re-hash flows every N seconds | 0 (disabled) |
| `quantum N` | Bytes dequeued per round per flow | MTU |
| `limit N` | Total queue depth in packets | 127 |
| `divisor N` | Hash table size (power of 2) | 1024 |

## Combining SFQ with an Outer Rate Limiter

SFQ provides fairness but not rate limiting. Combine with HTB or TBF to limit total throughput while maintaining fairness:

```bash
# Create root HTB qdisc and send unclassified traffic to class 1:10
sudo tc qdisc add dev eth0 root handle 1: htb default 10

# Create a rate-limited class (100 Mbit/s total)
sudo tc class add dev eth0 parent 1: classid 1:10 htb \
  rate 100mbit \
  ceil 100mbit

# Attach SFQ to the rate-limited class for fair queuing
sudo tc qdisc add dev eth0 parent 1:10 handle 10: sfq perturb 10
```

With this setup:
1. HTB limits total bandwidth to 100 Mbit/s
2. SFQ ensures fair distribution among all flows within that limit

## Per-Class SFQ for Traffic Prioritization

```bash
# Create three priority classes: high, normal, low
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# High priority: interactive traffic (SSH, DNS)
sudo tc class add dev eth0 parent 1: classid 1:10 htb rate 10mbit ceil 50mbit prio 0
sudo tc qdisc add dev eth0 parent 1:10 handle 10: sfq perturb 10

# Normal priority: web traffic
sudo tc class add dev eth0 parent 1: classid 1:20 htb rate 40mbit ceil 80mbit prio 1
sudo tc qdisc add dev eth0 parent 1:20 handle 20: sfq perturb 10

# Low priority: bulk transfers
sudo tc class add dev eth0 parent 1: classid 1:30 htb rate 10mbit ceil 30mbit prio 2
sudo tc qdisc add dev eth0 parent 1:30 handle 30: sfq perturb 10

# Classify SSH to high priority class
sudo tc filter add dev eth0 parent 1: protocol ip prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 22 0xffff \
  flowid 1:10
```

## Monitoring SFQ Statistics

```bash
# Show SFQ statistics including queue depth and drops
sudo tc -s qdisc show dev eth0
```

Look for `dropped` packets - a high drop rate indicates the queue is consistently full and the rate limit may be too low.

## Removing SFQ Rules

```bash
sudo tc qdisc del dev eth0 root
```

## When to Use SFQ

- **ISP edge devices**: Prevent bandwidth hogs from degrading interactive traffic
- **Shared office internet**: Fair bandwidth allocation without complex policy rules
- **Gaming/VoIP**: Ensure low-latency flows get served promptly alongside bulk downloads

## Conclusion

SFQ is a low-overhead way to provide fair queuing across flows. Combined with HTB for rate limiting, it forms the foundation of practical QoS policies that keep interactive traffic responsive even under heavy load.
