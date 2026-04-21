# How to Assign a Static IPv4 Address to a Bond Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bonding, Static IP, IPv4, iproute2, Networking, Network Configuration

Description: Assign a static IPv4 address, gateway, and DNS to a Linux bond interface using ip addr, Netplan, nmcli, or systemd-networkd for persistent configuration.

## Introduction

After creating a bond interface, you need to assign it a static IPv4 address for consistent network addressing. Static IPs are preferred for servers, gateways, and infrastructure hosts. This guide covers both temporary (ip commands) and persistent (Netplan, nmcli, systemd-networkd) configuration methods.

## Prerequisites

- Bond interface already created and active
- Root access

## Assign IP with ip addr (Temporary)

```bash
# Assign a static IP to bond0

ip addr add 192.168.1.100/24 dev bond0

# Add the default gateway
ip route add default via 192.168.1.1 dev bond0

# Bring up the bond
ip link set bond0 up

# Verify
ip addr show bond0
ip route show
```

## Remove an Existing IP

```bash
# Remove an old IP before assigning a new one
ip addr del 192.168.1.100/24 dev bond0
```

## Persistent Configuration: Netplan (Ubuntu)

```yaml
# /etc/netplan/01-bond.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0: {dhcp4: false}
    eth1: {dhcp4: false}

  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      parameters:
        mode: active-backup
        mii-monitor-interval: 100
```

```bash
netplan apply
```

## Persistent Configuration: nmcli (RHEL)

```bash
# Modify an existing bond connection to add a static IP
nmcli connection modify bond0 \
    ipv4.method manual \
    ipv4.addresses "192.168.1.100/24" \
    ipv4.gateway "192.168.1.1" \
    ipv4.dns "8.8.8.8 8.8.4.4"

nmcli connection up bond0
```

## Persistent Configuration: systemd-networkd

```ini
# /etc/systemd/network/10-bond0.network
[Match]
Name=bond0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=8.8.4.4
```

```bash
systemctl restart systemd-networkd
```

## Add Secondary IP Addresses

```bash
# Add a secondary IP to the bond
ip addr add 10.0.0.1/24 dev bond0

# Or via Netplan
addresses:
  - 192.168.1.100/24
  - 10.0.0.1/24
```

## Verify Static IP Configuration

```bash
# Check the bond IP
ip addr show bond0

# Check the routing table
ip route show

# Test connectivity
ping -I bond0 192.168.1.1 -c 3
ping -I bond0 8.8.8.8 -c 3

# Verify bond is up
cat /proc/net/bonding/bond0 | grep "MII Status"
```

## Conclusion

Assigning a static IP to a bond interface follows the same process as any other interface: use `ip addr add` for temporary configuration and your distribution's network manager for persistence. Configure both the IP address and the default gateway when the bond should provide the host's default route. After a failover event, the IP remains on the bond interface regardless of which slave is active.
