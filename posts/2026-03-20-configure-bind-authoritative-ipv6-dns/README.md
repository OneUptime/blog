# How to Configure BIND as an Authoritative IPv6 DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BIND, DNS, IPv6, AAAA, Authoritative, Named, RFC 3596

Description: Configure BIND9 as an authoritative DNS server that serves AAAA records over IPv6 transport, including zone configuration, listen-on-v6, and ACLs.

## Introduction

BIND9 (Berkeley Internet Name Domain) is the most widely deployed authoritative DNS server. Configuring it for IPv6 involves enabling IPv6 transport, adding AAAA records to zones, and ensuring ACLs permit IPv6 clients.

## Installation

```bash
# Ubuntu/Debian

apt-get install -y bind9 bind9utils

# RHEL/CentOS
dnf install -y bind bind-utils

# Verify version
named -v
# Output varies by distribution release
```

The configuration examples below use Debian/Ubuntu file paths. On RHEL/CentOS, place the same directives in `/etc/named.conf`, store zone files under `/var/named/`, and use the `named` service name.

## Step 1: Configure named.conf for IPv6

```nginx
# /etc/bind/named.conf.options

options {
    directory "/var/cache/bind";

    # Listen on all IPv6 addresses (and IPv4)
    listen-on-v6 { any; };
    listen-on    { any; };

    # Or listen on specific IPv6 addresses only
    # listen-on-v6 { 2001:db8::53; };

    # Allow queries from IPv6 and IPv4
    allow-query { any; };

    # Recursion disabled for authoritative-only server
    recursion no;

    # Notify secondaries on zone changes
    notify yes;

    # EDNS buffer size
    edns-udp-size 4096;
};
```

## Step 2: Define a Zone with AAAA Records

```nginx
# /etc/bind/named.conf.local

zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-transfer { "secondary-v6"; };  # IPv6 secondary
};
```

```dns-zone
; /etc/bind/zones/db.example.com
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
            2026031901  ; Serial
            3600        ; Refresh
            900         ; Retry
            604800      ; Expire
            300 )       ; Minimum TTL

; Name servers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; IPv4 and IPv6 for nameservers
ns1     IN  A       203.0.113.1
ns1     IN  AAAA    2001:db8::1

ns2     IN  A       203.0.113.2
ns2     IN  AAAA    2001:db8::2

; Apex records
@       IN  A       203.0.113.10
@       IN  AAAA    2001:db8::10

; Subdomain AAAA records
www     IN  A       203.0.113.10
www     IN  AAAA    2001:db8::10

mail    IN  A       203.0.113.20
mail    IN  AAAA    2001:db8::20

; MX pointing to dual-stack host
@       IN  MX 10  mail.example.com.
```

## Step 3: Reverse Zone for IPv6

```nginx
# /etc/bind/named.conf.local
# Reverse zone for 2001:db8::/64

zone "0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/etc/bind/zones/db.2001.db8.rev";
};
```

```dns-zone
; /etc/bind/zones/db.2001.db8.rev
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
            2026031901 3600 900 604800 300 )

@   IN  NS  ns1.example.com.
@   IN  NS  ns2.example.com.

; PTR records within 2001:db8::/64
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR ns1.example.com.
2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR ns2.example.com.
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR www.example.com.
0.2.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN PTR mail.example.com.
```

## Step 4: ACL for an IPv6 Secondary

```nginx
# /etc/bind/named.conf.local or another included file
# Define this above any zone blocks that reference "secondary-v6".

acl "secondary-v6" {
    2001:db8:1::53;
};
```

## Step 5: Validate and Reload

```bash
# Check configuration syntax
named-checkconf /etc/bind/named.conf

# Check zone files
named-checkzone example.com /etc/bind/zones/db.example.com
named-checkzone 0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa \
    /etc/bind/zones/db.2001.db8.rev

# Reload BIND
systemctl reload bind9   # Debian/Ubuntu
systemctl reload named   # RHEL/CentOS

# Test AAAA resolution over IPv6 transport
dig -6 @2001:db8::1 www.example.com AAAA
dig @2001:db8::1 www.example.com AAAA

# Test PTR
dig @2001:db8::1 -x 2001:db8::10
```

## Firewall Rules

```bash
# Allow authoritative DNS over IPv6
ip6tables -A INPUT -p udp --dport 53 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Restrict zone transfers in BIND with allow-transfer; AXFR/IXFR use TCP/53,
# but regular DNS responses may also need TCP/53.
```

## Conclusion

BIND9 authoritative server for IPv6 requires IPv6 listeners, AAAA records in forward zones, and ip6.arpa reverse zones. Use `named-checkconf` and `named-checkzone` before every reload. Monitor BIND with OneUptime to alert on zone transfer failures and query latency spikes.
