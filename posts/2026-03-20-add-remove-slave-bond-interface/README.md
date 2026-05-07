# How to Add and Remove Slave Interfaces from a Bond

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bonding, Linux, Bond Slave, Network Interfaces, High Availability, Ip link, Ifenslave

Description: Learn how to add and remove slave interfaces from a Linux bond interface at runtime and persistently, including safe procedures for live systems with active traffic.

---

Managing bond slaves at runtime allows you to replace failed NICs, add capacity, or gracefully decommission interfaces without downtime.

## Adding a Slave at Runtime

```bash
# Method 1: Using ip link (modern)

ip link set eth2 down                          # Optional precaution on live systems
ip link set eth2 master bond0
ip link set eth2 up

# Method 2: Using ifenslave (legacy)
ifenslave bond0 eth2

# Verify slave was added
cat /proc/net/bonding/bond0 | grep "Slave Interface"
```

## Removing a Slave at Runtime

```bash
# Method 1: Using ip link
ip link set eth1 nomaster    # Remove from bond
ip link set eth1 down        # Optional: bring down the interface

# Method 2: Using ifenslave
ifenslave -d bond0 eth1

# Verify
cat /proc/net/bonding/bond0
```

## Safe Procedure for Live Bond (Minimizing Risk)

```bash
# For active-backup: identify the currently active slave first
cat /proc/net/bonding/bond0 | grep "Currently Active Slave"

# If removing the currently active slave:
# 1. Force failover to another already-enslaved slave (its link must be up)
echo eth1 > /sys/class/net/bond0/bonding/active_slave

# 2. Now safely remove eth0
ip link set eth0 nomaster

# 3. Verify traffic is flowing on eth1
cat /proc/net/bonding/bond0 | grep "Currently Active Slave"
```

## Checking Bond Slave Status

```bash
# Detailed bond status
cat /proc/net/bonding/bond0

# Output includes:
# Bonding Mode: active-backup
# Primary Slave: eth0
# Currently Active Slave: eth0
# 
# Slave Interface: eth0
#   MII Status: up
#   Link Failure Count: 0
# 
# Slave Interface: eth1
#   MII Status: up
#   Link Failure Count: 0

# Using ip link
ip link show master bond0
```

## Making Slave Changes Persistent

### /etc/network/interfaces (Debian)

```bash
# Add eth2 as a slave
auto eth2
iface eth2 inet manual
  bond-master bond0
```

### nmcli (RHEL)

```bash
# Add new slave
nmcli connection add type ethernet ifname eth2 con-name bond0-slave3 controller bond0
nmcli connection up bond0-slave3

# Remove slave
nmcli connection delete bond0-slave2
```

## Replacing a Failed NIC

```bash
# 1. Remove the failed NIC from bond
ip link set eth1 nomaster

# 2. Replace physical NIC (hardware step)

# 3. Add new NIC to bond
ip link set eth2 down
ip link set eth2 master bond0
ip link set eth2 up

# 4. Verify bond health
cat /proc/net/bonding/bond0
```

## Key Takeaways

- You can add a slave with `ip link set <iface> master <bond>`; bringing it down first is a common precaution on live systems.
- Remove a slave with `ip link set <iface> nomaster` - it becomes a standalone interface again.
- In active-backup mode, you can manually failover to another healthy slave before removing the currently active slave.
- Use `cat /proc/net/bonding/bond0` to verify slave state and active slave after changes.
