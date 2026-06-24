# How to Disable IPv6 and Keep IPv4 Only with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, IPv6, IPv4, Networking

Description: Disable IPv6 on Ubuntu and Debian systems using Netplan configuration, forcing interfaces to use IPv4 only.

## Introduction

Netplan keeps an interface IPv4-only by setting `dhcp6: false`, `accept-ra: no`, and `link-local: []`. For system-wide IPv6 disabling, combine Netplan settings with sysctl parameters. After applying, the interface will not configure IPv6 addresses.

## Disable IPv6 on a Specific Interface

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      # Disable IPv6
      dhcp6: false
      accept-ra: no
      link-local: []
```

```bash
netplan apply
ip addr show eth0  # Should show no inet6 lines
```

## Disable IPv6 on DHCP Interface

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      # IPv6 disabled
      dhcp6: false
      accept-ra: no
      link-local: []
```

## Disable IPv6 on Multiple Interfaces

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
      accept-ra: no
      link-local: []
    eth1:
      dhcp4: false
      addresses:
        - 10.0.0.10/24
      dhcp6: false
      accept-ra: no
      link-local: []
```

## Disable IPv6 System-Wide with sysctl

Combine Netplan settings with sysctl for a complete disable:

```bash
# Create sysctl configuration
cat > /etc/sysctl.d/99-disable-ipv6.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF

# Apply immediately
sysctl -p /etc/sysctl.d/99-disable-ipv6.conf
```

## Disable IPv6 via Kernel Boot Parameter

For systems where IPv6 must be disabled before network comes up:

```bash
# Add to GRUB_CMDLINE_LINUX in /etc/default/grub
GRUB_CMDLINE_LINUX="ipv6.disable=1"

# Update GRUB
update-grub
# Reboot required
```

## Verify IPv6 is Disabled

```bash
# Check interface has no IPv6 address
ip -6 addr show eth0
# Should show no inet6 lines

# Check disable_ipv6 sysctl if you used the sysctl method
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 1 = kernel-level IPv6 disable is enabled for this interface
```

## Conclusion

Disable IPv6 in Netplan by setting `accept-ra: no` and `link-local: []` per interface, and set `dhcp6: false` on DHCP interfaces. For system-wide IPv6 disable, also add `net.ipv6.conf.all.disable_ipv6=1` to sysctl. Apply Netplan changes with `netplan apply`.
