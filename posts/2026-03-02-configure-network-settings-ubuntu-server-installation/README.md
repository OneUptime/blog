# How to Configure Network Settings During Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Installation, Configuration

Description: Learn how to configure network settings during Ubuntu Server installation, including static IP, VLAN, bonding, and how to edit Netplan configurations after installation.

---

Network configuration during Ubuntu Server installation is more important than it might seem - getting it right from the start saves time compared to diagnosing connectivity problems after reboot. The Ubuntu Server installer uses Netplan under the hood, and the configuration you set during installation becomes the initial Netplan YAML file in `/etc/netplan/`. Understanding what the installer is doing - and how to reconfigure afterward - is essential knowledge for anyone managing Ubuntu servers.

## How the Installer Handles Networking

Ubuntu Server's installer (subiquity) detects all network interfaces and presents them for configuration. It uses NetworkManager or systemd-networkd through the Netplan abstraction layer. Whatever you configure in the installer gets written to a YAML file at `/etc/netplan/00-installer-config.yaml`.

## DHCP Configuration (Default)

The simplest option - let the installer configure DHCP on all detected interfaces. This is the default when you proceed without modifying the network screen.

The resulting Netplan file looks like:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
```

This is fine for a development VM or a server behind a DHCP server that assigns consistent addresses based on MAC. For production servers, use a static IP.

## Static IP Configuration During Installation

On the network configuration screen, select your interface and choose "Edit IPv4". Set:

- **Subnet**: Your network in CIDR notation, e.g., `192.168.1.0/24`
- **Address**: The IP for this server, e.g., `192.168.1.50`
- **Gateway**: Your router/gateway, e.g., `192.168.1.1`
- **Name servers**: DNS servers, e.g., `1.1.1.1, 8.8.8.8`
- **Search domains**: Optional, e.g., `company.local`

The resulting Netplan file:

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
        search: [company.local]
```

## Interface Naming

Modern Ubuntu uses predictable interface names based on hardware topology. Common patterns:

| Name | Meaning |
|------|---------|
| `enp0s3` | PCI bus 0, slot 3 |
| `ens3` | PCI slot 3 (simplified) |
| `eth0` | Traditional name (some cloud images) |
| `enp5s0f0` | PCI bus 5, slot 0, function 0 |
| `eno1` | On-board NIC 1 |

Find your interface name:

```bash
# List all network interfaces
ip link show
# or
ls /sys/class/net/
```

## Post-Installation Network Configuration with Netplan

Netplan configuration is done by editing YAML files in `/etc/netplan/`. All files in this directory are merged. Apply changes with `netplan apply`.

### Changing DHCP to Static After Installation

```bash
# Edit the Netplan file
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
```

```bash
# Test the configuration without applying (reverts after 2 minutes if not confirmed)
sudo netplan try

# Apply permanently
sudo netplan apply
```

### Multiple IP Addresses on One Interface

Servers sometimes need multiple IP addresses (virtual hosting, multiple services):

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24
        - 10.0.0.50/8      # Second subnet
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

### Multiple Network Interfaces

A server with separate management and data network interfaces:

```yaml
network:
  version: 2
  ethernets:
    # Management interface (for SSH, monitoring)
    enp0s3:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]

    # Data interface (for application traffic)
    enp0s8:
      dhcp4: no
      addresses:
        - 10.0.1.100/24
      # No default route - traffic stays on this subnet
```

## VLAN Configuration

VLANs allow one physical interface to carry traffic for multiple networks:

```yaml
network:
  version: 2
  ethernets:
    # Physical interface (trunk port)
    enp0s3:
      dhcp4: no

  vlans:
    # VLAN 100 - Production network
    vlan100:
      id: 100
      link: enp0s3
      dhcp4: no
      addresses:
        - 192.168.100.50/24
      routes:
        - to: default
          via: 192.168.100.1

    # VLAN 200 - Management network
    vlan200:
      id: 200
      link: enp0s3
      dhcp4: no
      addresses:
        - 192.168.200.50/24
```

The switch port connected to `enp0s3` must be configured as a trunk port carrying VLANs 100 and 200.

## Network Bonding (Link Aggregation)

Bonding combines multiple physical interfaces for redundancy or throughput:

```yaml
network:
  version: 2
  ethernets:
    # Physical interfaces (do not configure addresses here)
    enp0s3:
      dhcp4: no
    enp0s8:
      dhcp4: no

  bonds:
    bond0:
      interfaces: [enp0s3, enp0s8]
      parameters:
        mode: active-backup    # Failover (one active, one standby)
        # mode: 802.3ad        # LACP (requires switch support)
        # mode: balance-rr    # Round-robin load balancing
        mii-monitor-interval: 100
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

For `802.3ad` (LACP) mode, the switch must be configured to support LACP on those ports.

## Bridge Configuration

Bridges are needed for KVM/libvirt host networking where VMs need to appear on the physical network:

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: no     # Do not assign IP to physical interface

  bridges:
    br0:
      interfaces: [enp0s3]
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
      parameters:
        stp: false
        forward-delay: 0
```

VMs configured to use `br0` will get addresses on the `192.168.1.0/24` network directly.

## WiFi Configuration

Ubuntu Server supports WiFi through Netplan (useful for Raspberry Pi or NUC servers):

```yaml
network:
  version: 2
  wifis:
    wlan0:
      dhcp4: no
      addresses:
        - 192.168.1.200/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
      access-points:
        "MyWifiNetwork":
          password: "wifi-password"
```

## Troubleshooting Network Configuration

### Testing Configuration Safely

```bash
# 'netplan try' applies the config and reverts in 2 minutes unless confirmed
sudo netplan try
# If it works, press Enter to confirm
# If SSH drops, it will revert automatically after 2 minutes
```

### Checking Applied Configuration

```bash
# View current network configuration
ip addr show
ip route show
resolvectl status

# Check if DHCP is working
journalctl -u systemd-networkd | tail -20

# Test DNS resolution
resolvectl query google.com

# Test connectivity
ping -c 3 1.1.1.1       # Test IP connectivity
ping -c 3 google.com    # Test DNS + connectivity
```

### Debugging Netplan

```bash
# Generate the backend config without applying
sudo netplan generate

# Debug mode shows what Netplan generates
sudo netplan --debug apply

# View generated networkd configuration
cat /run/systemd/network/*.network
```

### Interface Not Coming Up

```bash
# Check if the interface exists
ip link show

# Check for errors in the journal
journalctl -u systemd-networkd -n 50

# Check if there are conflicting configurations
ls /etc/network/interfaces*    # Old ifupdown configs may conflict
ls /etc/NetworkManager/        # NetworkManager may conflict with networkd
```

### Conflicting with NetworkManager

If NetworkManager is installed alongside networkd, it can interfere with Netplan-managed interfaces. Check which renderer Netplan is using:

```bash
cat /etc/netplan/*.yaml | grep renderer
# Default on Server: networkd
# Default on Desktop: NetworkManager
```

To force networkd on all interfaces:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # ...
```

Good network configuration during installation sets the foundation for everything else on your server. Taking the extra minute to set a static IP and correct DNS during installation saves you from tracking down "why can't this resolve DNS" problems later.
