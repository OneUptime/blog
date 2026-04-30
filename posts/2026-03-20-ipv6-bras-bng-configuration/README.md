# How to Configure IPv6 for BRAS/BNG Equipment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, BRAS, BNG, ISP, PPPoE, DHCPv6-PD, Broadband

Description: Configure IPv6 on Broadband Remote Access Server (BRAS) and Broadband Network Gateway (BNG) equipment for ISP subscriber management.

## What is a BRAS/BNG?

A BRAS (Broadband Remote Access Server) or BNG (Broadband Network Gateway) is the ISP equipment that terminates subscriber connections (PPPoE, IPoE) and applies per-subscriber policies including IPv6 prefix delegation.

## IPv6 Feature Requirements on BNG

A BNG must support:
- DHCPv6 server or relay (for prefix delegation)
- PPPoE / IPoE session termination for IPv6 services
- Per-subscriber IPv6 ACLs and QoS
- RADIUS integration for IPv6 attributes
- IPv6 route injection into the core routing table

## Cisco ASR 1000 BNG Configuration

Configure IPv6 subscriber sessions on a Cisco ASR 1000:

```text
! Loopback used as the unnumbered source for PPPoE IPv6 sessions
interface Loopback1
 ipv6 address 2001:db8:2::1/40

! IPv6 delegated-prefix pool for subscribers
ipv6 local pool SUBSCRIBER-POOL 2001:db8:1200::/40 56

! DHCPv6 pool for prefix delegation
ipv6 dhcp pool DHCPV6-PD
 prefix-delegation pool SUBSCRIBER-POOL

! BBA group for PPPoE sessions
bba-group pppoe RESIDENTIAL
 virtual-template 1

! Virtual template with IPv6
interface Virtual-Template1
 ipv6 unnumbered Loopback1
 ipv6 dhcp server DHCPV6-PD
 ppp authentication chap

! RADIUS server for subscriber authentication
radius server AUTH1
 address ipv6 2001:db8::10 auth-port 1812 acct-port 1813
 key my-radius-secret
```

## Juniper MX BNG Configuration

On Juniper MX with Enhanced Subscriber Management:

```text
# IPv6 delegated-prefix pool
set access address-assignment pool RESIDENTIAL-POOL family inet6 prefix 2001:db8:1200::/40
set access address-assignment pool RESIDENTIAL-POOL family inet6 range PD-RANGE prefix-length 56

# DHCPv6 local server for PPPoE subscribers
set system services dhcp-local-server dhcpv6 group RESIDENTIAL interface pp0.0
set system services dhcp-local-server dhcpv6 group RESIDENTIAL overrides delegated-pool RESIDENTIAL-POOL

# PPPoE dynamic profile with IPv6 enabled
set dynamic-profiles SUBSCRIBER-PROFILE interfaces pp0 unit "$junos-interface-unit" pppoe-options underlying-interface $junos-underlying-interface
set dynamic-profiles SUBSCRIBER-PROFILE interfaces pp0 unit "$junos-interface-unit" pppoe-options server
set dynamic-profiles SUBSCRIBER-PROFILE interfaces pp0 unit "$junos-interface-unit" ppp-options chap
set dynamic-profiles SUBSCRIBER-PROFILE interfaces pp0 unit "$junos-interface-unit" family inet6 unnumbered-address lo0.0
```

## RADIUS Attributes for IPv6 Delegation

The BNG communicates with RADIUS to get per-subscriber IPv6 prefix assignments:

```text
# FreeRADIUS - return IPv6 prefix for subscriber
user@isp.com Cleartext-Password := "test123"
    Delegated-IPv6-Prefix = "2001:db8:1200:1a2b::/56",
    Framed-IPv6-Route = "2001:db8:1200:1a2b::/56 :: 1",
    Delegated-IPv6-Prefix-Pool = "RESIDENTIAL-POOL"
```

Key RADIUS attributes for IPv6:
- `Framed-IPv6-Address` (Attr 168): Static /128 for subscriber's WAN link
- `Delegated-IPv6-Prefix` (Attr 123): Prefix to delegate to CPE
- `Delegated-IPv6-Prefix-Pool` (Attr 171): Named pool for DHCPv6 prefix delegation
- `Framed-IPv6-Route` (Attr 99): Static route to inject for subscriber

## Subscriber Route Injection

When a subscriber comes online, the BNG injects a route for the delegated prefix into the routing table:

```text
! Cisco IOS - verify subscriber routes
show ipv6 route 2001:db8:1200:1a2b::/56

! Expected output:
! IPv6 Routing Table - default
! U   2001:db8:1200:1a2b::/56 [0/0]
!      via Virtual-Access1
```

## Monitoring Active Sessions

```bash
# Cisco: show active IPv6 subscriber sessions
show subscriber session detailed | include IPv6

# Juniper: show DHCP client bindings
show dhcpv6 server binding detail
```

## Conclusion

BNG IPv6 configuration involves setting up DHCPv6 prefix delegation pools, integrating with RADIUS for per-subscriber prefix assignment, and ensuring routes are properly injected for delegated prefixes. Both Cisco ASR and Juniper MX support these features natively in their broadband subscriber management modules.
