# How to Troubleshoot Network Bonding Failover Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, Failover, Troubleshooting, MII, Networking, High Availability

Description: Diagnose and fix network bond failover problems including slow failover, failed failover, and incorrect slave selection on Linux.

## Introduction

Bonding failover issues manifest as connectivity loss during link failures, slow failover times, or bonds failing to recover when a link comes back up. Systematic troubleshooting using `/proc/net/bonding`, kernel logs, and MII monitoring parameters resolves most issues.

## Step 1: Verify the Bond is in the Correct Mode

```bash
cat /proc/net/bonding/bond0 | grep "Bonding Mode"

# Common HA/fault-tolerant modes:

# fault-tolerance (active-backup) - Mode 1
# IEEE 802.3ad (LACP) - Mode 4
# adaptive transmit/load balancing - Mode 5/6
```

## Step 2: Check MII Monitoring is Enabled

MII monitoring is one way to detect link failures. If neither MII monitoring nor ARP monitoring is configured, the bond won't detect failures:

```bash
cat /proc/net/bonding/bond0 | grep -E "MII Polling|ARP Polling"
# MII Polling Interval (ms): 100

# If MII is 0 and ARP monitoring is not configured, link monitoring is disabled!
# Enable MII monitoring (this disables ARP monitoring if it was enabled):
echo 100 > /sys/class/net/bond0/bonding/miimon
```

## Step 3: Check updelay and downdelay

With MII monitoring, incorrect `updelay` and `downdelay` settings cause slow failover or recovery:

```bash
cat /proc/net/bonding/bond0 | grep -E "Up Delay|Down Delay"
# Up Delay (ms): 0
# Down Delay (ms): 0

# If downdelay is very high (e.g., 5000ms), failover will be slow
# Reset to 0 or 200ms
echo 200 > /sys/class/net/bond0/bonding/downdelay
echo 200 > /sys/class/net/bond0/bonding/updelay
```

## Step 4: Check Slave Link States

```bash
# Check each slave's MII state
grep -A 5 "Slave Interface" /proc/net/bonding/bond0

# Check link failure counts
grep "Link Failure Count" /proc/net/bonding/bond0
# High count indicates flapping
```

## Step 5: Test Failover Manually

```bash
# For modes that expose an active slave (active-backup, balance-tlb, balance-alb)
active=$(cat /sys/class/net/bond0/bonding/active_slave)
echo "Active slave: $active"

# Simulate failure: bring down the active slave
ip link set "$active" down

# Check failover happened (within the miimon/downdelay window)
sleep 0.5
echo "Active slave after failure: $(cat /sys/class/net/bond0/bonding/active_slave)"
# Should now show another available slave, for example eth1

# Verify connectivity during failover
ping -I bond0 8.8.8.8 -c 10 &

# Bring back the failed slave and verify recovery or failback
ip link set "$active" up
sleep 1
echo "Active slave after recovery: $(cat /sys/class/net/bond0/bonding/active_slave)"
```

## Step 6: Check Kernel Logs for Failover Events

```bash
# Check dmesg for bond events
dmesg | grep -i "bond\|enslav\|freed"

# Monitor in real time
journalctl -kf | grep bond0
```

## Common Issues and Fixes

| Issue | Cause | Fix |
|---|---|---|
| No failover | miimon = 0 and ARP monitoring disabled | `echo 100 > /sys/class/net/bond0/bonding/miimon` |
| Slow failover (>5s) | downdelay too high | `echo 200 > .../bonding/downdelay` |
| No failback to primary | primary_reselect = failure | `echo always > .../bonding/primary_reselect` |
| Bond stays with backup | Primary not set | `echo eth0 > .../bonding/primary` |
| Flapping interfaces | updelay too low | `echo 500 > .../bonding/updelay` |

## Set primary_reselect Policy

For modes that support a primary slave, set the `primary_reselect` policy:

```bash
# Always return to primary when it comes back up
echo always > /sys/class/net/bond0/bonding/primary_reselect

# Return to primary only if it is better (higher speed)
echo better > /sys/class/net/bond0/bonding/primary_reselect

# Only return if the current active slave fails
echo failure > /sys/class/net/bond0/bonding/primary_reselect
```

## Conclusion

Common bonding failover issues are caused by link monitoring not being set, incorrect delay values, or primary_reselect configuration. Enable miimon at 100ms for fast detection when using MII monitoring, set updelay and downdelay to 200ms to avoid flapping, and configure primary_reselect to `always` for predictable failback behavior when a primary slave is configured. Monitor failover events in the kernel log with `journalctl -kf | grep bond`.
