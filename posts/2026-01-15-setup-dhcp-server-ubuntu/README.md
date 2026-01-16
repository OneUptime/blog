# How to Set Up a DHCP Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Networking, Server, Infrastructure, Tutorial

Description: Complete guide to installing and configuring ISC DHCP Server on Ubuntu for automatic IP address assignment.

---

DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses and network configuration to devices. Running your own DHCP server gives you control over IP allocation, DNS settings, and network options. This guide covers ISC DHCP Server setup on Ubuntu.

## Prerequisites

- Ubuntu 20.04 or later
- Static IP on the server
- Root or sudo access
- Understanding of your network topology

## Network Planning

Before configuration, plan your network:

```
Network: 192.168.1.0/24
Gateway: 192.168.1.1
DHCP Server: 192.168.1.10
DHCP Range: 192.168.1.100 - 192.168.1.200
DNS Servers: 8.8.8.8, 8.8.4.4
```

## Installation

```bash
# Update packages
sudo apt update

# Install DHCP server
sudo apt install isc-dhcp-server -y
```

## Configure Network Interface

### Set Static IP on Server

```bash
sudo nano /etc/netplan/01-static.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
sudo netplan apply
```

### Specify DHCP Interface

```bash
sudo nano /etc/default/isc-dhcp-server
```

```bash
# Specify the interfaces on which to serve DHCP
INTERFACESv4="enp0s3"
INTERFACESv6=""
```

## Basic DHCP Configuration

```bash
sudo nano /etc/dhcp/dhcpd.conf
```

```conf
# Global options
option domain-name "example.local";
option domain-name-servers 8.8.8.8, 8.8.4.4;

# Default lease time (seconds)
default-lease-time 600;
max-lease-time 7200;

# DHCP server is authoritative for this network
authoritative;

# Log messages
log-facility local7;

# Subnet configuration
subnet 192.168.1.0 netmask 255.255.255.0 {
    # IP address range
    range 192.168.1.100 192.168.1.200;

    # Default gateway
    option routers 192.168.1.1;

    # Subnet mask
    option subnet-mask 255.255.255.0;

    # Broadcast address
    option broadcast-address 192.168.1.255;

    # DNS servers
    option domain-name-servers 8.8.8.8, 8.8.4.4;

    # NTP server (optional)
    option ntp-servers 192.168.1.10;
}
```

## Start DHCP Server

```bash
# Check configuration syntax
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Start and enable service
sudo systemctl start isc-dhcp-server
sudo systemctl enable isc-dhcp-server

# Check status
sudo systemctl status isc-dhcp-server
```

## Static IP Reservations

Assign fixed IPs to specific devices based on MAC address:

```conf
# Add to dhcpd.conf

# Static reservations
host webserver {
    hardware ethernet 00:11:22:33:44:55;
    fixed-address 192.168.1.50;
    option host-name "webserver";
}

host printer {
    hardware ethernet AA:BB:CC:DD:EE:FF;
    fixed-address 192.168.1.51;
    option host-name "printer";
}

host fileserver {
    hardware ethernet 11:22:33:44:55:66;
    fixed-address 192.168.1.52;
    option host-name "fileserver";
}
```

## Multiple Subnets

```conf
# First subnet
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    option domain-name-servers 8.8.8.8;
}

# Second subnet
subnet 192.168.2.0 netmask 255.255.255.0 {
    range 192.168.2.100 192.168.2.200;
    option routers 192.168.2.1;
    option domain-name-servers 8.8.8.8;
}

# For interface without DHCP service
subnet 10.0.0.0 netmask 255.255.255.0 {
    # No range = no DHCP on this subnet
}
```

## DHCP with VLANs

```conf
# VLAN 10 - Office
subnet 192.168.10.0 netmask 255.255.255.0 {
    range 192.168.10.100 192.168.10.200;
    option routers 192.168.10.1;
    option domain-name "office.local";
}

# VLAN 20 - Guest
subnet 192.168.20.0 netmask 255.255.255.0 {
    range 192.168.20.100 192.168.20.200;
    option routers 192.168.20.1;
    option domain-name "guest.local";
    # Shorter lease for guests
    default-lease-time 300;
    max-lease-time 600;
}
```

## Advanced Options

### PXE Boot Support

```conf
# PXE boot configuration
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;

    # TFTP server
    next-server 192.168.1.10;

    # Boot file
    filename "pxelinux.0";

    # Or for UEFI
    # filename "grubx64.efi";
}
```

### Vendor-Specific Options

```conf
# Vendor-specific options for specific devices
class "cisco-phones" {
    match if substring(option vendor-class-identifier, 0, 5) = "Cisco";
    option tftp-server-name "192.168.1.10";
}
```

### Pool-Based Configuration

```conf
subnet 192.168.1.0 netmask 255.255.255.0 {
    option routers 192.168.1.1;

    # Pool for known clients
    pool {
        range 192.168.1.100 192.168.1.150;
        allow known-clients;
        default-lease-time 86400;
    }

    # Pool for unknown clients
    pool {
        range 192.168.1.151 192.168.1.200;
        deny known-clients;
        default-lease-time 3600;
    }
}
```

## Failover Configuration

### Primary Server

```conf
# Primary DHCP server configuration
failover peer "dhcp-failover" {
    primary;
    address 192.168.1.10;
    port 647;
    peer address 192.168.1.11;
    peer port 647;
    max-response-delay 30;
    max-unacked-updates 10;
    load balance max seconds 3;
    mclt 3600;
    split 128;
}

subnet 192.168.1.0 netmask 255.255.255.0 {
    pool {
        failover peer "dhcp-failover";
        range 192.168.1.100 192.168.1.200;
    }
    option routers 192.168.1.1;
}
```

### Secondary Server

```conf
# Secondary DHCP server configuration
failover peer "dhcp-failover" {
    secondary;
    address 192.168.1.11;
    port 647;
    peer address 192.168.1.10;
    peer port 647;
    max-response-delay 30;
    max-unacked-updates 10;
    load balance max seconds 3;
}

subnet 192.168.1.0 netmask 255.255.255.0 {
    pool {
        failover peer "dhcp-failover";
        range 192.168.1.100 192.168.1.200;
    }
    option routers 192.168.1.1;
}
```

## View Leases

### Check Current Leases

```bash
# View lease file
cat /var/lib/dhcp/dhcpd.leases

# Or parse leases
dhcp-lease-list

# Formatted output
grep -E "^lease|hardware ethernet|client-hostname" /var/lib/dhcp/dhcpd.leases
```

### Lease File Format

```
lease 192.168.1.105 {
  starts 4 2024/01/15 10:30:00;
  ends 4 2024/01/15 12:30:00;
  cltt 4 2024/01/15 10:30:00;
  binding state active;
  next binding state free;
  hardware ethernet 00:11:22:33:44:55;
  client-hostname "laptop";
}
```

## DHCP Relay

If DHCP server is on different subnet:

```bash
# On router/relay device
sudo apt install isc-dhcp-relay -y

# Configure relay
sudo nano /etc/default/isc-dhcp-relay
```

```bash
SERVERS="192.168.1.10"
INTERFACES="eth0 eth1"
OPTIONS=""
```

## Logging

### Configure Logging

```conf
# In dhcpd.conf
log-facility local7;
```

```bash
# Configure rsyslog
sudo nano /etc/rsyslog.d/dhcpd.conf
```

```
local7.*    /var/log/dhcpd.log
```

```bash
# Restart rsyslog
sudo systemctl restart rsyslog

# View logs
sudo tail -f /var/log/dhcpd.log
```

## Firewall Configuration

```bash
# Allow DHCP traffic
sudo ufw allow 67/udp
sudo ufw allow 68/udp

# For failover
sudo ufw allow 647/tcp
```

## Troubleshooting

### Check Configuration

```bash
# Test configuration syntax
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Check interface binding
sudo dhcpd -f -d
```

### View Logs

```bash
# System log
sudo tail -f /var/log/syslog | grep dhcpd

# Journal
sudo journalctl -u isc-dhcp-server -f
```

### Common Issues

```bash
# No free leases
# Expand range or check for IP conflicts

# Server not responding
# Check interface in /etc/default/isc-dhcp-server
# Verify firewall rules

# Check if listening
sudo ss -ulnp | grep :67

# Test from client
sudo dhclient -v enp0s3
```

### Release and Renew (Client)

```bash
# Release IP
sudo dhclient -r enp0s3

# Request new IP
sudo dhclient enp0s3

# Force release and renew
sudo dhclient -r && sudo dhclient
```

## Security Best Practices

1. **Use static reservations** for critical servers
2. **Limit lease times** for guest networks
3. **Monitor lease file** for unauthorized devices
4. **Use separate VLANs** for different device types
5. **Enable logging** for auditing

---

A properly configured DHCP server simplifies network management and ensures consistent IP assignment. For monitoring your DHCP server and network infrastructure, consider using OneUptime for comprehensive service monitoring and alerting.
