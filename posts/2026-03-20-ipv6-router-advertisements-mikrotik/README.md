# How to Configure IPv6 Router Advertisements on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MikroTik, RouterOS, Router Advertisement, SLAAC, Networking

Description: Configure IPv6 Router Advertisements on MikroTik RouterOS to enable SLAAC address autoconfiguration and DNS delivery for connected clients.

## Introduction

MikroTik RouterOS manages IPv6 Router Advertisements through the `/ipv6 nd` menu. The interface is straightforward but has some RouterOS-specific naming conventions to be aware of. This guide focuses on the RouterOS CLI; the same settings are available in Winbox.

## Prerequisites

- MikroTik router with IPv6 support enabled
- On older RouterOS 6 builds, verify the `ipv6` package is installed and enabled with `/system package print`
- IPv6 address assigned to the LAN interface

## Checking IPv6 Status

```bash
# On older RouterOS 6 builds, verify the "ipv6" package is installed
/system package print

# Verify IPv6 is enabled system-wide
/ipv6 settings print

# Enable IPv6 forwarding if this device will route IPv6
/ipv6 settings set forward=yes
```

## Assigning an IPv6 Address to the LAN Interface

```bash
# Assign a static IPv6 /64 to bridge1 (typical LAN interface)
/ipv6 address add address=2001:db8:1:1::1/64 interface=bridge1 advertise=yes

# Verify the address is assigned
/ipv6 address print
```

The `advertise=yes` flag tells RouterOS to include this prefix in Router Advertisements.

## Configuring Router Advertisement Settings

```bash
# Add an ND entry for the bridge1 interface and set RA parameters
/ipv6 nd add interface=bridge1 \
    ra-interval=30s-100s \
    ra-lifetime=30m \
    managed-address-configuration=no \
    other-configuration=no \
    advertise-dns=yes \
    advertise-mac-address=yes

# Verify the configuration
/ipv6 nd print detail
```

## Configuring RDNSS via RouterOS

MikroTik can advertise DNS servers in Router Advertisements:

```bash
# Advertise specific IPv6 DNS servers via RDNSS
/ipv6 nd set [find interface=bridge1] \
    advertise-dns=yes \
    dns-servers=2001:db8:1:1::53,2606:4700:4700::1111

# Or advertise the DNS servers configured on the router itself
/ip dns set servers=2001:db8:1:1::53,2606:4700:4700::1111
/ipv6 nd set [find interface=bridge1] advertise-dns=yes
```

## Configuring RA Prefix Details

```bash
# Prefix options are auto-derived from /ipv6 address when advertise=yes.
# If you want manual control of lifetimes and flags, disable automatic
# prefix advertisement on the address first:
/ipv6 address set [find address="2001:db8:1:1::1/64" interface=bridge1] advertise=no

# Then add the prefix to advertise:
/ipv6 nd prefix add prefix=2001:db8:1:1::/64 \
    interface=bridge1 \
    valid-lifetime=1d \
    preferred-lifetime=4h \
    autonomous=yes \
    on-link=yes
```

## Setting M/O Flags for DHCPv6

If you want Router Advertisements to tell clients that DHCPv6 is available for addresses:

```bash
# M flag = 1: advertise that DHCPv6-managed addresses are available
/ipv6 nd set [find interface=bridge1] managed-address-configuration=yes

# O flag = 1: advertise that DHCPv6 provides other configuration
/ipv6 nd set [find interface=bridge1] other-configuration=yes
```

The M flag advertises stateful addressing via DHCPv6. If the RA still includes an autonomous prefix (for example from an `advertise=yes` IPv6 address), many clients will use both SLAAC and DHCPv6. For DHCPv6-only addressing, do not advertise the prefix for autonomous configuration.

## Disabling RA on WAN Interfaces

```bash
# Disable Router Advertisements on the ether1 (WAN) interface
/ipv6 nd set [find interface=ether1] disabled=yes
# Or add with disabled
/ipv6 nd add interface=ether1 disabled=yes
```

## Verifying Router Advertisements

```bash
# Show current ND/RA configuration
/ipv6 nd print detail

# Show the IPv6 neighbor table
/ipv6 neighbor print

# Monitor ICMPv6 traffic, including RAs
/tool sniffer quick interface=bridge1 ip-protocol=icmpv6
```

## Example Full Configuration

```bash
# Complete MikroTik IPv6 RA setup from scratch

# 1. Assign IPv6 address
/ipv6 address add address=2001:db8:1:1::1/64 interface=bridge1 advertise=yes

# 2. Set system DNS
/ip dns set servers=2001:db8:1:1::53,2001:4860:4860::8888

# 3. Configure RA for the LAN
/ipv6 nd add interface=bridge1 \
    ra-interval=30s-100s \
    ra-lifetime=30m \
    managed-address-configuration=no \
    other-configuration=no \
    advertise-dns=yes

# 4. Verify
/ipv6 nd print detail
/ipv6 address print
```

## Conclusion

MikroTik RouterOS provides a concise CLI for configuring IPv6 Router Advertisements through the `/ipv6 nd` menu. Setting `advertise=yes` on the address and `advertise-dns=yes` on the ND profile covers most deployment needs. For DHCPv6 integrated deployments, set the M and O flags appropriately, configure a DHCPv6 server to complement the RA, and avoid advertising an autonomous prefix if you want DHCPv6-only addressing.
