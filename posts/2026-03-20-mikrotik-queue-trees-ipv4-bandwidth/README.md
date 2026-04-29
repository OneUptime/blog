# How to Set Up Queue Trees for IPv4 Bandwidth Management on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, Queue Tree, QoS, IPv4, Bandwidth, Traffic Shaping

Description: Configure MikroTik RouterOS queue trees to manage IPv4 bandwidth, prioritize traffic types, and apply per-IP or per-subnet limits using mangle marks and HTB-style hierarchical queuing.

## Introduction

MikroTik Queue Trees implement hierarchical token bucket (HTB) queuing. Combined with firewall mangle marks, they provide fine-grained bandwidth management: global limits, per-IP caps, and traffic prioritization.

## Simple Queue (Quick Per-IP Limit)

```mikrotik
# Limit a single host to 5 Mbps download / 2 Mbps upload

/queue simple add \
  name=limit-pc1 \
  target=192.168.1.100/32 \
  max-limit=5M/2M \
  comment="Limit PC1"

# Limit entire subnet
/queue simple add \
  name=limit-guest \
  target=10.1.20.0/24 \
  max-limit=10M/5M \
  comment="Guest Wi-Fi cap"
```

## Queue Tree - Hierarchical Bandwidth

```mikrotik
# Step 1: Mark traffic with mangle
# Order matters: more specific rules (VoIP) must come before
# the catch-all DOWNLOAD rule because passthrough=no stops processing.

# Mark VoIP traffic with high priority
/ip firewall mangle add \
  chain=forward \
  protocol=udp \
  dst-port=10000-20000 \
  action=mark-packet \
  new-packet-mark=VOIP \
  passthrough=no

# Mark all remaining download traffic
/ip firewall mangle add \
  chain=forward \
  in-interface=ether1 \
  action=mark-packet \
  new-packet-mark=DOWNLOAD \
  passthrough=no

# Step 2: Create parent queue tree (total bandwidth aggregator)
# A parent without packet-mark sums the bandwidth of its children.
/queue tree add \
  name=TOTAL-DOWNLOAD \
  parent=global \
  max-limit=100M \
  comment="100 Mbps total download"

# Step 3: Create child queues - each child must have its own packet-mark
/queue tree add \
  name=VOIP-PRIORITY \
  parent=TOTAL-DOWNLOAD \
  packet-mark=VOIP \
  priority=1 \
  max-limit=10M \
  comment="VoIP - high priority"

/queue tree add \
  name=GENERAL-DOWNLOAD \
  parent=TOTAL-DOWNLOAD \
  packet-mark=DOWNLOAD \
  priority=8 \
  max-limit=100M \
  limit-at=50M \
  comment="General traffic"
```

## Per-IP Bandwidth with PCQ (Per Connection Queuing)

```mikrotik
# Create PCQ queue type (fair share per IP)
/queue type add \
  name=PCQ-DOWNLOAD \
  kind=pcq \
  pcq-rate=2M \
  pcq-classifier=dst-address

/queue type add \
  name=PCQ-UPLOAD \
  kind=pcq \
  pcq-rate=1M \
  pcq-classifier=src-address

# Apply PCQ as a queue tree
/queue tree add \
  name=FAIRSHARE-DOWN \
  parent=global \
  queue=PCQ-DOWNLOAD \
  max-limit=50M

/queue tree add \
  name=FAIRSHARE-UP \
  parent=global \
  queue=PCQ-UPLOAD \
  max-limit=20M
```

## Monitor Queue Usage

```mikrotik
# Show queue stats
/queue simple print stats

# Show queue tree stats
/queue tree print stats

# Real-time monitoring
/queue simple print stats interval=2
```

## Conclusion

MikroTik bandwidth management starts with Simple Queues for per-IP limits and evolves to Queue Trees for hierarchical policies. Mark traffic with mangle, create a parent queue for the total bandwidth, then add child queues for each traffic class with priority and guarantee values. Use PCQ for fair per-client bandwidth sharing without individual host configuration.
