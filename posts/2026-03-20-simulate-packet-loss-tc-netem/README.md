# How to Simulate Packet Loss with tc netem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, tc, Netem, Traffic Control, Packet Loss, Network Testing

Description: Simulate packet loss on Linux using tc netem to test application resilience, TCP performance, and network protocol behavior under lossy conditions.

## Introduction

`tc netem` can drop a configurable percentage of outgoing packets, simulating lossy wireless networks, congested WAN links, or faulty network hardware. Combined with delay and jitter, it creates realistic adverse network conditions for testing.

## Add Basic Packet Loss

```bash
# Drop 10% of all outgoing packets on eth0

tc qdisc add dev eth0 root netem loss 10%

# Verify the rule is active
tc qdisc show dev eth0
```

## Test the Packet Loss

```bash
# Ping to observe packet loss
ping -c 20 8.8.8.8
# Should show approximately 10% packet loss in statistics
```

## Add Correlated Packet Loss

```bash
# 5% loss with 25% correlation (burst loss more likely)
tc qdisc add dev eth0 root netem loss 5% 25%

# Random Bernoulli loss (default - no correlation)
tc qdisc add dev eth0 root netem loss random 5%
```

## Loss Models

```bash
# State-based loss with only P13 specified (equivalent to Bernoulli loss)
tc qdisc add dev eth0 root netem loss state 5%

# Gemodel with two parameters (Simple Gilbert burst-loss model)
tc qdisc add dev eth0 root netem loss gemodel 5% 10%
```

## Combine Packet Loss with Delay

```bash
# Simulate a poor mobile connection: 100ms delay with 20ms jitter + 2% loss
tc qdisc add dev eth0 root netem delay 100ms 20ms loss 2%
```

## Combine Packet Loss with Packet Corruption

```bash
# 1% packet loss + 0.1% packet corruption
tc qdisc add dev eth0 root netem loss 1% corrupt 0.1%
```

## Simulate Packet Reordering

```bash
# 25% of packets sent immediately while others are delayed by 10ms (causes reordering)
tc qdisc add dev eth0 root netem delay 10ms reorder 25% 50%
```

## Change Existing Loss Rule

```bash
# Update loss percentage without removing the rule
tc qdisc change dev eth0 root netem loss 20%
```

## Remove Packet Loss

```bash
# Delete the netem qdisc to restore normal behavior
tc qdisc del dev eth0 root

# Confirm removal
tc qdisc show dev eth0
```

## Loss Scenarios for Testing

```bash
# WiFi with interference (1-2% loss)
tc qdisc add dev eth0 root netem loss 1%

# Congested network (5-10% loss)
tc qdisc add dev eth0 root netem loss 5%

# Very poor connection (20% loss)
tc qdisc add dev eth0 root netem loss 20%

# Combined: satellite-like conditions
tc qdisc add dev eth0 root netem delay 600ms loss 3% corrupt 0.1%
```

## Apply to Loopback for Local Testing

```bash
# Test application behavior on localhost
tc qdisc add dev lo root netem loss 5%

# Clean up after testing
tc qdisc del dev lo root
```

## Conclusion

`tc qdisc add dev <interface> root netem loss <percent>%` simulates packet loss for all outgoing traffic. Combine with `delay <time> <jitter>`, `corrupt`, and `reorder` for comprehensive network degradation testing. Always clean up with `tc qdisc del dev <interface> root` when done. netem is the standard Linux tool for network condition simulation and chaos engineering.
