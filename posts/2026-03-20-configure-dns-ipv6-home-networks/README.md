# How to Configure DNS for IPv6 on Home Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, AAAA, RDNSS, Home Network, Pi-hole

Description: Configure DNS for IPv6 on home networks including RDNSS/DHCPv6 DNS delivery, Pi-hole with IPv6, and local DNS for IPv6 hosts.

## DNS and IPv6: What's Different?

IPv6 addresses use `AAAA` (quad-A) DNS records instead of IPv4 `A` records. The DNS resolution process is the same, but if you want clients to reach the DNS server over IPv6, that server needs an IPv6 address.

## DNS Delivery Methods in IPv6

There are two ways your home devices learn the DNS server address:

1. **RDNSS (RFC 8106)**: DNS server included in Router Advertisement messages
2. **DHCPv6**: DNS server delivered via DHCPv6 options, commonly in stateless mode on home networks (M=0, O=1)

Client support varies. RDNSS is especially important for clients that do not use DHCPv6 for DNS, so configuring both is a good compatibility choice.

## Configuring RDNSS on Your Router

RDNSS embeds DNS server addresses in RA messages. Configure this on your router:

**OpenWrt example:**
```text
# /etc/config/dhcp

config dhcp 'lan'
    option interface 'lan'
    option ra 'server'
    option dhcpv6 'server'
    list ra_flags 'other-config'
    list dns '2001:4860:4860::8888'
    list dns '2606:4700:4700::1111'
```

## IPv6 Public DNS Servers

Use well-known IPv6-capable public DNS:

| Provider | IPv6 Addresses |
|---------|---------------|
| Google | `2001:4860:4860::8888`, `2001:4860:4860::8844` |
| Cloudflare | `2606:4700:4700::1111`, `2606:4700:4700::1001` |
| Quad9 | `2620:fe::fe`, `2620:fe::9` |
| OpenDNS | `2620:119:35::35`, `2620:119:53::53` |

## Setting Up Pi-hole for IPv6 DNS Filtering

Pi-hole can serve as a local DNS resolver with IPv6 support:

```bash
# Install Pi-hole (follow official installer)
curl -sSL https://install.pi-hole.net | bash

# During installation, select at least one IPv6-capable upstream DNS server
# Example upstream DNS: 2001:4860:4860::8888

# Give the Pi-hole host a stable IPv6 address on your LAN
# Example: 2001:db8::2

# Restart Pi-hole's DNS service after config changes
sudo systemctl restart pihole-FTL.service
```

Configure your router to advertise the Pi-hole as the DNS server:

```text
# In router RDNSS/DHCPv6 config, advertise the Pi-hole:
list dns '2001:db8::2'   # Pi-hole's IPv6 address
```

## Local DNS for Home IPv6 Hosts

For resolving local hostnames over IPv6, use a simple DNS server like `dnsmasq`:

```text
# /etc/dnsmasq.conf

# Listen on IPv6
listen-address=::1
listen-address=2001:db8::1

# IPv6 AAAA records for local hosts
host-record=server.home.lan,2001:db8::10
host-record=nas.home.lan,2001:db8::20
host-record=pi.home.lan,2001:db8::30

# host-record also creates matching PTR records for reverse lookups
```

## Testing DNS Over IPv6

Verify DNS resolution is using IPv6:

```bash
# Check if DNS queries are sent over IPv6
dig -6 AAAA google.com @2001:4860:4860::8888

# Verify local hostname resolves correctly
dig AAAA server.home.lan @2001:db8::1

# Check which DNS server your device is using
# Linux:
resolvectl status | grep "DNS Servers"
# Mac:
scutil --dns | grep nameserver
```

## DNSSEC for IPv6 DNS

Enable DNSSEC validation for added security. Pi-hole supports this out of the box:

1. Pi-hole admin panel → Settings → DNS
2. Check "Use DNSSEC"

Or configure in Unbound (a more advanced DNS resolver):

```text
# /etc/unbound/unbound.conf
server:
    interface: 0.0.0.0
    interface: ::0
    do-ip6: yes
    do-ip4: yes
    val-permissive-mode: no
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
```

## Conclusion

Configuring DNS for IPv6 home networks involves delivering DNS server addresses via RDNSS and/or DHCPv6, choosing IPv6-capable DNS resolvers, and optionally deploying Pi-hole for local filtering and DNSSEC validation. Local hostnames with AAAA records enable internal IPv6 access by name for home lab servers and devices.
