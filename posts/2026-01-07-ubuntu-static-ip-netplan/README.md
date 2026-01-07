# How to Set Up a Static IP Address on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Networking, Netplan, DevOps

Description: Configure static IP addresses on Ubuntu Server using Netplan for reliable network connectivity in production environments.

---

## Introduction

In production environments, servers need consistent, predictable IP addresses. Dynamic IP assignment through DHCP is convenient for development, but production workloads demand static IP addresses for reliable service discovery, firewall rules, and network security policies.

Ubuntu Server 18.04 and later versions use **Netplan** as the default network configuration tool. Netplan provides a YAML-based configuration system that abstracts the underlying network management daemon, whether it's NetworkManager or systemd-networkd.

This guide covers everything you need to know about configuring static IP addresses on Ubuntu Server using Netplan, from basic single-interface setups to complex multi-interface configurations with custom routes and DNS settings.

## Prerequisites

Before proceeding, ensure you have:

- Ubuntu Server 18.04 or later installed
- Root or sudo access to the server
- Physical or console access (in case network configuration fails)
- Knowledge of your network parameters (IP address, subnet, gateway, DNS servers)

## Understanding Netplan

### What is Netplan?

Netplan is a utility for easily configuring networking on Linux systems. It uses YAML description files to configure network interfaces and translates these configurations to the appropriate backend renderer (NetworkManager or systemd-networkd).

### Netplan Architecture

Netplan sits between you and the network configuration backends:

```
+------------------+
|   YAML Config    |
|  (/etc/netplan)  |
+--------+---------+
         |
         v
+--------+---------+
|     Netplan      |
|    (generate)    |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+ +------------+
|systemd| |NetworkMgr  |
|networkd| |            |
+-------+ +------------+
```

### Configuration File Location

Netplan configuration files are stored in `/etc/netplan/` directory. Files are processed in lexicographical order, with later files overriding earlier ones.

Check your existing configuration files:

```bash
# List all Netplan configuration files
ls -la /etc/netplan/
```

Common file names you might encounter:

- `00-installer-config.yaml` - Created during installation
- `01-netcfg.yaml` - Common naming convention
- `50-cloud-init.yaml` - Created by cloud-init on cloud instances

## YAML Syntax Basics for Netplan

Understanding YAML syntax is crucial for writing correct Netplan configurations. Here are the key rules:

### Indentation Rules

YAML uses spaces for indentation (not tabs). Netplan typically uses 2 or 4 spaces per level:

```yaml
# Correct YAML indentation (2 spaces)
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
```

### Common YAML Mistakes to Avoid

```yaml
# WRONG: Using tabs instead of spaces
network:
	version: 2  # This will fail!

# WRONG: Inconsistent indentation
network:
  version: 2
   ethernets:  # Wrong indentation level
    eth0:
      dhcp4: true

# CORRECT: Consistent 2-space indentation
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
```

### Lists in YAML

Netplan uses YAML lists for multiple values like addresses and DNS servers:

```yaml
# List format with dashes
addresses:
  - 192.168.1.100/24
  - 192.168.1.101/24

# Alternative inline format
addresses: [192.168.1.100/24, 192.168.1.101/24]
```

## Finding Your Network Interface Name

Before configuring static IP, identify your network interface name:

```bash
# List all network interfaces with their current configuration
ip addr show
```

Example output:

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 00:1a:2b:3c:4d:5e brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.50/24 brd 192.168.1.255 scope global dynamic eth0
```

You can also use these alternative commands:

```bash
# Show interface names only
ip link show

# Show detailed interface information
ip -details link show

# Alternative: Use networkctl (systemd-networkd)
networkctl list
```

Common interface naming schemes:

- **eth0, eth1** - Traditional naming
- **ens3, ens160** - Predictable naming (virtual machines)
- **enp0s3, enp3s0** - Predictable naming based on PCI slot
- **eno1, eno2** - Onboard network interfaces

## Basic Static IP Configuration

### Single Interface Configuration

Create or edit a Netplan configuration file:

```bash
# Backup existing configuration first
sudo cp /etc/netplan/00-installer-config.yaml /etc/netplan/00-installer-config.yaml.backup

# Edit the configuration file
sudo nano /etc/netplan/00-installer-config.yaml
```

Basic static IP configuration for a single interface:

```yaml
# Basic static IP configuration for Ubuntu Server
# This configures eth0 with a static IPv4 address
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      # Disable DHCP - we're using static configuration
      dhcp4: false
      # Static IP address with CIDR notation (/24 = 255.255.255.0)
      addresses:
        - 192.168.1.100/24
      # Default gateway for routing traffic outside the local network
      routes:
        - to: default
          via: 192.168.1.1
      # DNS servers for name resolution
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

### Understanding the Configuration

Let's break down each section:

```yaml
network:
  # Netplan configuration schema version (always 2)
  version: 2

  # Backend renderer: networkd (systemd-networkd) or NetworkManager
  # Use networkd for servers, NetworkManager for desktops
  renderer: networkd

  ethernets:
    # Interface name - must match your actual interface
    eth0:
      # Disable DHCP to use static configuration
      dhcp4: false

      # IPv4 addresses in CIDR notation
      # /24 means subnet mask 255.255.255.0 (256 addresses)
      # /16 means subnet mask 255.255.0.0 (65,536 addresses)
      addresses:
        - 192.168.1.100/24

      # Default route configuration
      routes:
        - to: default          # Destination (0.0.0.0/0)
          via: 192.168.1.1     # Gateway IP address

      # DNS configuration
      nameservers:
        addresses:
          - 8.8.8.8            # Primary DNS (Google)
          - 8.8.4.4            # Secondary DNS (Google)
```

## Advanced Static IP Configurations

### Multiple IP Addresses on Single Interface

Some scenarios require multiple IP addresses on a single interface:

```yaml
# Configuration with multiple IP addresses on one interface
# Useful for hosting multiple services or virtual hosts
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      # Multiple IP addresses on the same interface
      addresses:
        - 192.168.1.100/24    # Primary IP address
        - 192.168.1.101/24    # Secondary IP (alias)
        - 192.168.1.102/24    # Tertiary IP (alias)
        - 10.0.0.50/8         # Different subnet (if needed)
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
```

### IPv4 and IPv6 Dual-Stack Configuration

Configure both IPv4 and IPv6 for modern network compatibility:

```yaml
# Dual-stack configuration with both IPv4 and IPv6
# Essential for modern internet connectivity
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      # Disable both DHCP protocols for full static control
      dhcp4: false
      dhcp6: false
      # Both IPv4 and IPv6 addresses
      addresses:
        - 192.168.1.100/24              # IPv4 address
        - 2001:db8:1::100/64            # IPv6 address
      # IPv4 default route
      routes:
        - to: default
          via: 192.168.1.1
      # IPv6 default route
        - to: "::/0"
          via: "2001:db8:1::1"
      nameservers:
        # Both IPv4 and IPv6 DNS servers
        addresses:
          - 8.8.8.8                     # Google IPv4 DNS
          - 2001:4860:4860::8888        # Google IPv6 DNS
          - 1.1.1.1                     # Cloudflare IPv4 DNS
          - 2606:4700:4700::1111        # Cloudflare IPv6 DNS
```

### Multiple Network Interfaces

Servers often have multiple network interfaces for different purposes:

```yaml
# Multi-interface configuration for server with separate networks
# Common setup: public internet + private backend network
network:
  version: 2
  renderer: networkd
  ethernets:
    # Primary interface - Public/Internet facing
    eth0:
      dhcp4: false
      addresses:
        - 203.0.113.50/24           # Public IP address
      routes:
        - to: default
          via: 203.0.113.1          # Public gateway
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4

    # Secondary interface - Private/Backend network
    eth1:
      dhcp4: false
      addresses:
        - 10.0.0.50/24              # Private IP address
      # No default route - only for internal traffic
      routes:
        # Route to other private subnets through internal gateway
        - to: 10.0.1.0/24
          via: 10.0.0.1
        - to: 10.0.2.0/24
          via: 10.0.0.1
      # Use internal DNS for private network
      nameservers:
        addresses:
          - 10.0.0.2                # Internal DNS server
        search:
          - internal.example.com    # Search domain

    # Management interface - Out-of-band management
    eth2:
      dhcp4: false
      addresses:
        - 172.16.0.50/24            # Management network IP
      # Isolated network - no routes needed
```

## DNS Configuration

### Basic DNS Settings

Configure DNS servers and search domains:

```yaml
# DNS configuration with search domains
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        # DNS server addresses in order of preference
        addresses:
          - 192.168.1.2             # Local DNS server (preferred)
          - 8.8.8.8                 # Fallback to Google DNS
          - 1.1.1.1                 # Fallback to Cloudflare DNS
        # Search domains - appended to non-FQDN hostnames
        search:
          - example.com             # Primary search domain
          - internal.example.com    # Secondary search domain
          - dev.example.com         # Development domain
```

### Understanding Search Domains

Search domains allow you to use short hostnames:

```bash
# With search domain "example.com" configured:
ping webserver
# Automatically tries: webserver.example.com

# Without search domain, you must use FQDN:
ping webserver.example.com
```

### Per-Interface DNS

Different interfaces can have different DNS configurations:

```yaml
# Per-interface DNS configuration
# Useful when different networks have different DNS requirements
network:
  version: 2
  renderer: networkd
  ethernets:
    # Public interface uses public DNS
    eth0:
      dhcp4: false
      addresses:
        - 203.0.113.50/24
      routes:
        - to: default
          via: 203.0.113.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1

    # Private interface uses internal DNS
    eth1:
      dhcp4: false
      addresses:
        - 10.0.0.50/24
      nameservers:
        addresses:
          - 10.0.0.2               # Internal DNS
          - 10.0.0.3               # Backup internal DNS
        search:
          - corp.example.com
          - db.example.com
```

## Gateway and Routes Configuration

### Default Gateway

The default gateway handles all traffic not matched by specific routes:

```yaml
# Default gateway configuration
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        # Default route - all traffic goes through this gateway
        - to: default
          via: 192.168.1.1
```

### Static Routes

Add specific routes for particular destinations:

```yaml
# Advanced routing configuration with multiple static routes
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        # Default route
        - to: default
          via: 192.168.1.1

        # Route to another subnet through a different gateway
        - to: 10.10.0.0/16
          via: 192.168.1.254

        # Route to specific host
        - to: 172.16.5.10/32
          via: 192.168.1.254

        # Route with specific metric (lower = preferred)
        - to: 192.168.2.0/24
          via: 192.168.1.253
          metric: 100
```

### Policy-Based Routing

Route traffic based on source address or other criteria:

```yaml
# Policy-based routing configuration
# Routes traffic from specific IPs through different gateways
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24
      routes:
        # Default route for primary IP
        - to: default
          via: 192.168.1.1
          table: 100
        # Default route for secondary IP through different gateway
        - to: default
          via: 192.168.1.254
          table: 101
      routing-policy:
        # Traffic from primary IP uses table 100
        - from: 192.168.1.100
          table: 100
        # Traffic from secondary IP uses table 101
        - from: 192.168.1.101
          table: 101
```

### Multi-Gateway Failover

Configure backup routes for high availability:

```yaml
# Multi-gateway configuration with failover
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        # Primary route with lower metric (preferred)
        - to: default
          via: 192.168.1.1
          metric: 100
        # Backup route with higher metric
        - to: default
          via: 192.168.1.254
          metric: 200
      nameservers:
        addresses:
          - 8.8.8.8
```

## Advanced Interface Options

### MTU Configuration

Set Maximum Transmission Unit for the interface:

```yaml
# MTU configuration for jumbo frames or VPN tunnels
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      # Standard MTU is 1500, jumbo frames can be 9000
      mtu: 9000
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

### MAC Address Configuration

Override the hardware MAC address:

```yaml
# MAC address override configuration
# Useful for VM migration or replacing hardware
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      # Override MAC address (macaddress must be lowercase)
      macaddress: "00:11:22:33:44:55"
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

### Link-Local Addressing

Control link-local address assignment:

```yaml
# Link-local configuration options
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      # Disable IPv4 link-local (169.254.x.x)
      link-local: []
      # Or enable only IPv6 link-local
      # link-local: [ipv6]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

### Wake-on-LAN

Enable Wake-on-LAN for remote power management:

```yaml
# Wake-on-LAN configuration
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      # Enable Wake-on-LAN
      wakeonlan: true
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

## Applying Changes Safely

### Validating Configuration

Always validate your configuration before applying:

```bash
# Validate Netplan configuration syntax
sudo netplan generate

# If successful, no output is shown
# If there are errors, they will be displayed
```

### Testing Configuration with Timeout

Apply configuration temporarily with automatic rollback:

```bash
# Apply configuration with 120-second timeout
# If you don't confirm, it automatically reverts
sudo netplan try

# You'll see:
# Do you want to keep these settings?
# Press ENTER before the timeout to accept the new configuration
# Changes will revert in 120 seconds
```

This is the safest way to apply network changes, especially on remote servers.

### Applying Configuration Permanently

Once validated, apply the configuration:

```bash
# Apply configuration permanently
sudo netplan apply

# Verify the changes took effect
ip addr show eth0
ip route show
```

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Apply with debug output
sudo netplan apply --debug

# Generate configuration with debug output
sudo netplan generate --debug
```

## Verifying Configuration

### Check IP Address Assignment

```bash
# Show all IP addresses
ip addr show

# Show specific interface
ip addr show eth0

# Show only IPv4 addresses
ip -4 addr show

# Show only IPv6 addresses
ip -6 addr show
```

### Check Routing Table

```bash
# Show all routes
ip route show

# Show route for specific destination
ip route get 8.8.8.8

# Show routing table with more details
ip route show table all
```

### Check DNS Configuration

```bash
# Check systemd-resolved status
systemd-resolve --status

# Or on newer systems
resolvectl status

# Check DNS resolution
nslookup google.com
dig google.com

# Check /etc/resolv.conf (symlink to systemd-resolved)
cat /etc/resolv.conf
```

### Test Network Connectivity

```bash
# Ping the gateway
ping -c 4 192.168.1.1

# Ping external host
ping -c 4 8.8.8.8

# Ping with hostname (tests DNS)
ping -c 4 google.com

# Trace route to destination
traceroute 8.8.8.8

# Check if services are reachable
nc -zv 192.168.1.1 22
```

## Troubleshooting Network Issues

### Common Problems and Solutions

#### Problem: Network Not Coming Up

```bash
# Check interface status
ip link show eth0

# If interface is DOWN, bring it up
sudo ip link set eth0 up

# Check for Netplan errors
sudo netplan generate --debug

# Check systemd-networkd status
sudo systemctl status systemd-networkd
```

#### Problem: Configuration Syntax Errors

```bash
# Validate YAML syntax
sudo netplan generate

# Common error: tabs instead of spaces
# Fix: Convert tabs to spaces (2 spaces per level)

# Check for invisible characters
cat -A /etc/netplan/00-installer-config.yaml
```

#### Problem: DNS Not Working

```bash
# Check if DNS servers are configured
resolvectl status

# Check if systemd-resolved is running
sudo systemctl status systemd-resolved

# Restart systemd-resolved
sudo systemctl restart systemd-resolved

# Test direct DNS query
nslookup google.com 8.8.8.8
```

#### Problem: Cannot Reach Gateway

```bash
# Verify gateway is configured
ip route show

# Check if gateway is reachable at Layer 2
arping 192.168.1.1

# Check interface for errors
ip -s link show eth0

# Verify IP address is in correct subnet
ip addr show eth0
```

### Viewing Logs

```bash
# View networkd logs
journalctl -u systemd-networkd

# View recent network-related logs
journalctl -u systemd-networkd --since "10 minutes ago"

# Follow logs in real-time
journalctl -u systemd-networkd -f

# View all network-related messages
journalctl -t systemd-networkd -t systemd-resolved
```

### Resetting Network Configuration

If things go wrong, reset to DHCP:

```yaml
# Emergency DHCP configuration to restore connectivity
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true
```

Apply with:

```bash
sudo netplan apply
```

## Cloud Provider Considerations

### Preventing Cloud-Init Override

On cloud instances, cloud-init may override your configuration:

```bash
# Check if cloud-init is managing network
ls /etc/netplan/50-cloud-init.yaml

# Disable cloud-init network configuration
sudo bash -c 'echo "network: {config: disabled}" > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg'

# Create your configuration in a higher-priority file
sudo nano /etc/netplan/99-custom-config.yaml
```

### AWS EC2 Configuration

```yaml
# AWS EC2 static IP configuration
# Note: Ensure the IP matches what's assigned in AWS console
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 10.0.1.100/24          # Private IP from AWS
      routes:
        - to: default
          via: 10.0.1.1          # AWS subnet gateway (usually .1)
      nameservers:
        addresses:
          - 10.0.0.2             # AWS VPC DNS
        search:
          - ec2.internal
          - compute.internal
```

### Azure VM Configuration

```yaml
# Azure VM static IP configuration
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 10.0.0.4/24            # Azure private IP
      routes:
        - to: default
          via: 10.0.0.1          # Azure subnet gateway
      nameservers:
        addresses:
          - 168.63.129.16        # Azure DNS
```

## Complete Production Configuration Example

Here's a comprehensive configuration for a production server:

```yaml
# Production server network configuration
# Server: web-server-01
# Location: Primary datacenter
# Last modified: 2026-01-07
network:
  version: 2
  renderer: networkd

  ethernets:
    # Primary interface - Public traffic
    ens192:
      dhcp4: false
      dhcp6: false
      # Public IP address
      addresses:
        - 203.0.113.50/24
        - 2001:db8:1::50/64
      # Default routes for internet access
      routes:
        - to: default
          via: 203.0.113.1
          metric: 100
        - to: "::/0"
          via: "2001:db8:1::1"
          metric: 100
      # Public DNS servers
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 2001:4860:4860::8888
      # Enable Wake-on-LAN for remote management
      wakeonlan: true
      # Standard MTU
      mtu: 1500

    # Secondary interface - Private/Backend network
    ens224:
      dhcp4: false
      addresses:
        - 10.0.0.50/24
      # Routes to other internal subnets
      routes:
        - to: 10.0.1.0/24
          via: 10.0.0.1
        - to: 10.0.2.0/24
          via: 10.0.0.1
        - to: 10.0.3.0/24
          via: 10.0.0.1
      # Internal DNS for service discovery
      nameservers:
        addresses:
          - 10.0.0.2
          - 10.0.0.3
        search:
          - internal.example.com
          - db.internal.example.com
          - cache.internal.example.com
      # Jumbo frames for internal traffic
      mtu: 9000

    # Management interface - IPMI/iDRAC network
    ens256:
      dhcp4: false
      addresses:
        - 172.16.0.50/24
      # No routes - isolated management network
      # Disable link-local
      link-local: []
```

## Best Practices

### 1. Always Backup Before Changes

```bash
# Create timestamped backup
sudo cp /etc/netplan/00-installer-config.yaml \
    /etc/netplan/00-installer-config.yaml.$(date +%Y%m%d_%H%M%S)
```

### 2. Use netplan try for Remote Servers

```bash
# Always use try on remote servers
sudo netplan try --timeout 60
```

### 3. Document Your Configuration

Add comments to your YAML files:

```yaml
# Server: prod-web-01
# Purpose: Primary web server
# Network: Public VLAN 100
# Last updated: 2026-01-07
# Contact: network-team@example.com
network:
  version: 2
  # ... rest of configuration
```

### 4. Use Consistent Naming

Name your configuration files clearly:

```bash
# Good naming conventions
/etc/netplan/01-primary-network.yaml
/etc/netplan/02-management-network.yaml
/etc/netplan/99-override.yaml
```

### 5. Validate in Staging First

Test configuration changes in a staging environment before applying to production servers.

## Summary

Configuring static IP addresses on Ubuntu Server using Netplan involves:

1. **Understanding Netplan** - YAML-based network configuration that works with systemd-networkd
2. **Identifying interfaces** - Use `ip addr show` to find your interface names
3. **Writing configuration** - Create YAML files in `/etc/netplan/` with proper indentation
4. **Configuring essentials** - Set addresses, routes, and DNS servers
5. **Advanced options** - Multiple interfaces, policy routing, MTU, and more
6. **Safe deployment** - Always use `netplan try` on remote servers
7. **Verification** - Confirm changes with `ip addr`, `ip route`, and connectivity tests
8. **Troubleshooting** - Check logs with `journalctl` and validate syntax with `netplan generate`

With these techniques, you can reliably configure static IP addresses for production Ubuntu servers, ensuring consistent network connectivity for your infrastructure.

## Additional Resources

- [Netplan Official Documentation](https://netplan.io/reference)
- [Ubuntu Server Networking Guide](https://ubuntu.com/server/docs/network-configuration)
- [systemd-networkd Documentation](https://www.freedesktop.org/software/systemd/man/systemd-networkd.html)
