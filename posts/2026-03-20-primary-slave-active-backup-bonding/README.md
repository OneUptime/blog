# How to Configure the Primary Slave in Active-Backup Bonding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bonding, Active-Backup, Primary Slave, Linux, Network Redundancy, IPv4, Primary_reselect

Description: Learn how to configure the primary slave in Linux active-backup bonding to control which interface carries traffic normally, and how primary reselection behaves after link recovery.

---

In active-backup bonding, the primary slave is the preferred interface. It carries all traffic when its link is up, and the bond fails over to a backup slave only when the primary fails.

## Setting the Primary Slave

```bash
# Using /etc/network/interfaces (Debian)

auto bond0
iface bond0 inet static
  address 10.0.0.10
  netmask 255.255.255.0
  bond-slaves eth0 eth1
  bond-mode active-backup
  bond-miimon 100
  # eth0 is preferred primary
  bond-primary eth0
  # Fail back to primary when it recovers
  bond-primary-reselect always
```

## Primary Reselect Modes

```sql
always  - Reselect primary whenever it comes back up (default)
better  - Reselect primary only if it has better speed/duplex than current
failure - Only switch back to primary after current active slave fails
```

```bash
# Set via sysfs at runtime
echo "always" > /sys/class/net/bond0/bonding/primary_reselect
# or
echo "failure" > /sys/class/net/bond0/bonding/primary_reselect
```

## Changing Primary Slave at Runtime

```bash
# Make eth1 the new primary
echo eth1 > /sys/class/net/bond0/bonding/primary

# Force failover to eth1 (even if eth0 is up)
echo eth1 > /sys/class/net/bond0/bonding/active_slave

# Verify
cat /proc/net/bonding/bond0 | grep -E "Primary Slave|Currently Active"
```

## systemd-networkd Configuration

```ini
# /etc/systemd/network/bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
PrimaryReselectPolicy=always
```

```ini
# /etc/systemd/network/eth0.network
[Match]
Name=eth0

[Network]
Bond=bond0
# eth0 is primary
PrimarySlave=yes
```

```ini
# /etc/systemd/network/eth1.network
[Match]
Name=eth1

[Network]
Bond=bond0
```

## nmcli: Set Primary Slave

```bash
nmcli connection modify bond0 \
  bond.options "mode=active-backup,miimon=100,primary=eth0,primary_reselect=always"
nmcli connection up bond0
```

## Verifying Primary Slave Configuration

```bash
# Show all bond parameters
cat /proc/net/bonding/bond0

# Relevant lines:
# Bonding Mode: fault-tolerance (active-backup)
# Primary Slave: eth0 (primary_reselect always)
# Currently Active Slave: eth0
# MII Polling Interval (ms): 100
# 
# Slave Interface: eth0
#   MII Status: up
#   Speed: 1000 Mbps
#   Duplex: full
#   Link Failure Count: 0

# Simulate failover
ip link set eth0 down
cat /proc/net/bonding/bond0 | grep "Currently Active"
# Shows: Currently Active Slave: eth1

ip link set eth0 up
# With primary_reselect=always, bond0 returns to eth0
```

## Key Takeaways

- Set `bond-primary eth0` (or `primary=eth0`) to define which slave is preferred when healthy.
- `primary_reselect=always` ensures traffic returns to the primary as soon as it recovers (may cause a brief failover).
- `primary_reselect=failure` keeps the current active slave until it fails, reducing unnecessary failovers.
- Use `echo <iface> > /sys/class/net/bond0/bonding/active_slave` to manually trigger failover for testing.
