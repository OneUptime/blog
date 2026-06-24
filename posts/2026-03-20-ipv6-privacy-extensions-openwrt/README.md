# How to Configure IPv6 Privacy Extensions on OpenWrt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenWrt, Privacy, RFC4941, Router, Networking

Description: Enable and configure IPv6 privacy extensions on OpenWrt routers to generate temporary addresses that prevent cross-network device tracking.

## Introduction

OpenWrt is a popular open-source Linux-based firmware for routers. While OpenWrt manages IPv6 addresses for its own interfaces and advertises prefixes to clients, privacy extensions on the router itself are controlled by the Linux IPv6 stack. LAN clients decide independently whether to generate temporary addresses.

## Prerequisites

- OpenWrt 21.02 or later
- SSH access to the router
- Basic familiarity with the UCI configuration system

## Checking Current IPv6 Address Type

First, verify whether the router itself is using stable or temporary IPv6 addresses on the WAN interface:

```bash
WAN_DEV="eth1"   # replace with your actual WAN device, e.g. eth1 or pppoe-wan

# Check IPv6 addresses on the WAN interface
ip -6 addr show dev "$WAN_DEV"

# Check temporary-address preference
cat /proc/sys/net/ipv6/conf/$WAN_DEV/use_tempaddr
# 0 = disabled, 1 = enabled but prefer public, 2 = enabled and prefer temporary

# Check stable-address generation mode
cat /proc/sys/net/ipv6/conf/$WAN_DEV/addr_gen_mode
# 0 = EUI-64, 2 = stable-privacy, 3 = stable-privacy with a random secret if unset
```

## Ensuring the IPv6 Client Interface Is Configured

OpenWrt's UCI (Unified Configuration Interface) is the primary way to configure the `wan6` client interface:

```bash
# Ensure the IPv6 client interface exists and requests an address if offered
uci set network.wan6='interface'
uci set network.wan6.proto='dhcpv6'
uci set network.wan6.device='@wan'
uci set network.wan6.reqaddress='try'

# Apply the configuration
uci commit network
ifup wan6
```

The `reqaddress` option controls whether `odhcp6c` requests an IA_NA address from DHCPv6. Temporary SLAAC addresses are enabled separately with the kernel's `use_tempaddr` setting.

## Configuring via /etc/config/network

Edit the network configuration file directly if you prefer file-based configuration:

```text
# /etc/config/network (relevant IPv6 section)

config interface 'wan6'
    option device '@wan'
    option proto 'dhcpv6'
    option reqaddress 'try'
    option reqprefix 'auto'
```

After editing, apply the configuration:

```bash
# Reload network configuration without full restart
uci commit network
ifup wan6
```

## Enabling Temporary Addresses via sysctl

On OpenWrt, temporary addresses are controlled by the Linux `use_tempaddr` sysctl rather than a `privext` option in UCI:

```bash
WAN_DEV="eth1"   # replace with your actual WAN device, e.g. eth1 or pppoe-wan

# Enable temporary addresses and prefer them for outbound connections
echo 2 > /proc/sys/net/ipv6/conf/$WAN_DEV/use_tempaddr

# Persist across reboots using sysctl
echo "net.ipv6.conf.${WAN_DEV}.use_tempaddr = 2" >> /etc/sysctl.conf

# Apply immediately
/etc/init.d/sysctl restart
```

The `use_tempaddr` values are:
- `0` = disabled
- `1` = generate temporary addresses but prefer public addresses
- `2` = generate temporary addresses and prefer them for new outbound connections

This affects autoconfigured IPv6 addresses on the interface. RFC 7217 stable addresses are controlled separately with `addr_gen_mode`.

## Configuring Privacy for LAN Clients via odhcpd

To let LAN clients use SLAAC addresses of their own, configure Router Advertisements with OpenWrt's `odhcpd`. Client operating systems decide whether to create temporary addresses; the router can only advertise prefixes for SLAAC:

```text
# /etc/config/dhcp
# Enable Router Advertisements and SLAAC on LAN

config dhcp 'lan'
    option dhcpv6 'server'
    option ra 'server'
    option ra_slaac '1'
```

Apply the change:

```bash
uci commit dhcp
/etc/init.d/odhcpd restart
```

## Verifying After Configuration

```bash
WAN_DEV="eth1"   # replace with your actual WAN device, e.g. eth1 or pppoe-wan

# Check active IPv6 addresses on the WAN interface
ip -6 addr show dev "$WAN_DEV"

# Look for the 'temporary' flag in the output
# Example: inet6 2001:db8::1a2b:3c4d:5e6f:7890/64 scope global temporary dynamic

# Verify which source address the kernel prefers for outbound IPv6
ip -6 route get 2001:4860:4860::8888
# Look for "src ..." in the output; with use_tempaddr=2 it should prefer a temporary address when one exists
```

## Applying Settings via LuCI (Web Interface)

If you prefer the web UI:

1. Navigate to **Network > Interfaces**
2. Click **Edit** on the WAN6 interface
3. Confirm the interface is using the **DHCPv6 client** protocol and the correct **Device**
4. Adjust **Request IPv6-address** and **Request IPv6-prefix** as needed
5. Click **Save & Apply**

LuCI configures the `wan6` interface, but temporary-address privacy on the router itself is still controlled by the sysctl settings above.

## Conclusion

Configuring IPv6 privacy extensions on OpenWrt protects the router itself, but the setting is applied through Linux sysctls such as `use_tempaddr`, not a UCI `privext` option. Router Advertisements on the LAN can provide SLAAC prefixes, but each client OS decides whether to generate temporary addresses for itself. After configuration, verify that the router is using a temporary address for WAN-facing IPv6 communications when one is available.
