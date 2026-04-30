# How to Configure IPv4 Traffic Policing vs Shaping and When to Use Each

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traffic Control, Policing, Shaping, tc, IPv4, QoS, Linux

Description: Understand the difference between IPv4 traffic policing (drop excess) and shaping (delay excess), configure both with Linux tc, and choose the right approach for your use case.

## Introduction

Traffic policing and traffic shaping are two different approaches to enforcing bandwidth limits on IPv4 traffic:

- **Policing**: Drops packets that exceed the rate limit immediately. No buffering.
- **Shaping**: Delays excess packets in a queue until they can be sent within the rate limit. Smooths out bursts.

## Key Differences

| Aspect | Policing | Shaping |
|--------|---------|---------|
| Excess packets | Dropped | Queued/delayed |
| Latency impact | None (drops immediately) | Adds buffering latency |
| Memory usage | Minimal | Queue buffer required |
| Application side effect | Retransmissions | Smooth but delayed delivery |
| Best for | Ingress limiting, multi-tenant | Egress smoothing, WAN links |

## Configuring Traffic Shaping (TBF)

The Token Bucket Filter (TBF) qdisc smooths bursts by queuing excess packets:

```bash
# Shape outbound traffic on eth0 to 10 Mbit/s

# TBF allows a burst of 16 KB before queuing begins
# rate: Sustained rate; burst: Burst bucket size; latency: Max packet wait time
sudo tc qdisc add dev eth0 root handle 1: tbf \
  rate 10mbit \
  burst 16kb \
  latency 200ms

# Verify
sudo tc -s qdisc show dev eth0
```

**When to use shaping**: On WAN uplinks where you want to smooth traffic and avoid congestion at the ISP - preventing router buffer bloat. Also useful for backing off a bulk transfer without causing retransmissions.

## Configuring Traffic Policing

Policing drops packets immediately when the rate is exceeded. It is most commonly used directly on ingress qdiscs. If you need to shape ingress traffic, redirect it to an IFB device first:

```bash
# Police ingress traffic to 10 Mbit/s (drop exceeding packets)
sudo tc qdisc add dev eth0 handle ffff: ingress

# police rate: Rate limit; burst: Burst allowance; conform-exceed: Action on excess
sudo tc filter add dev eth0 parent ffff: protocol ip u32 \
  match u32 0 0 \
  police rate 10mbit \
  burst 200kb \
  conform-exceed drop
```

**When to use policing**: For inbound traffic limiting (ingress), because by the time packets arrive you can drop them but not shape them in place. Also appropriate for multi-tenant environments where you want hard enforcement.

## HTB with Shaping (Production Pattern)

For more granular shaping with multiple traffic classes:

```bash
# Root HTB qdisc with a default class
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Parent class caps total shaped bandwidth at 10 Mbit/s
sudo tc class add dev eth0 parent 1: classid 1:1 htb \
  rate 10mbit \
  ceil 10mbit

# High-priority class for SSH traffic
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb \
  rate 2mbit \
  ceil 10mbit

# Low-priority class for bulk transfers
sudo tc class add dev eth0 parent 1:1 classid 1:30 htb \
  rate 1mbit \
  ceil 5mbit

# Classify outbound SSH client traffic to the high-priority class
sudo tc filter add dev eth0 protocol ip parent 1: prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 22 0xffff \
  flowid 1:10
```

## Decision Guide

**Use policing when:**
- You need to enforce hard limits on ingress traffic
- You're managing bandwidth for untrusted tenants or clients
- Simplicity is more important than smooth delivery
- The protocol handles retransmissions well (TCP)

**Use shaping when:**
- You need smooth, bursty egress traffic (video streaming, file uploads)
- You want to prevent congestion on the outbound link
- Avoiding TCP retransmissions is a priority
- You have predictable, controlled traffic sources

## Removing Rules

```bash
# Remove all tc rules
sudo tc qdisc del dev eth0 root
sudo tc qdisc del dev eth0 ingress
```

## Conclusion

Choose shaping for egress smoothing and policing for ingress enforcement. In practice, use shaping on your outbound WAN interface with HTB for multi-class prioritization, and policing on ingress to enforce hard per-tenant limits.
