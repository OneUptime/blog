# How to Configure IPv6 Router Advertisements on OpenWrt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenWrt, Router Advertisement, Odhcpd, SLAAC, Networking

Description: Configure IPv6 Router Advertisements on OpenWrt using odhcpd to enable SLAAC address autoconfiguration and DNS delivery for LAN clients.

## Introduction

OpenWrt uses `odhcpd` (OpenWrt DHCP Daemon) as its default IPv6 Router Advertisement and DHCPv6 server. Unlike standalone `radvd`, `odhcpd` is tightly integrated with the UCI configuration system, making it easy to manage via both the CLI and the LuCI web interface.

## Checking odhcpd Status

```bash
# Verify odhcpd is running

/etc/init.d/odhcpd status

# Check the installed odhcpd package version
opkg list-installed | grep '^odhcpd' || apk list -I | grep '^odhcpd'
```

## Configuring RA via UCI

The `dhcp` UCI package controls odhcpd behavior:

```bash
# Configure the LAN interface for Router Advertisements + SLAAC
uci set dhcp.lan.ra=server
uci set dhcp.lan.ra_slaac=1
uci set dhcp.lan.ra_default=1
uci set dhcp.lan.ra_maxinterval=100
uci set dhcp.lan.ra_mininterval=30
uci set dhcp.lan.ra_lifetime=1800
uci commit dhcp
/etc/init.d/odhcpd restart
```

The `ra` option values:
- `server` - send RAs from this router
- `relay` - relay RAs from another router upstream
- `hybrid` - relay when a designated master interface is active, otherwise fall back to server mode
- `disabled` - no RA

## Configuring DNS via RA (RDNSS/DNSSL)

```bash
# Advertise custom DNS servers in RA
uci add_list dhcp.lan.dns=2001:db8:1:1::53
uci add_list dhcp.lan.dns=2606:4700:4700::1111
uci commit dhcp

# Advertise DNS search domain
uci add_list dhcp.lan.domain=example.com
uci commit dhcp

/etc/init.d/odhcpd restart
```

## Editing /etc/config/dhcp Directly

For a full view of the configuration:

```text
# /etc/config/dhcp (relevant LAN section for IPv6 RA)

config dhcp 'lan'
    option interface 'lan'
    option start '100'
    option limit '150'
    option leasetime '12h'
    # IPv6 Router Advertisement settings
    option ra 'server'
    option ra_slaac '1'
    option ra_default '1'
    option ra_maxinterval '100'
    option ra_mininterval '30'
    option ra_lifetime '1800'
    option ra_hoplimit '64'
    # DNS settings advertised in RA
    list dns '2001:db8:1:1::53'
    list domain 'example.com'
```

## Setting M/O Flags for DHCPv6 Integration

When running DHCPv6 alongside RA:

```bash
# Enable DHCPv6 service on LAN
uci set dhcp.lan.dhcpv6=server

# Advertise DHCPv6 for addresses + other configuration (M + O flags)
uci -q delete dhcp.lan.ra_flags
uci add_list dhcp.lan.ra_flags='managed-config'
uci add_list dhcp.lan.ra_flags='other-config'

uci commit dhcp
/etc/init.d/odhcpd restart
```

The `ra_flags` option values:
- `other-config` - set the O flag so clients use DHCPv6 for additional information such as DNS
- `managed-config` - set the M flag so clients use DHCPv6 for addresses
- use `other-config` alone for SLAAC + DHCPv6 other information
- use both `managed-config` and `other-config` for stateful DHCPv6 addressing

## Configuring via LuCI (Web Interface)

1. Navigate to **Network > Interfaces > LAN > Edit**
2. Click the **IPv6 Settings** tab
3. Under **Router Advertisement-Service**, select **Server mode**
4. Enable **Enable SLAAC**
5. Set **RA Interval** and **RA Lifetime** as desired
6. Add DNS servers under **Announce IPv4/6 DNS servers**
7. Click **Save & Apply**

## Verifying RA on a Client

```bash
# On a client device connected to the OpenWrt LAN
# Check that a global IPv6 address was assigned via SLAAC
ip -6 addr show scope global

# Check that the default route was installed from RA
ip -6 route show default
# Expected: default via fe80::<openwrt-link-local> dev eth0 proto ra

# Verify DNS was received
cat /etc/resolv.conf
# or
resolvectl status | grep "DNS Servers"
```

## Debugging odhcpd

```bash
# Enable verbose logging for odhcpd
uci set dhcp.odhcpd.loglevel=7
uci commit dhcp
/etc/init.d/odhcpd restart

# View odhcpd logs
logread | grep odhcpd

# Or run odhcpd in foreground with debug output
/etc/init.d/odhcpd stop
odhcpd -f -l 7
```

## Conclusion

OpenWrt's `odhcpd` provides a unified solution for IPv6 Router Advertisements and DHCPv6, configured entirely through the UCI system. The `ra=server` and `ra_slaac=1` options enable the most common SLAAC deployment with minimal configuration. For enterprise-style deployments requiring DHCPv6 alongside RA, adjust the `ra_flags` option to set the M/O flags appropriately.
