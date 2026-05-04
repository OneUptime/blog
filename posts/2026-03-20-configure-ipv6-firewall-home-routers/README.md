# How to Configure IPv6 Firewall on Home Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall, Home Router, Security, Ip6tables, OpenWrt

Description: Configure IPv6 firewall rules on home routers using OpenWRT, UFW, and common router admin interfaces to protect your home network.

## IPv6 Firewall Principles

IPv6 firewalls on home routers should:
1. Block all unsolicited inbound connections from the internet (WAN → LAN)
2. Allow all outbound connections (LAN → WAN)
3. Allow established/related return traffic
4. Always allow ICMPv6 (required for IPv6 operation)
5. Allow specific inbound rules for services you intentionally expose

## OpenWRT IPv6 Firewall Configuration

OpenWRT uses `nftables` (fw4) in recent versions. The default rules are found in `/etc/config/firewall`:

```text
# /etc/config/firewall

config defaults
    option input        REJECT
    option output       ACCEPT
    option forward      REJECT
    option flow_offloading 1

# WAN zone

config zone
    option name         wan
    list network        wan
    list network        wan6   # ← Include the WAN IPv6 interface
    option input        REJECT
    option output       ACCEPT
    option forward      REJECT
    option masq         1      # IPv4 NAT (not used for IPv6)

# LAN zone
config zone
    option name         lan
    list network        lan
    option input        ACCEPT
    option output       ACCEPT
    option forward      ACCEPT

# Allow LAN → WAN forwarding
config forwarding
    option src          lan
    option dest         wan

# Allow ICMPv6 on WAN (required!)
config rule
    option name         Allow-ICMPv6-Input
    option src          wan
    option proto        icmp
    option icmp_type    echo-request destination-unreachable packet-too-big \
                        time-exceeded bad-header unknown-option router-solicitation \
                        router-advertisement neighbour-solicitation neighbour-advertisement
    option target       ACCEPT
    option family       ipv6
```

## Allowing Inbound IPv6 for a Home Server

To allow HTTPS access to a home server from the internet:

```text
# In /etc/config/firewall, add:

config rule
    option name         Allow-HTTPS-HomeServer
    option src          wan
    option dest         lan
    option dest_ip      2001:db8:abcd::10    # Your server's IPv6 address
    option dest_port    443
    option proto        tcp
    option target       ACCEPT
    option family       ipv6
```

Apply changes:

```bash
/etc/init.d/firewall restart
```

## UFW (Uncomplicated Firewall) on Ubuntu/Raspberry Pi

If your home "router" is a Linux server running UFW:

```bash
# Enable UFW with IPv6 support
sed -i 's/IPV6=no/IPV6=yes/' /etc/default/ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (from local network only)
ufw allow from 2001:db8:abcd::/64 to any port 22

# Allow HTTPS inbound
ufw allow 443/tcp

# Allow ICMPv6 (must add manually)
# Edit /etc/ufw/before6.rules to ensure ICMPv6 is allowed

ufw enable
ufw status verbose
```

## Firewall Rules for Common Home Services

| Service | Port | Protocol | Direction |
|---------|------|---------|-----------|
| Web server (HTTPS) | 443 | TCP | WAN → LAN |
| SSH access | 22 | TCP | WAN → LAN (restrict source) |
| Home automation | 8123 | TCP | WAN → LAN |
| Plex Media | 32400 | TCP | WAN → LAN |
| NTP | 123 | UDP | Allow out |

## Verifying Firewall Rules

Test that your rules are working:

```bash
# From inside your network: check what ports are visible externally
# Use an external IPv6 port scanner service
# Or: nmap from an external IPv6-connected server

# Check firewall rule counters on OpenWRT
ip6tables -L -v -n --line-numbers | grep -v "0     0"

# Verify ICMPv6 is passing
ping6 -c 3 <your-device-IPv6-address-from-external-host>
```

## Blocking Specific Inbound Traffic

If you detect suspicious IPv6 sources:

```bash
# Block a specific IPv6 address
ip6tables -A INPUT -s 2001:db8:bad::1 -j DROP

# Block an entire prefix
ip6tables -A INPUT -s 2001:db8:bad::/48 -j DROP

# Make persistent on OpenWRT via /etc/firewall.user:
ip6tables -A INPUT -s 2001:db8:bad::/48 -j DROP
```

## Conclusion

IPv6 firewall configuration on home routers requires explicit rules since NAT is not in use. OpenWRT provides a clean zone-based firewall that handles IPv6 correctly when the `wan6` interface is included in the WAN zone. Always ensure ICMPv6 is allowed - blocking it breaks IPv6 operation. Add specific allow rules only for services you intentionally expose.
