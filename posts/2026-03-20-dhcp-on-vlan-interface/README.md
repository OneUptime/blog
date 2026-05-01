# How to Configure DHCP on a VLAN Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, DHCP, Networking, Netplan, nmcli, Network Configuration

Description: Configure a VLAN subinterface to obtain its IP address automatically via DHCP using dhclient, Netplan, or nmcli.

## Introduction

When DHCP service is available for a VLAN, your VLAN subinterface can obtain its IP, gateway, and DNS settings automatically. This is common in enterprise environments where DHCP is scoped per VLAN, often through a DHCP relay. This guide shows how to configure DHCP on VLAN interfaces using different methods.

## Prerequisites

- Parent interface and VLAN ID identified (e.g., `eth0` and VLAN `100`)
- A DHCP server or DHCP relay reachable on VLAN 100
- Root access

## Method 1: Using dhclient (Temporary)

```bash
# Bring up the parent and VLAN interface first

ip link set eth0 up
ip link set eth0.100 up

# Request a DHCP lease on the VLAN interface
dhclient eth0.100

# Verify the assigned IP
ip addr show eth0.100
```

To release and renew:

```bash
# Release the current lease
dhclient -r eth0.100

# Request a new lease
dhclient eth0.100
```

## Method 2: Persistent DHCP with Netplan (Ubuntu)

```yaml
# /etc/netplan/01-vlan-dhcp.yaml
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
      dhcp4: true
      dhcp4-overrides:
        # Use DHCP-provided routes
        use-routes: true
        # Use DHCP-provided DNS
        use-dns: true
```

```bash
netplan apply
ip addr show eth0.100
```

## Method 3: DHCP with nmcli (RHEL/Fedora)

```bash
# Create VLAN connection with DHCP
nmcli connection add \
    type vlan \
    con-name "vlan100-dhcp" \
    ifname eth0.100 \
    dev eth0 \
    id 100 \
    ipv4.method auto

nmcli connection up "vlan100-dhcp"
```

## Method 4: DHCP with /etc/network/interfaces (Debian)

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet manual

auto eth0.100
iface eth0.100 inet dhcp
    vlan-raw-device eth0
```

```bash
ifup eth0.100
```

## Method 5: Using systemd-networkd

```ini
# /etc/systemd/network/20-vlan100.netdev
[NetDev]
Name=eth0.100
Kind=vlan

[VLAN]
Id=100
```

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
VLAN=eth0.100
```

```ini
# /etc/systemd/network/20-vlan100.network
[Match]
Name=eth0.100

[Network]
DHCP=ipv4
```

```bash
systemctl restart systemd-networkd
```

## Verify DHCP Assignment

```bash
# Check the assigned IP address
ip addr show eth0.100

# Check the default route received via DHCP
ip route show

# Verify DNS from DHCP
cat /etc/resolv.conf
# or
resolvectl status eth0.100
```

## Conclusion

DHCP on VLAN interfaces works by bringing up the subinterface and running a DHCP client against it. Use `dhclient` for quick testing, or configure persistent DHCP through your distribution's network manager (Netplan, nmcli, or systemd-networkd). The DHCP server or relay must be reachable through the VLAN, and the switch port must be configured to carry that tagged VLAN.
