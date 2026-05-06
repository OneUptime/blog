# How to Configure Network Bonding with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Linux, systemd-networkd, Bonding, High Availability, Network Configuration

Description: Learn how to configure network interface bonding with systemd-networkd for link aggregation and failover on Linux systems.

---

Network bonding combines multiple physical interfaces into a single logical interface for redundancy or increased throughput. systemd-networkd manages bonding through `.netdev` and `.network` configuration files.

---

## Create the Bond Device (.netdev)

```ini
# /etc/systemd/network/10-bond0.netdev

[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
UpDelaySec=2s
DownDelaySec=200ms
```

Common bond modes:
- `active-backup` - failover only
- `balance-rr` - round-robin load balancing
- `802.3ad` - LACP link aggregation
- `balance-alb` - adaptive load balancing

---

## Attach Physical Interfaces to the Bond

```ini
# /etc/systemd/network/20-eth0-bond.network
[Match]
Name=eth0

[Network]
Bond=bond0
```

```ini
# /etc/systemd/network/20-eth1-bond.network
[Match]
Name=eth1

[Network]
Bond=bond0
```

---

## Configure the Bond Interface

```ini
# /etc/systemd/network/30-bond0.network
[Match]
Name=bond0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1
DNS=8.8.8.8

[Link]
RequiredForOnline=yes
```

---

## Apply Configuration

```bash
sudo systemctl restart systemd-networkd
sudo networkctl status bond0

# Check bond status
cat /proc/net/bonding/bond0
```

---

## LACP (802.3ad) Mode

```ini
[Bond]
Mode=802.3ad
LACPTransmitRate=fast
MIIMonitorSec=100ms
```

Requires switch-side LACP configuration as well.

---

## Summary

Configure systemd-networkd bonding by creating a `.netdev` file to define the bond device and mode, `.network` files to assign physical interfaces to the bond, and a final `.network` file to configure the bond's IP address. Restart `systemd-networkd` and verify with `networkctl status bond0` and `/proc/net/bonding/bond0`.
