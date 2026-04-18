# How to View Bonding Driver Parameters on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bonding, Linux, /proc/net/bonding, Sysfs, Network Interfaces, Monitoring, Ip link

Description: Learn how to view all bonding driver parameters on Linux including bond mode, MII monitoring interval, active slave, slave states, and link failure counts using /proc and sysfs.

---

Linux exposes bonding driver parameters through `/proc/net/bonding/` and `/sys/class/net/bond0/bonding/`. These provide real-time visibility into bond health and configuration.

## Reading Bond Status from /proc

```bash
# Full bond status

cat /proc/net/bonding/bond0

# Example output:
# Ethernet Channel Bonding Driver: v3.7.1 (April 27, 2011)
# 
# Bonding Mode: active-backup
# Primary Slave: eth0 (primary_reselect always)
# Currently Active Slave: eth0
# MII Status: up
# MII Polling Interval (ms): 100
# Up Delay (ms): 0
# Down Delay (ms): 0
# Peer Notification Delay (ms): 0
# 
# Slave Interface: eth0
#   MII Status: up
#   Speed: 1000 Mbps
#   Duplex: full
#   Link Failure Count: 0
#   Permanent HW addr: aa:bb:cc:dd:ee:01
#   Slave queue ID: 0
# 
# Slave Interface: eth1
#   MII Status: up
#   Speed: 1000 Mbps
#   Duplex: full
#   Link Failure Count: 0
#   Permanent HW addr: aa:bb:cc:dd:ee:02
#   Slave queue ID: 0
```

## Reading Bond Parameters from sysfs

```bash
# Bond mode
cat /sys/class/net/bond0/bonding/mode
# active-backup 1

# MII polling interval
cat /sys/class/net/bond0/bonding/miimon

# List slaves
cat /sys/class/net/bond0/bonding/slaves
# eth0 eth1

# Active slave
cat /sys/class/net/bond0/bonding/active_slave
# eth0

# Primary slave
cat /sys/class/net/bond0/bonding/primary

# All available parameters
ls /sys/class/net/bond0/bonding/
```

## Using ip link show

```bash
# Show bond and its slaves
ip link show master bond0

# Show bond details
ip -d link show bond0
# Includes: bond mode active-backup miimon 100 updelay 0 downdelay 0

# Show slave details
ip -d link show eth0
# Includes: bond_slave state ACTIVE mii_status UP link_failure_count 0
```

## Monitoring with ethtool

```bash
# Physical stats for each slave
ethtool eth0
ethtool eth1

# NIC statistics (errors, drops, etc.)
ethtool -S eth0 | grep -E "error|miss|drop|collision"
```

## Monitoring Bond Health with a Script

```bash
#!/bin/bash
# /usr/local/bin/bond-health.sh

BOND="bond0"
echo "=== Bond: $BOND ==="
echo "Mode: $(cat /sys/class/net/$BOND/bonding/mode)"
echo "Active: $(cat /sys/class/net/$BOND/bonding/active_slave)"
echo ""

for slave in $(cat /sys/class/net/$BOND/bonding/slaves); do
  status=$(cat /sys/class/net/$slave/operstate)
  failures=$(grep -A5 "Slave Interface: $slave" /proc/net/bonding/$BOND | grep "Link Failure" | awk '{print $NF}')
  echo "Slave: $slave  Status: $status  Failures: $failures"
done
```

## Key Takeaways

- `/proc/net/bonding/<bond>` provides a comprehensive human-readable status of all bond parameters and slave states.
- Individual parameters are accessible via `/sys/class/net/<bond>/bonding/` for scripting and monitoring.
- Monitor `Link Failure Count` per slave - increasing counts indicate flapping physical links.
- Use `cat /sys/class/net/bond0/bonding/active_slave` in monitoring scripts to alert when the active slave changes.
