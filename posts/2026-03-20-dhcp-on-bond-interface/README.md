# How to Configure DHCP on a Bond Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Bonding, Linux, Bond Interface, Network Redundancy, IPv4, High Availability

Description: Learn how to configure a DHCP client on a Linux bond interface to obtain an IPv4 address while maintaining link redundancy through active-backup or LACP bonding.

---

A bond interface aggregates multiple physical interfaces into one logical interface. Configuring DHCP on the bond allows the host to receive a single IP while maintaining link redundancy.

## Creating a Bond with DHCP

### Using /etc/network/interfaces (Debian/Ubuntu)

```bash
# Install bonding tools

apt install ifenslave -y
modprobe bonding

# /etc/network/interfaces
auto bond0
iface bond0 inet dhcp
  bond-slaves eth0 eth1
  bond-mode active-backup
  bond-miimon 100
  bond-primary eth0

auto eth0
iface eth0 inet manual
  bond-master bond0

auto eth1
iface eth1 inet manual
  bond-master bond0
```

### Using nmcli (RHEL/CentOS)

```bash
# Create bond connection
nmcli connection add type bond \
  ifname bond0 \
  con-name bond0 \
  mode active-backup \
  miimon 100 \
  primary eth0

# Add bond ports
nmcli connection add type ethernet \
  ifname eth0 \
  con-name bond0-port1 \
  controller bond0

nmcli connection add type ethernet \
  ifname eth1 \
  con-name bond0-port2 \
  controller bond0

# Set bond to use DHCP
nmcli connection modify bond0 ipv4.method auto

# Activate
nmcli connection up bond0-port1
nmcli connection up bond0-port2
```

### Using systemd-networkd

```ini
# /etc/systemd/network/10-bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
PrimaryReselectPolicy=always
```

```ini
# /etc/systemd/network/10-bond0.network
[Match]
Name=bond0

[Network]
DHCP=yes
```

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bond=bond0
PrimarySlave=yes
```

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
Bond=bond0
```

## Verifying DHCP on Bond

```bash
# Check bond status
cat /proc/net/bonding/bond0

# Verify IP assignment
ip -4 addr show dev bond0

# Test failover: disable primary slave
ip link set eth0 down
cat /proc/net/bonding/bond0   # Should show eth1 as active
ip addr show bond0            # IP should still be assigned
```

## Key Takeaways

- DHCP runs on the bond interface, not on individual slave interfaces; slaves have no IPs.
- In active-backup mode, only one slave passes traffic at a time; a backup slave takes over on failure.
- In the default active-backup configuration, the bond MAC usually stays the same across failovers; with other `fail_over_mac` policies, the bond MAC can change during failover.
- Use `miimon=100` (100ms) for fast link failure detection; for switches configured for it, use LACP (mode=802.3ad).
