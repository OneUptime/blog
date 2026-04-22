# How to Simulate Network Latency on IPv4 with tc netem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Netem, IPv4, Network Simulation, Testing, Linux

Description: Use the Linux tc netem qdisc to add artificial latency to IPv4 network interfaces for testing application behavior under delayed network conditions.

Network Emulator (netem) is a tc qdisc built into the Linux kernel that adds controllable delay, packet loss, jitter, and reordering to outgoing packets. It is invaluable for testing how applications behave over high-latency or unreliable networks.

## Basic Latency Addition

```bash
# Add 100ms delay to all outgoing traffic on eth0

sudo tc qdisc add dev eth0 root netem delay 100ms

# Verify the qdisc was applied
sudo tc qdisc show dev eth0
# Example: qdisc netem 8001: root refcnt 2 limit 1000 delay 100ms

# Test the delay with ping
ping -c 5 8.8.8.8
# Expected: RTT increases by about 100ms because this delays egress traffic on eth0
# To see about 200ms RTT, apply comparable delay on the return path too
```

## Adding Latency to a Specific Interface (e.g., VPN or loopback)

```bash
# Simulate 50ms latency on the WireGuard interface
sudo tc qdisc add dev wg0 root netem delay 50ms

# Simulate high-latency satellite connection on loopback
sudo tc qdisc add dev lo root netem delay 600ms
```

## Changing Existing Latency

```bash
# Change the delay on an existing netem qdisc (use change, not add)
sudo tc qdisc change dev eth0 root netem delay 200ms

# Remove the delay completely
sudo tc qdisc del dev eth0 root
```

## Simulating Variable Latency (Jitter)

```bash
# 100ms ± 20ms uniform jitter
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms

# 100ms ± 20ms with 25% correlation to previous delay (more realistic)
sudo tc qdisc add dev eth0 root netem delay 100ms 20ms 25%
```

## Using a Distribution for Realistic Delay

```bash
# Use a normal distribution for latency variation
sudo tc qdisc add dev eth0 root netem \
  delay 100ms 20ms distribution normal

# Available distributions: normal, pareto, paretonormal, uniform
```

## Combining Latency with Packet Loss

```bash
# 100ms delay AND 1% packet loss simultaneously
sudo tc qdisc add dev eth0 root netem delay 100ms loss 1%
```

## Applying Netem to Specific Traffic (with HTB)

To apply latency only to specific traffic, combine netem with HTB:

```bash
# Create HTB root; unclassified traffic goes to class 1:20
sudo tc qdisc add dev eth0 root handle 1: htb default 20
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 100mbit
sudo tc class add dev eth0 parent 1:1 classid 1:20 htb rate 100mbit

# Apply netem (latency) as the leaf qdisc on the target class
sudo tc qdisc add dev eth0 parent 1:10 handle 10: netem delay 100ms

# Now filter specific traffic to the delayed class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip dst 10.0.0.0/24 flowid 1:10
```

## Verifying with mtr

```bash
# mtr reports round-trip times per hop and will reflect added delay on the path being tested
mtr --report 8.8.8.8

# Or test round-trip with ping
ping -c 10 -i 0.2 8.8.8.8
```

## Cleanup

```bash
sudo tc qdisc del dev eth0 root
```

Netem is essential for integration testing - simulating mobile network conditions, cross-continental latency, or degraded network performance before deploying latency-sensitive applications.
