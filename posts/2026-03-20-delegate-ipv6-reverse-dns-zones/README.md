# How to Delegate IPv6 Reverse DNS Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Reverse DNS, Zone Delegation, Ip6.arpa

Description: Learn how to delegate IPv6 reverse DNS zones from a parent to a child DNS server, enabling organizations to manage their own PTR records.

## Why Delegate IPv6 Reverse DNS?

When an ISP assigns an IPv6 prefix to an organization, the ISP initially controls the reverse DNS for that prefix. Delegating the reverse DNS zone to the organization's DNS servers lets the organization manage their own PTR records without depending on the ISP for every change.

## How Reverse DNS Delegation Works

The parent zone (controlled by the ISP or RIR) adds NS records pointing to the organization's nameservers for the delegated sub-zone. Once delegated, the organization's nameservers are authoritative for all PTR records within that prefix.

## Example: ISP Delegating /48 to Organization

Suppose the ISP has `/32` zone `8.b.d.0.1.0.0.2.ip6.arpa` and wants to delegate `/48` prefix `2001:db8:cafe::/48` to the organization:

The organization's sub-zone is: `e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa`

### Step 1: ISP Adds NS Records in Parent Zone

In the ISP's zone file for `8.b.d.0.1.0.0.2.ip6.arpa`:

```dns
; ISP zone: 8.b.d.0.1.0.0.2.ip6.arpa
; Add delegation NS records for the organization's /48

; Delegate 2001:db8:cafe::/48 to the org's DNS servers
e.f.a.c    IN  NS  ns1.org.example.com.
e.f.a.c    IN  NS  ns2.org.example.com.

; Glue records if ns1/ns2 are in the delegated zone itself
; (usually not needed for reverse DNS)
```

### Step 2: Organization Creates the Child Zone

On the organization's DNS server (BIND):

```named
// /etc/named.conf
zone "e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa" IN {
    type master;
    file "/var/named/ipv6-reverse-cafe.zone";
    allow-transfer { ns2-ip-address; };
};
```

### Step 3: Organization Populates the Zone File

```dns
; /var/named/ipv6-reverse-cafe.zone
; Reverse zone for 2001:db8:cafe::/48

$TTL 3600
@ IN SOA ns1.org.example.com. admin.org.example.com. (
    2026032001  ; Serial
    3600        ; Refresh
    900         ; Retry
    604800      ; Expire
    300 )       ; Minimum TTL

@   IN  NS  ns1.org.example.com.
@   IN  NS  ns2.org.example.com.

; PTR records for hosts in 2001:db8:cafe::
; Relative names within the zone (relative to e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa)
; 2001:db8:cafe::1
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR server1.org.example.com.
; 2001:db8:cafe::2
2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR server2.org.example.com.
; 2001:db8:cafe:1::1 (subnet 1)
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0  IN PTR gw.subnet1.org.example.com.
```

## Verifying Delegation

```bash
# From the ISP side: verify NS records are in the parent zone

dig NS e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa @isp-nameserver

# Expected:
# e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa. 3600 IN NS ns1.org.example.com.
# e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa. 3600 IN NS ns2.org.example.com.

# Test reverse lookup end-to-end
dig -x 2001:db8:cafe::1 @8.8.8.8
# Expected: PTR server1.org.example.com.

# Test directly against the org's nameserver
dig -x 2001:db8:cafe::1 @ns1.org.example.com
```

## Delegating Smaller Zones (/64 or /56 within a /48)

An organization can further sub-delegate zones to departments or sites:

```dns
; Organization zone: e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa
; Delegate 2001:db8:cafe:1::/64 to department's DNS

; A /64 adds 4 nibbles (the subnet ID, reversed) on top of the /48 zone name
; 2001:db8:cafe:1::/64 → subnet ID 0001 → reversed nibbles: 1.0.0.0
1.0.0.0     IN  NS  dept-ns1.org.example.com.
1.0.0.0     IN  NS  dept-ns2.org.example.com.
```

## Requesting Delegation from Your ISP

Contact your ISP's IP address management (IPAM) or NOC team with:
1. Your IPv6 prefix (e.g., `2001:db8:cafe::/48`)
2. Your nameserver hostnames (ns1.example.com, ns2.example.com)
3. Your nameserver IPv4 and IPv6 addresses
4. Confirmation you have the zone configured and ready

Most ISPs provide a self-service portal or ticket system for this request.

## Summary

Delegating IPv6 reverse DNS requires the parent zone (ISP) to add NS records for the sub-zone (organization's prefix), while the organization creates and populates the corresponding `ip6.arpa` zone with PTR records. Once delegated, the organization controls all PTR records within their prefix. Always verify delegation with `dig -x` before announcing the change to stakeholders.
