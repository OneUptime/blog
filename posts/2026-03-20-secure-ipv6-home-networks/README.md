# How to Secure IPv6 on Home Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Home Network, Firewall, NDP, Privacy

Description: Secure your home IPv6 network by configuring firewalls, enabling privacy extensions, preventing rogue RAs, and hardening NDP.

## Why IPv6 Security Differs from IPv4

In many IPv4 home networks, NAT is paired with stateful filtering, so unsolicited inbound traffic is usually blocked even when users think of NAT as the protection. In IPv6, devices can receive globally routable addresses - making explicit firewall rules essential.

## 1. Enable IPv6 Firewall on Your Router

Most modern routers block all unsolicited inbound IPv6 connections by default. Verify this is active:

- **UniFi**: Settings → Security/Firewall → verify Internet/WAN In uses the default deny policy for IPv6 traffic you have not explicitly allowed
- **OpenWrt**: Network → Firewall → Zones → `wan` - verify `input` is `reject/drop`, `forward` is `reject/drop`, and IPv6 rules are not disabled
- **Asus**: Firewall → General → IPv6 Firewall: Enable

If your router doesn't have an explicit IPv6 firewall, apply it at the OS level on each device using nftables or ip6tables.

## 2. Apply nftables Firewall on Linux Devices

For individual Linux devices (servers, Raspberry Pi, etc.) on your network:

```bash
# /etc/nftables.conf - secure IPv6 for a home server

table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif "lo" accept

        # Allow established connections
        ct state established,related accept

        # Allow ICMPv6 (REQUIRED for IPv6 to function)
        meta l4proto ipv6-icmp accept

        # Allow SSH from local LAN only (replace with your LAN prefix)
        ip6 saddr 2001:db8:1234::/64 tcp dport 22 accept

        # Allow HTTPS from anywhere (if hosting a web server)
        tcp dport 443 accept

        # Log and drop everything else
        log prefix "IPv6-DROP: " drop
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }
}
```

Apply with: `nft -f /etc/nftables.conf`

## 3. Enable Privacy Extensions

Traditional SLAAC could generate IPv6 addresses from the device's MAC address, which can track your device across networks. Many current operating systems now use stable opaque interface IDs for the non-temporary address, but privacy extensions still add temporary random addresses for outbound connections:

**Linux:**
```bash
# Enable privacy extensions permanently

echo "net.ipv6.conf.all.use_tempaddr=2" >> /etc/sysctl.conf
echo "net.ipv6.conf.default.use_tempaddr=2" >> /etc/sysctl.conf
sysctl -p
```

**Windows:** Privacy extensions are enabled by default on current client releases; verify with `netsh interface ipv6 show privacy`.

**macOS:** Privacy extensions are enabled by default on current client releases; verify with `sysctl net.inet6.ip6.use_tempaddr`.

## 4. Prevent Rogue Router Advertisements

Malicious devices can send fake RAs to redirect IPv6 traffic. Ensure your router advertises only on trusted LAN interfaces, and use RA Guard on switches or Linux bridges to block RAs from non-router ports:

**OpenWrt - odhcpd only on trusted interfaces:**
```text
# /etc/config/dhcp
config dhcp 'lan'
    option interface 'lan'
    option ra 'server'
    option dhcpv6 'server'
    # Do not enable ra 'server' on untrusted interfaces
```

Apply RA Guard on managed switches (if available) or on Linux bridges:

```bash
# On Linux bridge: filter RAs from non-router sources
ebtables -A FORWARD -p IPv6 --ip6-proto ipv6-icmp \
  --ip6-icmp-type router-advertisement \
  -i eth1 -j DROP    # Block RAs from non-router port
```

## 5. Secure ICMPv6

ICMPv6 is essential for IPv6 operation, but only specific types need to be allowed. Do not block it wholesale; apply type-specific filters that keep required error, NDP, and multicast listener messages:

```bash
# Allow required ICMPv6 types, block others
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type time-exceeded -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type parameter-problem -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type echo-request -j ACCEPT    # Ping
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type echo-reply -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type router-solicitation -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type router-advertisement -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type neighbor-solicitation -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type neighbor-advertisement -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type mld-listener-query -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type mld-listener-report -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type mld-listener-done -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type 143 -j ACCEPT  # MLDv2 report
# Optional: allow redirects only if you trust local routers
# ip6tables -A INPUT -p ipv6-icmp --icmpv6-type redirect -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp -j DROP    # Block all other ICMPv6
```

## 6. Monitor IPv6 Connections

Use ss to monitor IPv6 sockets and neighbor state:

```bash
# List IPv6 TCP/UDP sockets
ss -6 -tuna

# Show IPv6 neighbor cache (who's on your network)
ip -6 neigh show

# Monitor in real-time
watch -n 5 "ip -6 neigh show | grep -v FAILED"
```

## Conclusion

Securing IPv6 on home networks requires explicit firewall rules (because NAT is not normally the security boundary), privacy extensions for address anonymization, and RA guard to prevent rogue advertisement attacks. Unlike many IPv4 home networks where NAT and stateful filtering are bundled together, IPv6 demands intentional, layered security at both the router and device level.
