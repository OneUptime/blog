# How to Check If Your ISP Provides IPv6 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, Testing, Connectivity, DHCPv6

Description: Verify whether your ISP delivers native IPv6, including how to test from your router and devices, interpret results, and escalate when IPv6 is missing.

## Quick Test

The fastest check is to visit an IPv6 test site or ping a well-known IPv6 address.

```bash
# Ping Cloudflare's IPv6 DNS resolver

ping -6 2606:4700:4700::1111

# Ping Google's IPv6 address
ping -6 2001:4860:4860::8888

# Use curl to force an IPv6 connection
curl -6 https://ipv6.google.com

# Check your public IPv6 address
curl -6 https://ifconfig.co
```

## Check Your Router's WAN IPv6

Log into your router's admin panel, or use CLI if your CPE runs Linux.

```bash
# On a Linux-based home router (OpenWrt, generic Linux CPE, etc.)

# See WAN interface IPv6 address
ip -6 addr show dev eth0.2 | grep "scope global"

# Check IPv6 default route
ip -6 route show default

# Check DHCPv6 client status and delegated prefix (dhcpcd example)
dhcpcd --version
journalctl -u dhcpcd | grep -Ei "ipv6|prefix|delegat|ia_pd" | tail -20

# Check Router Advertisements (RA)
radvdump 2>/dev/null | head -30
```

## Interpret Your IPv6 Address

Use the prefix to rule out special cases; it will not distinguish every native-vs-tunnel deployment on its own.

```bash
# Check address type
ip -6 addr show | grep "scope global"

# Address types:
# 2000::/3           - Global unicast. Native public IPv6 usually appears here,
#                      but some tunnels also use global unicast space.
# 2002:xxxx::/16     - 6to4 tunnel (legacy, often broken)
# 2001:0::/32        - Teredo tunnel (Windows legacy)
# fc00::/7           - ULA (not publicly routable, internal only)
# fe80::/10          - Link-local only (not enough for internet access by itself)
```

## Test with Online Tools

Multiple sites provide detailed IPv6 connectivity tests.

```bash
# Test with curl against test-ipv6.com's IP endpoint (strip the JSONP wrapper)
curl -fsSL "https://test-ipv6.com/ip/?callback=x" | sed 's/^x(//; s/)$//' | python3 -m json.tool

# Check that a hostname publishes an AAAA record
dig AAAA google.com +short

# Test if a public DNS server is reachable over IPv6
dig @2606:4700:4700::1111 AAAA cloudflare.com

# Check path MTU - some links mishandle larger IPv6 packets
ping -6 -s 1400 2001:4860:4860::8888
ping -6 -s 1452 2001:4860:4860::8888
```

## Check ISP IPv6 Support Proactively

Before signing up or calling support, verify ISP readiness.

```bash
# Check if ISP's ASN originates IPv6 routes in BGP (RIPEstat RIS prefixes)
# Replace 12345 with ISP's ASN
curl -fsSL "https://stat.ripe.net/data/ris-prefixes/data.json?resource=AS12345&list_prefixes=true&af=v6&types=o" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); \
    print('IPv6 prefixes:', len(d['data']['prefixes'].get('v6', {}).get('originating', [])))"

# Check if ISP's main site has AAAA record
dig AAAA isp-domain.com +short

# Check via WHOIS if ISP holds IPv6 allocation
# Substitute a real IPv6 address or prefix from the ISP, and use the appropriate RIR server if needed
whois -h whois.arin.net "n 2001:db8::"
```

## What To Do If ISP Doesn't Provide IPv6

Options when your ISP offers no native IPv6.

```bash
# Option 1: Hurricane Electric free IPv6 tunnel broker
# Register at https://tunnelbroker.net
# Configure 6in4 tunnel on Linux:

ip tunnel add he-ipv6 mode sit remote <HE_SERVER_IPV4> local <YOUR_IPV4_IP> ttl 255
ip link set he-ipv6 up
ip addr add <YOUR_HE_IPV6>/64 dev he-ipv6
ip -6 route add ::/0 via <HE_SERVER_IPV6> dev he-ipv6
ip -6 addr show he-ipv6

# Option 2: Use OpenWrt with 6in4 package
# opkg install 6in4
# Configure via /etc/config/network

# Option 3: Wireguard VPN to an IPv6-enabled VPS
# Your VPS acts as IPv6 relay
```

## Conclusion

To verify ISP IPv6 support: ping a public IPv6 address, check your router's WAN interface for a global IPv6 address (not fe80:: or fc00::), and, if you are using a router for downstream networks, confirm that it also received a delegated prefix via DHCPv6-PD. If your ISP does not provide native IPv6, use a Hurricane Electric tunnel as a free interim solution. Many major ISPs now support IPv6; if yours does not, contact support and ask whether native IPv6 is available for your plan or equipment.
