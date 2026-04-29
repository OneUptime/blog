# How to Make IPv4 Address Changes Persistent Across Reboots on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, Netplan, NetworkManager, Persistent Configuration

Description: Make IPv4 address, gateway, and DNS settings persistent across reboots on Linux using Netplan, /etc/network/interfaces, NetworkManager, and systemd-networkd.

## Introduction

Changes made with `ip addr`, `ip route`, and `dhclient` are ephemeral - they disappear when the system reboots. Persistence requires writing the configuration to a file that the network management subsystem reads at boot.

## Method 1: Netplan (Ubuntu 18.04+)

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
# Test without committing (auto-reverts if you do not confirm within 120s)
sudo netplan try
# Or apply directly
sudo netplan apply
```

## Method 2: /etc/network/interfaces (Debian/Ubuntu systems using ifupdown)

```text
# /etc/network/interfaces
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    # Requires resolvconf or another ifupdown DNS hook
    dns-nameservers 8.8.8.8 1.1.1.1
```

```bash
sudo systemctl restart networking
# Or for single interface
sudo ifdown eth0 && sudo ifup eth0
```

## Method 3: NetworkManager with nmcli

```bash
# Modify the existing connection
nmcli con mod "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses "192.168.1.100/24" \
  ipv4.gateway "192.168.1.1" \
  ipv4.dns "8.8.8.8,1.1.1.1"

# Activate the change
nmcli con up "Wired connection 1"
```

By default, keyfile-based system connections are stored in `/etc/NetworkManager/system-connections/`.

## Method 4: systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=1.1.1.1
```

```bash
sudo systemctl enable --now systemd-networkd systemd-resolved
sudo networkctl reload
```

The `DNS=` entries are read by `systemd-resolved`.

## Method 5: Legacy RHEL/CentOS ifcfg files

```ini
# /etc/sysconfig/network-scripts/ifcfg-eth0
TYPE=Ethernet
NAME=eth0
DEVICE=eth0
BOOTPROTO=none
ONBOOT=yes
IPADDR=192.168.1.100
PREFIX=24
GATEWAY=192.168.1.1
PEERDNS=no
DNS1=8.8.8.8
DNS2=1.1.1.1
```

```bash
sudo nmcli connection load /etc/sysconfig/network-scripts/ifcfg-eth0
sudo nmcli connection up eth0
```

## Verifying Persistence After Reboot

```bash
# Reboot and verify
sudo reboot
# After login:
ip -4 addr show eth0
ip route show default
```

## Conclusion

Choose the persistence method that matches your distribution and network manager: Netplan for modern Ubuntu, `/etc/network/interfaces` for systems using ifupdown, NetworkManager via `nmcli` for NetworkManager-managed hosts, systemd-networkd for networkd-based deployments, and legacy `ifcfg` files on older RHEL/CentOS systems. Always test with `netplan try` or a controlled reboot after making changes.
