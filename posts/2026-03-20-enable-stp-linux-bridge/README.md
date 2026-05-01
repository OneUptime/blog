# How to Enable STP on a Linux Bridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, STP, Spanning Tree Protocol, Networking, Loop Prevention

Description: Enable Spanning Tree Protocol (STP) on a Linux bridge to prevent network loops when multiple bridges or redundant paths exist in your network topology.

## Introduction

Spanning Tree Protocol (STP) prevents network loops in bridged networks by blocking redundant paths and only allowing one active path at a time. STP is necessary when you have multiple switches or bridges with redundant connections. Without STP, a loop causes broadcast storms that can bring down the network.

## Enable STP on an Existing Bridge

```bash
# Enable STP on the bridge
ip link set dev br0 type bridge stp_state 1

# Verify STP is enabled
ip -d link show dev br0
# Look for: bridge ... stp_state 1
```

## STP States and Timing

After enabling STP, ports that are allowed to forward go through multiple states before reaching forwarding:

| State | Duration | Description |
|---|---|---|
| Blocking | Until topology changes | Won't forward, won't learn |
| Listening | 15 seconds | Participates in STP election |
| Learning | 15 seconds | Learns MAC addresses, no forwarding |
| Forwarding | Active | Fully active, forwards traffic |

Total delay: up to 30 seconds before a port reaches forwarding with default timers!

## Configure STP Timers

```bash
# Set bridge priority (lower = more likely to be root bridge)
ip link set dev br0 type bridge priority 4096

# Set forward delay (seconds spent in each of the listening and learning states)
ip link set dev br0 type bridge forward_delay 4

# Set hello time (seconds between STP BPDUs)
ip link set dev br0 type bridge hello_time 2

# Set max age (time to hold BPDU info)
ip link set dev br0 type bridge max_age 12
```

## Check STP State via brctl (Legacy)

```bash
# Install bridge-utils
apt install bridge-utils

# brctl is obsolete; prefer ip/bridge from iproute2 on modern systems
brctl showstp br0

# Example output shows each port's STP state
```

## Configure with Netplan

```yaml
network:
  version: 2
  bridges:
    br0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      parameters:
        stp: true
        forward-delay: 4
        hello-time: 2
        max-age: 12
        priority: 4096
```

## Rapid STP (RSTP)

The Linux bridge's built-in spanning tree support uses classic STP timings. For faster convergence, consider Rapid STP (RSTP/802.1w) in a switch implementation that supports it, such as Open vSwitch.

## When to Use STP

- Multiple physical bridges/switches connected in a loop topology
- Redundant uplinks from a bridge to the network
- Any setup where a loop is physically possible

## When NOT to Use STP

- Single bridge with single uplink (no loops possible)
- Simple KVM bridge setups with no redundant Layer 2 paths
- Environments where classic STP convergence delay is unacceptable

## Conclusion

Enable STP with `ip link set dev br0 type bridge stp_state 1` when your bridge is part of a topology with redundant paths. STP prevents broadcast storms but can add up to 30 seconds of convergence delay with default timers. Tune `forward_delay` down from the default 15 seconds if you need faster convergence, but keep it within the valid 2-30 second range.
