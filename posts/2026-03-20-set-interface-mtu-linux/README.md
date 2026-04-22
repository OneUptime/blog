# How to Set Interface MTU Values on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Linux, Interface, Networking, IP, Configuration

Description: Set interface MTU values on Linux using ip link, nmcli, and network configuration files to match network requirements and resolve fragmentation issues.

## Introduction

Setting the correct MTU on a network interface is fundamental to preventing fragmentation and ensuring optimal performance. Linux provides several methods to configure MTU: the `ip` command for immediate changes, NetworkManager for persistent configuration on desktops/servers, systemd-networkd for server deployments, and traditional `/etc/network/interfaces` for Debian-based systems.

## Temporary MTU Change (ip command)

```bash
# Set MTU immediately (does not survive reboot):

ip link set eth0 mtu 1450

# Verify change:
ip link show eth0 | grep mtu
cat /sys/class/net/eth0/mtu

# Change MTU for multiple interfaces:
ip link set eth0 mtu 1500
ip link set eth1 mtu 9000
ip link set wg0 mtu 1420

# Reset to default (1500 for Ethernet):
ip link set eth0 mtu 1500
```

## Persistent MTU with systemd-networkd

```bash
# Create or edit network file:
cat > /etc/systemd/network/10-eth0.network << 'EOF'
[Match]
Name=eth0

[Link]
MTUBytes=1450

[Network]
DHCP=yes
EOF

# Reload:
networkctl reload
networkctl status eth0 | grep MTU
```

## Persistent MTU with NetworkManager

```bash
# Set MTU via nmcli:
nmcli connection show   # List connections
nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 1450

# Apply:
nmcli connection up "Wired connection 1"

# Verify:
nmcli connection show "Wired connection 1" | grep mtu

# For WiFi interface:
nmcli connection modify "My WiFi" 802-11-wireless.mtu 1440
```

## Persistent MTU with /etc/network/interfaces (Debian/Ubuntu)

```bash
# Edit /etc/network/interfaces:
cat >> /etc/network/interfaces << 'EOF'
iface eth0 inet dhcp
    mtu 1450
EOF

# Apply:
ifdown eth0 && ifup eth0

# Or for static IP:
cat >> /etc/network/interfaces << 'EOF'
iface eth1 inet static
    address 10.20.0.10/24
    gateway 10.20.0.1
    mtu 9000
EOF
```

## Persistent MTU with Netplan (Ubuntu 17.10+)

```yaml
# /etc/netplan/01-network.yaml:
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
      mtu: 1450
    eth1:
      dhcp4: false
      addresses: ["10.20.0.10/24"]
      mtu: 9000
```

```bash
netplan apply
ip link show eth0 | grep mtu
```

## Set MTU via udev Rule

```bash
# Set MTU based on interface name or MAC address:
cat > /etc/udev/rules.d/10-mtu.rules << 'EOF'
SUBSYSTEM=="net", ACTION=="add", KERNEL=="eth0", RUN+="/sbin/ip link set %k mtu 1450"
SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="aa:bb:cc:dd:ee:ff", RUN+="/sbin/ip link set %k mtu 9000"
EOF

udevadm control --reload-rules
# Takes effect on the next matching udev add event
```

## Set MTU for Tunnel and Virtual Interfaces

```bash
# WireGuard:
ip link set wg0 mtu 1420
# Or in WireGuard config: MTU = 1420

# VXLAN:
ip link set vxlan0 mtu 1450

# GRE:
ip link set gre1 mtu 1476

# Docker bridge:
# In /etc/docker/daemon.json: "mtu": 1450

# Bridge interface:
ip link set br0 mtu 1500
# Note: bridge inherits smallest MTU from member interfaces
```

## Verify MTU is Correct

```bash
#!/bin/bash
# Verify MTU matches expected value for all interfaces

declare -A EXPECTED_MTU=(
    ["eth0"]="1500"
    ["wg0"]="1420"
    ["docker0"]="1450"
)

echo "MTU Verification:"
for iface in "${!EXPECTED_MTU[@]}"; do
    EXPECTED="${EXPECTED_MTU[$iface]}"
    ACTUAL=$(cat /sys/class/net/$iface/mtu 2>/dev/null)
    if [ -z "$ACTUAL" ]; then
        echo "  $iface: NOT FOUND"
    elif [ "$ACTUAL" = "$EXPECTED" ]; then
        echo "  $iface: OK ($ACTUAL)"
    else
        echo "  $iface: MISMATCH (expected=$EXPECTED, actual=$ACTUAL)"
    fi
done
```

## Conclusion

MTU changes with `ip link set` take effect immediately but are lost on reboot. For persistent configuration, use the method appropriate for your system: systemd-networkd, NetworkManager, Netplan, or `/etc/network/interfaces`. Virtual interfaces (tunnels, bridges, Docker) need MTU set explicitly to account for encapsulation overhead. Always verify with `ip link show` after making changes, and test with `ping -M do -s <payload-size> <destination>` to confirm large packets traverse the path correctly.
