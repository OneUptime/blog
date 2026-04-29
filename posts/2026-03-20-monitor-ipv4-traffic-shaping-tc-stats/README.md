# How to Monitor IPv4 Traffic Shaping Statistics with tc -s qdisc show

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, IPv4, Linux, QoS, Monitoring, Traffic Statistics

Description: Use tc -s commands to monitor qdisc, class, and filter statistics to verify that IPv4 traffic shaping rules are working as expected.

After configuring tc traffic shaping, you need to verify that traffic is landing in the correct classes, that rates are being enforced, and that drop rates are acceptable. The `tc -s` flag shows statistics for each component.

## Viewing qdisc Statistics

```bash
# Show all qdiscs on an interface with statistics

sudo tc -s qdisc show dev eth0

# Example output for TBF:
# qdisc tbf 8001: root refcnt 2 rate 10Mbit burst 32Kb lat 400ms
#  Sent 45678901 bytes 30000 pkt (dropped 42, overlimits 150 requeues 0)
#  backlog 0b 0p requeues 0

# Example output for HTB:
# qdisc htb 1: root refcnt 8 r2q 10 default 30 direct_packets_stat 0
#  Sent 12345678 bytes 8900 pkt (dropped 5, overlimits 0 requeues 0)
#  backlog 0b 0p requeues 0
```

## Understanding qdisc Statistics Fields

| Field | Meaning |
|---|---|
| `Sent X bytes X pkt` | Total traffic processed |
| `dropped X` | Packets dropped (queue full or policed) |
| `overlimits X` | Packets that exceeded the configured rate |
| `backlog X bytes` | Currently queued bytes/packets |
| `requeues X` | Packets re-queued after processing |

## Viewing Class Statistics

```bash
# Show HTB class statistics
sudo tc -s class show dev eth0

# Example output:
# class htb 1:10 parent 1:1 prio 1 rate 40Mbit ceil 100Mbit burst 15Kb cburst 1599b
#  Sent 8901234 bytes 5600 pkt (dropped 0, overlimits 0 requeues 0)
#  rate 39760000bit 3100pps backlog 0b 0p requeues 0
#  lended: 250 borrowed: 0 giants: 0
#  tokens: 36000 ctokens: 36000
```

HTB-specific fields:
- `lended`: tokens lent to child classes
- `borrowed`: tokens borrowed from parent when rate exceeded
- `tokens/ctokens`: available token counts

## Viewing Filter Statistics

```bash
# Show filter hit counts
sudo tc -s filter show dev eth0

# Each filter shows how many packets matched:
# filter parent 1: protocol ip pref 1 u32 chain 0
# filter parent 1: protocol ip pref 1 u32 chain 0 fh 800::800 order 2048 key ht 800 bkt 0 flowid 1:10
#   match 00000016/0000ffff at 20  (matches dport 22)
#   Sent 450 bytes 5 pkt
```

## Continuous Monitoring Script

```bash
#!/bin/bash
# monitor-tc.sh - print qdisc stats every 5 seconds

INTERFACE=${1:-eth0}

while true; do
    echo "=== $(date) ==="
    tc -s qdisc show dev $INTERFACE
    echo ""
    tc -s class show dev $INTERFACE
    echo "---"
    sleep 5
done
```

## Using watch for Live Stats

```bash
# Refresh qdisc stats every 2 seconds
watch -n 2 "sudo tc -s qdisc show dev eth0"

# Or class stats
watch -n 2 "sudo tc -s class show dev eth0"
```

## Resetting Statistics

```bash
# Statistics are cumulative since the qdisc was added
# To reset, delete and re-add the qdisc
sudo tc qdisc del dev eth0 root
sudo tc qdisc add dev eth0 root tbf rate 10mbit burst 32kb latency 400ms
```

## Checking for Excessive Drops

A high `dropped` count usually indicates:
1. The rate is too low for the actual traffic
2. Queue depth (`latency` or `limit`) is too small
3. A policing rule is too aggressive

If drops occur, either increase the rate, increase the burst/latency, or investigate whether the traffic is legitimately exceeding the configured policy.
