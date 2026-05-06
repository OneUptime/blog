# How to Configure BGP Prefix Filtering for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Routing Security, Filtering, Network

Description: Configure BGP prefix filters for IPv6 to prevent accepting invalid or bogon prefixes and protect your routing infrastructure.

## Why Filter BGP Prefixes?

BGP prefix filtering prevents:
- Accepting default routes from peers unintentionally
- Accepting bogon prefixes (documentation, loopback, link-local ranges)
- Route leaks from customers or peers
- Accepting overly specific routes (/128 advertisements)

## IPv6 Bogon Prefix List

These common IPv6 ranges should not appear in Internet BGP:

```text
# IPv6 Bogon Prefixes (never accept from BGP peers)

::/128          # Unspecified address
::1/128         # Loopback
::ffff:0:0/96   # IPv4-mapped IPv6
100::/64        # Discard prefix (RFC 6666)
2001:2::/48     # BMWG benchmarking (RFC 5180)
2001:db8::/32   # Documentation (RFC 3849)
fc00::/7        # Unique local (RFC 4193)
fe80::/10       # Link-local
fec0::/10       # Deprecated site-local
ff00::/8        # Multicast
```

## BIRD2 Prefix Filtering

```javascript
# /etc/bird/bird.conf

# Define IPv6 bogon prefix list
define BOGON_PREFIXES_V6 = [
  ::/128,                # Unspecified
  ::1/128,               # Loopback
  ::ffff:0:0/96+,        # IPv4-mapped
  100::/64+,             # Discard-only
  2001:2::/48+,          # BMWG
  2001:db8::/32+,        # Documentation
  fc00::/7+,             # Unique local
  fe80::/10+,            # Link-local
  fec0::/10+,            # Deprecated site-local
  ff00::/8+              # Multicast
];

# Import filter for IPv6 BGP
filter ipv6_import_filter {
    # Reject default route unless explicitly expected
    if net.len = 0 then reject;

    # Reject bogon prefixes
    if net ~ BOGON_PREFIXES_V6 then reject;

    # Reject too-specific prefixes (longer than /48)
    if net.len > 48 then reject;

    accept;
}

protocol bgp upstream_v6 {
    local as 64496;
    neighbor 2001:db8::1 as 65001;
    ipv6 {
        import filter ipv6_import_filter;
        export filter { accept; };
    };
}
```

## FRRouting Prefix Lists

```text
# FRR configuration
! Reject default route unless explicitly expected
ipv6 prefix-list BOGON-V6 seq 5 deny ::/0
! Create IPv6 prefix-list with bogon ranges
ipv6 prefix-list BOGON-V6 seq 10 deny ::/128
ipv6 prefix-list BOGON-V6 seq 15 deny ::1/128
ipv6 prefix-list BOGON-V6 seq 20 deny ::ffff:0:0/96 le 128
ipv6 prefix-list BOGON-V6 seq 25 deny 100::/64 le 128
ipv6 prefix-list BOGON-V6 seq 30 deny 2001:2::/48 le 128
ipv6 prefix-list BOGON-V6 seq 35 deny 2001:db8::/32 le 128
ipv6 prefix-list BOGON-V6 seq 40 deny fc00::/7 le 128
ipv6 prefix-list BOGON-V6 seq 45 deny fe80::/10 le 128
ipv6 prefix-list BOGON-V6 seq 50 deny fec0::/10 le 128
ipv6 prefix-list BOGON-V6 seq 55 deny ff00::/8 le 128
! Deny overly specific routes
ipv6 prefix-list BOGON-V6 seq 60 deny ::/0 ge 49
! Permit everything else
ipv6 prefix-list BOGON-V6 seq 100 permit ::/0 le 48

! Apply to BGP neighbor
router bgp 64496
  neighbor 2001:db8::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8::1 activate
    neighbor 2001:db8::1 prefix-list BOGON-V6 in
  exit-address-family
```

## Cisco IOS Prefix Filtering

```text
! Define IPv6 prefix-list
ipv6 prefix-list IPV6-BOGONS seq 10 deny ::/0
ipv6 prefix-list IPV6-BOGONS seq 20 deny ::/128
ipv6 prefix-list IPV6-BOGONS seq 30 deny ::1/128
ipv6 prefix-list IPV6-BOGONS seq 40 deny ::ffff:0:0/96 le 128
ipv6 prefix-list IPV6-BOGONS seq 50 deny 100::/64 le 128
ipv6 prefix-list IPV6-BOGONS seq 60 deny 2001:2::/48 le 128
ipv6 prefix-list IPV6-BOGONS seq 70 deny 2001:db8::/32 le 128
ipv6 prefix-list IPV6-BOGONS seq 80 deny fc00::/7 le 128
ipv6 prefix-list IPV6-BOGONS seq 90 deny fe80::/10 le 128
ipv6 prefix-list IPV6-BOGONS seq 100 deny fec0::/10 le 128
ipv6 prefix-list IPV6-BOGONS seq 110 deny ff00::/8 le 128
! Reject too-specific routes
ipv6 prefix-list IPV6-BOGONS seq 120 deny ::/0 ge 49
! Permit everything else
ipv6 prefix-list IPV6-BOGONS seq 130 permit ::/0 le 48

! Apply to BGP neighbor
router bgp 64496
  neighbor 2001:db8::1 remote-as 65001
  address-family ipv6 unicast
    neighbor 2001:db8::1 activate
    neighbor 2001:db8::1 prefix-list IPV6-BOGONS in
  exit-address-family
```

## Using BGPq4 for Automated Filter Generation

BGPq4 generates prefix lists from IRR databases automatically:

```bash
# Install bgpq4
sudo apt-get install bgpq4

# Generate an IPv6 prefix-list for an AS-SET
bgpq4 -6 -l PEER-AS65001-IN AS-EXAMPLE

# Generate Cisco/FRR output with sequence numbers
bgpq4 -6 -s -l PEER-IN AS-EXAMPLE
```

## Monitoring

Use [OneUptime](https://oneuptime.com) with IP or SNMP monitors to watch BGP peer reachability and router-exposed metrics such as session state or accepted prefix counts. Sudden drops in accepted prefixes or unexpected new prefixes in your routing table can indicate filtering misconfiguration or a route leak event.

## Conclusion

BGP prefix filtering for IPv6 is essential for routing security. Combine static bogon prefix lists with maximum-length restrictions and use BGPq4 to automate filter generation from IRR data. Combine with RPKI origin validation for defense in depth.
