# How to Configure systemd-networkd for Network Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Networking, Systemd-networkd, Linux

Description: Configure network interfaces on Ubuntu using systemd-networkd with static IPs, DHCP, VLANs, bonds, and bridges through simple INI-style configuration files.

---

Ubuntu systems come with NetworkManager enabled by default. For servers that don't need a GUI-driven network manager, `systemd-networkd` is a lightweight alternative that manages network interfaces through simple INI-style configuration files. It integrates naturally with the rest of the systemd ecosystem.

## When to Use systemd-networkd

`systemd-networkd` is well-suited for:
- Servers and headless systems
- Systems managed through configuration management (Ansible, Puppet, etc.)
- Complex network setups like bonds, VLANs, and bridges that benefit from declarative configuration
- Containers and VMs where NetworkManager's desktop features are unnecessary

For desktop Ubuntu, NetworkManager is the standard choice.

## Enabling systemd-networkd

```bash
# Enable and start systemd-networkd
sudo systemctl enable --now systemd-networkd

# If switching from NetworkManager, stop it first
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager
```

Also enable `systemd-resolved` for DNS:

```bash
sudo systemctl enable --now systemd-resolved

# Configure /etc/resolv.conf to use the stub resolver
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Configuration File Locations and Structure

Network configuration files live in:

- `/etc/systemd/network/` - Your configuration files (highest priority)
- `/run/systemd/network/` - Runtime configuration
- `/usr/lib/systemd/network/` - Vendor/distribution defaults

Files are processed in alphabetical order. Use numeric prefixes to control order:
- `10-eth0.network` - Applied before `20-eth1.network`

Each `.network` file consists of sections with key-value pairs.

## Configuring a Static IP Address

```bash
sudo nano /etc/systemd/network/10-eth0.network
```

```ini
# /etc/systemd/network/10-eth0.network

[Match]
# Match by interface name
Name=eth0

[Network]
# Static IP configuration
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=1.1.1.1 8.8.8.8
Domains=example.com

[Address]
# Additional address on the same interface
Address=192.168.1.101/24
```

Apply the configuration:

```bash
# Restart networkd to apply changes
sudo systemctl restart systemd-networkd

# Or reload just the network configurations
sudo networkctl reload

# Check the interface status
networkctl status eth0
```

## Configuring DHCP

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
# Enable DHCP for both IPv4 and IPv6
DHCP=yes

# Or just IPv4
# DHCP=ipv4

[DHCP]
# Use hostname from DHCP
UseHostname=yes

# Route all traffic through the DHCP-provided gateway
UseRoutes=yes

# Accept DNS from DHCP
UseDNS=yes
```

## Matching Interfaces

The `[Match]` section supports several criteria:

```ini
[Match]
# Match by name (supports wildcards)
Name=eth0
Name=en*         # All interfaces starting with "en"

# Match by MAC address
MACAddress=aa:bb:cc:dd:ee:ff

# Match by type
Type=ether       # Ethernet
Type=wlan        # Wireless

# Match by PCI path (stable across reboots)
Path=pci-0000:00:1f.6

# Match multiple conditions (all must match)
Name=eth*
Type=ether
```

## Configuring Multiple Interfaces

```bash
# Static primary interface
sudo nano /etc/systemd/network/10-eth0.network
```

```ini
[Match]
Name=eth0

[Network]
Address=10.0.0.10/24
Gateway=10.0.0.1
DNS=10.0.0.1
Domains=corp.internal

# This is a "default route" interface
```

```bash
# DHCP secondary interface
sudo nano /etc/systemd/network/20-eth1.network
```

```ini
[Match]
Name=eth1

[Network]
DHCP=yes

[DHCP]
# Don't use this interface's gateway as default route
UseRoutes=no
# Don't use this interface's DNS
UseDNS=no
```

## Setting Up a Network Bridge

Bridges are used for virtualization or when you want multiple physical interfaces to act as a single one:

```bash
# Create the bridge
sudo nano /etc/systemd/network/10-bridge.netdev
```

```ini
# /etc/systemd/network/10-bridge.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
ForwardDelaySec=2
```

```bash
# Attach eth0 to the bridge
sudo nano /etc/systemd/network/20-bridge-eth0.network
```

```ini
# /etc/systemd/network/20-bridge-eth0.network
[Match]
Name=eth0

[Network]
# Join the bridge - don't configure eth0 itself
Bridge=br0
```

```bash
# Configure the bridge interface
sudo nano /etc/systemd/network/30-bridge.network
```

```ini
# /etc/systemd/network/30-bridge.network
[Match]
Name=br0

[Network]
DHCP=yes
```

## Setting Up a VLAN Interface

```bash
# Create the VLAN virtual interface
sudo nano /etc/systemd/network/30-vlan100.netdev
```

```ini
# /etc/systemd/network/30-vlan100.netdev
[NetDev]
Name=eth0.100
Kind=vlan

[VLAN]
Id=100
```

```bash
# Configure the VLAN interface
sudo nano /etc/systemd/network/40-vlan100.network
```

```ini
# /etc/systemd/network/40-vlan100.network
[Match]
Name=eth0.100

[Network]
Address=10.100.0.10/24
DNS=10.100.0.1
```

```bash
# Tell eth0 about the VLAN
sudo nano /etc/systemd/network/10-eth0.network
```

```ini
[Match]
Name=eth0

[Network]
# Reference the VLAN
VLAN=eth0.100
# eth0 itself may or may not have an IP
```

## Configuring a Bond (Link Aggregation)

```bash
# Create the bond device
sudo nano /etc/systemd/network/10-bond0.netdev
```

```ini
# /etc/systemd/network/10-bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
# 802.3ad LACP (active-backup is another option)
Mode=802.3ad
TransmitHashPolicy=layer3+4
LACPTransmitRate=fast
MIIMonitorSec=100ms
```

```bash
# Attach member interfaces to the bond
sudo nano /etc/systemd/network/20-bond-eth0.network
```

```ini
[Match]
Name=eth0

[Network]
Bond=bond0
```

```bash
sudo nano /etc/systemd/network/20-bond-eth1.network
```

```ini
[Match]
Name=eth1

[Network]
Bond=bond0
```

```bash
# Configure the bond interface
sudo nano /etc/systemd/network/30-bond0.network
```

```ini
[Match]
Name=bond0

[Network]
DHCP=yes
```

## Adding Static Routes

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=10.0.0.10/24
Gateway=10.0.0.1

[Route]
# Route for the 10.10.0.0/16 network via a specific gateway
Gateway=10.0.0.254
Destination=10.10.0.0/16
Metric=100

[Route]
# Blackhole route (drop traffic to this destination)
Type=blackhole
Destination=192.168.99.0/24
```

## Monitoring Network Status

```bash
# List all managed interfaces
networkctl list

# Detailed status of a specific interface
networkctl status eth0

# Watch status changes in real time
networkctl monitor

# Show link statistics
networkctl lldp    # LLDP neighbor information
networkctl lldp eth0
```

## Troubleshooting

```bash
# Check systemd-networkd logs
journalctl -u systemd-networkd -f

# Check for configuration errors
sudo systemd-analyze verify /etc/systemd/network/*.network

# Check interface configuration
ip addr show eth0
ip route show

# Test DNS resolution
resolvectl query google.com
```

**Interface not getting an IP via DHCP** - Check that the interface is recognized and the DHCP lease is being requested:

```bash
journalctl -u systemd-networkd | grep eth0 | grep -i dhcp
```

**Static IP not applying** - Verify the `[Match]` section actually matches your interface:

```bash
# Check the actual interface name
ip link show
networkctl list

# Names might be eth0, ens3, enp2s0, etc. depending on the system
```

**Conflict with NetworkManager** - If NetworkManager is still running, it may take over interfaces that systemd-networkd is trying to manage:

```bash
# Ensure NetworkManager is disabled
sudo systemctl status NetworkManager
sudo systemctl disable --now NetworkManager
```

## Comparing with netplan

Ubuntu 18.04+ introduced `netplan` as an abstraction layer that generates either NetworkManager or networkd configurations:

```yaml
# /etc/netplan/01-config.yaml - Netplan generates networkd config
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

```bash
# Apply netplan configuration
sudo netplan apply
```

If you use netplan with `renderer: networkd`, it generates the networkd files for you. Writing networkd files directly gives more control and avoids the netplan translation layer.

systemd-networkd is a capable network manager for server environments. Its declarative, file-based configuration works well with configuration management tools, and the integration with `systemd-resolved` and the rest of the systemd stack makes it a coherent choice for Ubuntu server deployments.
