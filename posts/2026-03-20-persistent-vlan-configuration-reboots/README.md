# How to Make VLAN Configuration Persistent Across Reboots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, Persistence, Netplan, nmcli, systemd-networkd, Networking

Description: Persist VLAN interface configuration across reboots using Netplan on Ubuntu, nmcli on RHEL, systemd-networkd, or /etc/network/interfaces on Debian.

## Introduction

VLAN interfaces created with `ip link add` are lost on reboot. For production systems, you must configure VLANs through your distribution's network management tool. This guide shows persistent VLAN configuration methods for all major Linux distributions.

## Ubuntu / Netplan

```yaml
# /etc/netplan/01-vlans.yaml

network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false

  vlans:
    eth0.100:
      id: 100
      link: eth0
      addresses:
        - 192.168.100.1/24
      routes:
        - to: default
          via: 192.168.100.254
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
# Apply and verify
netplan apply
ip addr show eth0.100
```

## RHEL / CentOS / Fedora (nmcli)

```bash
# Create persistent VLAN connection
nmcli connection add \
    type vlan \
    con-name "eth0.100" \
    dev eth0 \
    id 100 \
    ipv4.addresses "192.168.100.1/24" \
    ipv4.gateway "192.168.100.254" \
    ipv4.dns "8.8.8.8" \
    ipv4.method manual \
    connection.autoconnect yes

nmcli connection up "eth0.100"
```

## Debian (/etc/network/interfaces)

```bash
# /etc/network/interfaces

# Load 8021q module
auto eth0
iface eth0 inet manual
    pre-up modprobe 8021q

# VLAN 100 with static IP
auto eth0.100
iface eth0.100 inet static
    address 192.168.100.1
    netmask 255.255.255.0
    gateway 192.168.100.254
    vlan-raw-device eth0
    dns-nameservers 8.8.8.8
```

```bash
# Install vlan package for ifupdown support
apt install vlan

# Apply
ifup eth0.100
```

## systemd-networkd

```ini
# /etc/systemd/network/10-vlan100.netdev
[NetDev]
Name=eth0.100
Kind=vlan

[VLAN]
Id=100
```

```ini
# /etc/systemd/network/10-vlan100.network
[Match]
Name=eth0.100

[Network]
Address=192.168.100.1/24
Gateway=192.168.100.254
DNS=8.8.8.8
```

```ini
# /etc/systemd/network/05-eth0.network
[Match]
Name=eth0

[Network]
VLAN=eth0.100
```

```bash
systemctl restart systemd-networkd
```

## Ensure the 8021q Module Loads at Boot

Regardless of the network tool used:

```bash
echo "8021q" > /etc/modules-load.d/8021q.conf
```

## Verify Persistence After Reboot

```bash
# Reboot the system
reboot

# After reboot, verify VLAN is present
ip link show eth0.100
ip addr show eth0.100
ping -c 3 192.168.100.254
```

## Conclusion

VLAN persistence requires using your distribution's network management tool. Netplan on Ubuntu and nmcli on RHEL create persistent configurations by default. Debian uses `/etc/network/interfaces` with the `vlan` package. systemd-networkd uses `.netdev` and `.network` file pairs. Always ensure the `8021q` module is configured to load at boot via `/etc/modules-load.d/`.
