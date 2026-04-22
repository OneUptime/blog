# How to Simulate Network Latency with tc netem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, tc, Netem, Traffic Control, Latency, Network Testing

Description: Simulate network latency on Linux using tc netem to add artificial delay to outgoing traffic, useful for testing application behavior under high-latency conditions.

## Introduction

`tc` (traffic control) with the `netem` (network emulation) qdisc adds configurable delay, jitter, packet loss, corruption, and reordering to outgoing traffic on an interface. This is essential for testing how applications behave under realistic network conditions without needing a physical WAN link.

## Add a Fixed Latency Delay

```bash
# Add 100ms delay to all outgoing traffic on eth0

tc qdisc add dev eth0 root netem delay 100ms

# Verify
tc qdisc show dev eth0
```

## Test the Delay

```bash
# Ping RTT should now increase by about 100ms
ping -c 5 8.8.8.8
# 64 bytes from 8.8.8.8: icmp_seq=1 ttl=... time=<baseline+100> ms
```

## Add Delay with Jitter (Variation)

```bash
# 100ms delay with ±10ms jitter
tc qdisc add dev eth0 root netem delay 100ms 10ms

# With correlation (more realistic variation)
# 100ms delay, 10ms jitter, 25% correlation
tc qdisc add dev eth0 root netem delay 100ms 10ms 25%
```

## Add Delay with Normal Distribution

```bash
# Latency distributed around 100ms
tc qdisc add dev eth0 root netem delay 100ms 20ms distribution normal
```

## Change Existing Rule

```bash
# Change delay on existing qdisc (use 'change' not 'add')
tc qdisc change dev eth0 root netem delay 200ms

# Or replace entirely
tc qdisc replace dev eth0 root netem delay 50ms
```

## Combine Delay with Packet Loss

```bash
# 100ms delay AND 1% packet loss
tc qdisc add dev eth0 root netem delay 100ms loss 1%
```

## Apply Delay Only to Specific Traffic (Using a Filter)

```bash
# Create root qdisc with prio; keep unfiltered traffic on class 1:2
tc qdisc add dev eth0 root handle 1: prio \
    priomap 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1

# Add netem to a specific class
tc qdisc add dev eth0 parent 1:3 handle 30: netem delay 100ms

# Filter: only HTTP traffic gets delay
tc filter add dev eth0 protocol ip parent 1:0 prio 3 u32 \
    match ip protocol 6 0xff \
    match ip dport 80 0xffff flowid 1:3
```

## Remove the Delay

```bash
# Delete the root qdisc (removes these netem/prio rules)
tc qdisc del dev eth0 root

# Verify delay is gone
tc qdisc show dev eth0
ping -c 3 8.8.8.8
```

## High Latency Scenarios

```bash
# Simulate satellite link (600ms delay)
tc qdisc add dev eth0 root netem delay 600ms

# Simulate mobile network (80ms delay, 20ms jitter)
tc qdisc add dev eth0 root netem delay 80ms 20ms

# Simulate transatlantic fiber (~150ms)
tc qdisc add dev eth0 root netem delay 150ms 5ms
```

## Conclusion

`tc qdisc add dev <interface> root netem delay <time>` adds artificial latency to all outgoing packets. Add jitter with a second time value. Use `change` to modify an existing rule and `del` to remove it. netem is the standard tool for chaos engineering and network condition simulation on Linux.
