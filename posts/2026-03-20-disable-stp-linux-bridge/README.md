# How to Disable STP on a Linux Bridge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, STP, Spanning Tree Protocol, KVM, Networking, Performance

Description: Disable Spanning Tree Protocol on a Linux bridge to eliminate the 30-second forwarding delay and improve network startup time in loop-free topologies.

## Introduction

Some Linux bridge configurations enable STP by default, and a bridge port can spend up to 30 seconds in the Listening and Learning states before it starts forwarding traffic. In environments like KVM hypervisors where there are no loops, disabling STP improves VM startup time and reduces unnecessary overhead.

## Check Current STP State

```bash
# Check STP state (0 = disabled, 1 = enabled)

cat /sys/class/net/br0/bridge/stp_state

# Or using ip
ip -d link show br0 | grep stp_state
```

## Disable STP at Runtime

```bash
# Disable STP on the bridge
ip link set br0 type bridge stp_state 0

# Verify
cat /sys/class/net/br0/bridge/stp_state
# 0

# Or verify with ip
ip -d link show br0 | grep stp_state
```

## Using brctl (Legacy Tool)

```bash
# Install bridge-utils
apt install bridge-utils

# Disable STP with brctl
brctl stp br0 off

# Verify
brctl show br0
# Look for "no" in the "STP enabled" column
```

## Persistent with Netplan

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    br0:
      interfaces: [eth0]
      addresses: [192.168.1.100/24]
      parameters:
        stp: false
```

## Persistent with nmcli

```bash
nmcli connection modify br0 bridge.stp no
nmcli connection up br0
```

## Persistent with systemd-networkd

```ini
# /etc/systemd/network/10-br0.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=no
```

## Persistent with /etc/network/interfaces

```bash
auto br0
iface br0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
```

## Effect of Disabling STP

| With STP | Without STP |
|---|---|
| Up to 30 seconds before forwarding | Immediate forwarding |
| Loop protection | No loop protection |
| BPDU packets overhead | No BPDU traffic |
| Suitable for redundant topologies | Suitable for loop-free topologies |

## When It Is Safe to Disable STP

- Single bridge with one uplink and no alternate Layer 2 path back into the same bridge
- KVM hypervisor with VM tap interfaces only
- Container networking bridges with no redundant Layer 2 paths
- Point-to-point bridge connections

## Conclusion

Disable STP with `ip link set br0 type bridge stp_state 0` when your bridge topology has no loops. This removes STP BPDU traffic and the forwarding delay that occurs when STP is enabled. With STP off, a separate `forward_delay` setting is not needed. Never disable STP in topologies with redundant physical paths or any other Layer 2 loop path - doing so will cause broadcast storms.
