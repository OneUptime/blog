# How to Set the MII Monitoring Interval for Network Bonds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, MII, Miimon, Failover, Networking, Link Monitoring

Description: Configure the MII (Media Independent Interface) link monitoring interval for Linux bond interfaces to tune failover detection speed and stability.

## Introduction

The MII monitoring interval (`miimon`) determines how often the bonding driver checks slave interface link status. A lower value means faster failover detection but more kernel overhead. The `updelay` and `downdelay` parameters prevent flapping by requiring a link to be stable for a minimum time before acting.

## Key MII Parameters

| Parameter | Description | Default |
|---|---|---|
| `miimon` | Link check interval in milliseconds | 100 (if `arp_interval` is unset; 0 disables) |
| `updelay` | Time (ms) before marking a link as up | 0 |
| `downdelay` | Time (ms) before marking a link as down | 0 |

**Important**: `updelay` and `downdelay` must be multiples of `miimon`.

## Set miimon at Runtime

```bash
# Enable MII monitoring with 100ms interval

echo 100 > /sys/class/net/bond0/bonding/miimon

# Verify
cat /sys/class/net/bond0/bonding/miimon
```

## Set miimon with ip link

```bash
# Set during bond creation
ip link add bond0 type bond mode active-backup miimon 100

# Set on an existing bond
ip link set bond0 type bond miimon 100
```

## Configure updelay and downdelay

```bash
# Wait 200ms after link comes up before marking it active
# (prevents flapping when link bounces)
echo 200 > /sys/class/net/bond0/bonding/updelay

# Wait 200ms after link goes down before failover
# (avoids failover on brief disconnects)
echo 200 > /sys/class/net/bond0/bonding/downdelay
```

## Recommended Values

```bash
# Fast failover (data center, low latency required)
# miimon=100ms, downdelay=100ms, updelay=200ms
echo 100 > /sys/class/net/bond0/bonding/miimon
echo 100 > /sys/class/net/bond0/bonding/downdelay
echo 200 > /sys/class/net/bond0/bonding/updelay

# Conservative (avoid flapping on unstable links)
# miimon=100ms, downdelay=2000ms, updelay=2000ms
echo 100 > /sys/class/net/bond0/bonding/miimon
echo 2000 > /sys/class/net/bond0/bonding/downdelay
echo 2000 > /sys/class/net/bond0/bonding/updelay
```

## Persistent Configuration

```yaml
# Netplan
bonds:
  bond0:
    interfaces: [eth0, eth1]
    parameters:
      mode: active-backup
      mii-monitor-interval: 100
      down-delay: 200
      up-delay: 200
```

```bash
# nmcli
nmcli connection modify bond0 \
    bond.options "mode=active-backup,miimon=100,updelay=200,downdelay=200"
```

## Verify MII Settings

```bash
cat /proc/net/bonding/bond0
# MII Polling Interval (ms): 100
# Up Delay (ms): 200
# Down Delay (ms): 200
```

## ARP Monitoring as Alternative

Instead of MII monitoring, you can use ARP monitoring to detect link health based on actual IP connectivity:

```bash
# Enable ARP monitoring (check connectivity to gateway every 1 second)
echo 0 > /sys/class/net/bond0/bonding/miimon  # Disable MII first
echo 1000 > /sys/class/net/bond0/bonding/arp_interval
echo +192.168.1.1 > /sys/class/net/bond0/bonding/arp_ip_target
```

## Conclusion

Setting `miimon=100` is the standard starting point for bond link monitoring (and is the kernel default when `arp_interval` is unset). Add `downdelay=200` and `updelay=200` to prevent flapping; both should be multiples of `miimon` (otherwise the kernel rounds them down to the nearest multiple). If `miimon` is set to 0, MII monitoring is disabled and the bonding driver cannot detect link failures via MII - you would need ARP monitoring instead.
