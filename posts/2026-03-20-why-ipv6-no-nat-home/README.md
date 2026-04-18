# Why IPv6 Doesn't Need NAT at Home

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT, Home Network, Firewall, Security

Description: Explain why IPv6 was designed without NAT, how global address availability eliminates the need for network address translation, and why a stateful firewall provides equivalent security.

## The NAT Problem IPv6 Solves

```text
IPv4 exhaustion → NAT invented as a workaround
  192.168.x.x → NAT → One public IPv4 address

IPv6: 340 undecillion addresses
  Each home gets: /56 = 256 unique /64 networks
  Each /64 = 18 quintillion addresses
  → No address scarcity → No need for NAT
```

## How IPv4 NAT Works

NAT translates private addresses to a shared public IP - a workaround, not a feature.

```text
Home device: 192.168.1.10:12345
     |
     v
Router NAT translates → 203.0.113.1:54321
     |
     v
Internet server sees: 203.0.113.1 (not the device)

Problems:
- Breaks end-to-end connectivity
- Complicates VoIP, gaming, P2P
- Requires port forwarding for servers
- Creates single point of failure
- Makes network debugging harder
```

## IPv6 End-to-End Connectivity

With IPv6, every device has a globally unique, routable address.

```bash
# IPv6 home device gets a real, globally routable address

ip -6 addr show | grep "scope global"
# 2001:db8:home:1:abc:def:123:456/64

# This address is DIRECTLY reachable from the internet
# No NAT translation needed

# Device can receive inbound connections without port forwarding
# (if firewall allows it)

# Example: host a website from home PC
python3 -m http.server --bind 2001:db8:home:1:abc:def:123:456 8080
# Accessible worldwide via: http://[2001:db8:home:1:abc:def:123:456]:8080

# No port forwarding needed - firewall rule is sufficient
```

## NAT Security Was a Side Effect, Not a Feature

NAT was designed for address conservation, not security. Firewalls provide actual security.

```bash
# NAT "security":
# - Hides internal addresses (obscurity)
# - Blocks unsolicited inbound by necessity
# - Does NOT inspect traffic content
# - Does NOT prevent outbound attacks
# - Does NOT block malware calling home

# Stateful IPv6 firewall provides REAL security:
# nftables on home router

table inet firewall {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow established connections (stateful - same as NAT behavior)
        ct state established,related accept

        # Allow ALL outbound from LAN (same as NAT)
        iif "br-lan" oif "eth0" accept

        # Block ALL new inbound from internet (same as NAT behavior)
        iif "eth0" oif "br-lan" ct state new drop

        # Allow ICMPv6 (required)
        ip6 nexthdr icmpv6 accept
    }
}

# This provides IDENTICAL protection to NAT
# PLUS end-to-end connectivity for outbound sessions
```

## Selectively Allow Inbound (No Port Forwarding)

With IPv6, you use firewall rules instead of port forwarding.

```bash
# IPv4 NAT: port forward 8080 → 192.168.1.10:80
# IPv6: firewall allow inbound to device's IPv6 address

# Allow inbound HTTP to home server (IPv6)
nft add rule inet firewall forward \
    iif eth0 ip6 daddr 2001:db8:home:1::server \
    tcp dport 80 ct state new accept

# Allow inbound SSH to specific device
nft add rule inet firewall forward \
    iif eth0 ip6 daddr 2001:db8:home:1::laptop \
    tcp dport 22 ct state new accept

# Multiple services - same device, no NAT confusion
# (NAT could only forward one port to one device)
nft add rule inet firewall forward \
    iif eth0 ip6 daddr 2001:db8:home:1::media-server \
    tcp dport {80,443,8096} ct state new accept
```

## IPv6 ULA: NAT-like Privacy When Desired

If you want internal addresses not routable on the internet, use ULA.

```bash
# ULA (Unique Local Addresses): fc00::/7
# Routable within your network, not on internet (like RFC1918)
# Used when you want NAT-like privacy

# Generate a random ULA prefix
python3 -c "
import random, struct
# Random 40-bit Global ID (RFC 4193)
gid = random.getrandbits(40)
print('fd{:02x}:{:04x}:{:04x}::/48'.format(
    (gid >> 32) & 0xff,
    (gid >> 16) & 0xffff,
    gid & 0xffff
))
"

# Configure ULA prefix on router (distributed alongside global)
# /etc/config/network (OpenWrt)
config globals 'globals'
    option ula_prefix 'fdXX:XXXX:XXXX::/48'

config interface 'lan'
    option ip6assign '64'
    option ip6ifaceid '::1'

# ULA gives privacy + a stateful firewall gives security
# Best of both worlds - no NAT needed
```

## Conclusion

IPv6 was designed without NAT because the enormous address space (a /56 per home provides 256 networks with 18 quintillion addresses each) eliminates the scarcity that made NAT necessary in IPv4. The security benefit attributed to NAT was always a side effect of connection tracking, not address translation itself - a stateful IPv6 firewall with a default-drop forward policy provides identical protection. End-to-end connectivity is restored with IPv6: VoIP, gaming, P2P, and hosting services from home all work without port forwarding. Add explicit firewall rules to allow specific inbound services. Use ULA addresses (fd00::/8) if you want non-routable internal addresses alongside your global IPv6 prefix.
