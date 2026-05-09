# How to Configure IPv6 Firewall on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, IPv6, Firewall, RouterOS, Security

Description: Create IPv6 firewall rules in MikroTik RouterOS using the ip6tables-style filter, NAT, and mangle chains.

## Overview

Create IPv6 firewall rules in MikroTik RouterOS using the ip6tables-style filter, NAT, and mangle chains.

## Prerequisites

- MikroTik device with RouterOS 6.40+ or RouterOS 7.x
- Admin access via Winbox, SSH, or serial console
- IPv6 package installed and enabled

## Enabling IPv6 on MikroTik

```bash
# Check if IPv6 package is installed (RouterOS 6.x)

/system package print

# Enable the IPv6 package if not running
/system package enable ipv6
# Reboot required after enabling
/system reboot
```

## CLI Configuration Examples

### IPv6 Address Assignment

```text
# Add static IPv6 address to ether1
/ipv6 address add address=2001:db8::1/64 interface=ether1

# Add IPv6 with EUI-64 (auto-generate from MAC)
/ipv6 address add address=2001:db8::/64 interface=ether1 eui-64=yes

# View IPv6 addresses
/ipv6 address print
```

### IPv6 Routes

```text
# Add IPv6 default route
/ipv6 route add dst-address=::/0 gateway=2001:db8:1::254

# Add static route
/ipv6 route add dst-address=2001:db8:abcd::/48 gateway=2001:db8::254

# View IPv6 routing table
/ipv6 route print
```

### IPv6 Firewall Rules

```text
# Allow established connections
/ipv6 firewall filter add chain=input connection-state=established,related action=accept

# Allow ICMPv6 (essential for IPv6!)
/ipv6 firewall filter add chain=input protocol=icmpv6 action=accept

# Drop everything else
/ipv6 firewall filter add chain=input action=drop

# View firewall rules
/ipv6 firewall filter print
```

### DHCPv6 Server

```text
# Create DHCPv6 server
/ipv6 dhcp-server add name=dhcpv6 interface=bridge address-pool=ipv6-pool

# Create address pool
/ipv6 pool add name=ipv6-pool prefix=2001:db8:abcd::/64 prefix-length=64

# View DHCP bindings
/ipv6 dhcp-server binding print
```

### Router Advertisements (ND)

```text
# Configure RA for SLAAC (advertise-dns=yes uses servers from /ip dns)
/ipv6 nd add interface=bridge advertise-dns=yes managed-address-configuration=no other-configuration=no

# View ND settings
/ipv6 nd print
```

## Winbox GUI Path

For GUI configuration:
- IPv6 Addresses: **IP → IPv6 Addresses**
- IPv6 Routes: **IP → IPv6 Routes**  
- IPv6 Firewall: **IP → Firewall → IPv6** (or **IPv6 → Firewall**)
- ND Settings: **IPv6 → ND**

## Monitoring Traffic

```text
# Real-time traffic monitoring (Torch) - mac-protocol selects IPv6 frames
/tool torch interface=ether1 mac-protocol=ipv6

# Interface statistics
/ipv6 address print
/interface print stats

# Connection tracking
/ipv6 firewall connection print
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your MikroTik router's IPv6 connectivity. Configure ICMP monitors targeting the router's IPv6 address and set up SNMP-based monitors using MikroTik's IPv6 MIB for interface status.

## Conclusion

How to Configure IPv6 Firewall on MikroTik on MikroTik RouterOS uses the `/ipv6` command tree. Remember that ICMPv6 must always be allowed in the firewall for IPv6 to function correctly. Use `/ipv6 address print` and `/ipv6 route print` to verify your configuration.
