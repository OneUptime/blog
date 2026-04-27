# How to Configure DHCP Server for IPv4 on OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPNsense, DHCP, IPv4, Network Configuration, FreeBSD

Description: Configure the ISC DHCP server on OPNsense to assign IPv4 addresses to LAN clients, set static mappings, configure DHCP options, and monitor active leases.

## Introduction

OPNsense uses ISC DHCP (or Kea in newer versions) for IPv4 address assignment. Configuration is done through the web GUI under **Services > ISC DHCPv4**. Each interface has its own DHCP server configuration.

## Enable DHCP Server on LAN

Navigate to **Services > ISC DHCPv4 > [LAN]**:

```text
Enable DHCP server on LAN interface:  checked

Subnet:         192.168.1.0
Subnet mask:    255.255.255.0
Available range: 192.168.1.1 – 192.168.1.254

Range:
  From: 192.168.1.100
  To:   192.168.1.200

Servers:
  DNS servers:    8.8.8.8, 8.8.4.4
  Gateway:        192.168.1.1
  Domain name:    local.lan
  Lease time:     86400 (24 hours)
```

## Static DHCP Mappings

Navigate to **Services > ISC DHCPv4 > [LAN] > Static Mappings > Add**:

```text
MAC address:    00:1a:2b:3c:4d:5e
IP address:     192.168.1.10
Hostname:       fileserver
Description:    File Server

```

## DHCP Options

Navigate to **Services > ISC DHCPv4 > [LAN]**:

```text
Additional BOOTP/DHCP Options:
  Number  Type    Value
  066     text    10.1.30.5        # TFTP server (VoIP phones)
  150     ipaddrs 10.1.30.5        # Cisco TFTP option
  121     hex     18c0a814c0a80101 # Classless static route 192.168.20.0/24 via 192.168.1.1
```

## DHCP on Multiple Interfaces

Navigate to **Services > ISC DHCPv4 > [OPT1]** (e.g., DMZ):

```text
Enable:  checked
Range:   10.1.40.100 – 10.1.40.200
Gateway: 10.1.40.1
DNS:     10.1.1.10
Lease:   3600 (1 hour - shorter for DMZ)
```

## Monitor Leases

Navigate to **Services > ISC DHCPv4 > Leases**:
- Shows active leases with MAC, IP, hostname, expiry

Or navigate to **Services > ISC DHCPv4 > [Interface] > Leases**

## DHCP Relay for Multiple Subnets

Navigate to **Services > DHCPv4 Relay**:

```text
Enable DHCP relay:   checked
Destination servers: 10.1.1.20   (centralized DHCP server IP)
Interface(s):        VLAN10, VLAN20, VLAN30
```

## OPNsense ISC DHCP Config (Behind the Scenes)

```nginx
# /var/dhcpd/etc/dhcpd.conf (generated; dhcpd runs chrooted under /var/dhcpd)

subnet 192.168.1.0 netmask 255.255.255.0 {
  range 192.168.1.100 192.168.1.200;
  option routers 192.168.1.1;
  option domain-name-servers 8.8.8.8, 8.8.4.4;
  option domain-name "local.lan";
  default-lease-time 86400;
  max-lease-time 86400;

  host fileserver {
    hardware ethernet 00:1a:2b:3c:4d:5e;
    fixed-address 192.168.1.10;
  }
}
```

## Conclusion

OPNsense DHCP server configuration mirrors pfSense but with a slightly different GUI layout. Enable per-interface, set address ranges, add static mappings for servers, and configure DHCP options for VoIP provisioning. Use DHCP relay when a centralized DHCP server serves multiple VLANs from a single host.
