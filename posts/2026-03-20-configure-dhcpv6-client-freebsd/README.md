# How to Configure DHCPv6 Client on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, DHCPv6, Dhcp6c, Network Configuration

Description: Learn how to configure a DHCPv6 client on FreeBSD to obtain IPv6 addresses and network configuration from a DHCPv6 server, using dhcp6c.

## DHCPv6 Overview

DHCPv6 operates in two modes:
- **Stateful (IA_NA)**: Server assigns IPv6 addresses
- **Stateless**: SLAAC assigns addresses, DHCPv6 provides DNS/options only

The router's RA flags indicate how hosts should use DHCPv6:
- `M=1` → Hosts should use DHCPv6 for address assignment (`O` is redundant when `M` is set)
- `O=1` → Hosts should use DHCPv6 for other configuration (such as DNS)

## Install dhcp6c (DHCPv6 Client)

```bash
# dhcp6c is part of the dhcp6 package

pkg install dhcp6

# Or check if it's already available
which dhcp6c
```

## Configure dhcp6c

```bash
# Create /usr/local/etc/dhcp6c.conf
cat > /usr/local/etc/dhcp6c.conf << 'EOF'
interface em0 {
    # Request an IPv6 address (IA_NA - Identity Association for Non-temporary Addresses)
    send ia-na 0;

    # Request a prefix delegation (IA_PD - for routers)
    # send ia-pd 0;

    # Request DNS information
    request domain-name-servers;
    request domain-name;

    # Optional: run a custom script when configuration changes
    # script "/absolute/path/to/your-script";
};

id-assoc na 0 {
    # Optional: specify requested addresses and lifetimes
};
EOF
```

## Enable dhcp6c in rc.conf

```bash
cat >> /etc/rc.conf << 'EOF'
# Enable IPv6 on the interface and accept router advertisements
ifconfig_em0_ipv6="inet6 -ifdisabled accept_rtadv"
rtsold_enable="YES"

# DHCPv6 client
dhcp6c_enable="YES"
dhcp6c_interfaces="em0"
EOF

ifconfig em0 inet6 -ifdisabled accept_rtadv
service rtsold start
service dhcp6c start
```

## Run dhcp6c Manually

```bash
# Start DHCPv6 client on em0 in foreground with debug
dhcp6c -f -d -D em0

# Start in background
dhcp6c em0

# Check if running
pgrep dhcp6c
ps aux | grep dhcp6c
```

## Verify DHCPv6 Address Assignment

```bash
# Check for DHCPv6-assigned address
ifconfig em0 | grep inet6

# View dhcp6c logs
grep dhcp6c /var/log/messages
```

## FreeBSD dhclient vs. dhcp6c

```bash
# FreeBSD's dhclient is the DHCPv4 client
dhclient em0

# Use dhcp6c for DHCPv6
which dhcp6c
```

## Stateless DHCPv6 (Options Only)

```bash
# For stateless DHCPv6 (DNS only, SLAAC for addresses):
cat > /usr/local/etc/dhcp6c.conf << 'EOF'
interface em0 {
    # Don't request addresses (SLAAC handles that)
    # Only request DNS options
    information-only;
    request domain-name-servers;
    request domain-name;
    # Optional: run a custom script when configuration changes
    # script "/absolute/path/to/your-script";
};
EOF

# Also enable SLAAC for addresses
cat >> /etc/rc.conf << 'EOF'
ifconfig_em0_ipv6="inet6 accept_rtadv"
rtsold_enable="YES"
dhcp6c_enable="YES"
dhcp6c_interfaces="em0"
EOF
```

## Summary

Configure DHCPv6 client on FreeBSD with `dhcp6c`. Create `/usr/local/etc/dhcp6c.conf` with `interface em0 { send ia-na 0; request domain-name-servers; }`. Enable IPv6 and router advertisements with `ifconfig_em0_ipv6="inet6 -ifdisabled accept_rtadv"` and `rtsold_enable="YES"` in `/etc/rc.conf`, then enable `dhcp6c` with `dhcp6c_enable="YES"` and `dhcp6c_interfaces="em0"`. For stateless DHCPv6 (DNS only), use `information-only` and combine with SLAAC (`accept_rtadv`). Verify with `ifconfig em0 | grep inet6` and `grep dhcp6c /var/log/messages`.
