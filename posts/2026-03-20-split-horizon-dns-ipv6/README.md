# How to Configure Split-Horizon DNS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Split-Horizon DNS, IPv6, BIND, Unbound, Internal DNS, View

Description: Configure split-horizon DNS to return different AAAA records for internal and external clients, using BIND views or Unbound stub/forward zones.

## Introduction

Split-horizon (split-view) DNS returns different answers for the same domain based on the requester's network. Internal IPv6 clients receive private AAAA addresses, while external clients get public AAAA addresses. This is essential for services that have both internal and external IPv6 addresses.

## Architecture

```text
Internal IPv6 client (2001:db8:1::/48)
    → DNS query: www.example.com AAAA
    → Split-horizon DNS
    → Returns: fd12:3456:789a::10 (private ULA address)

External client
    → DNS query: www.example.com AAAA
    → Split-horizon DNS
    → Returns: 2001:db8::10 (example public-facing IPv6 address)
```

## Option 1: BIND Views

```text
# /etc/bind/named.conf

acl "internal-v6" {
    2001:db8:1::/48;
    fd12:3456:789a::/48;
    ::1;
    127.0.0.0/8;
    192.168.0.0/16;
};

view "internal" {
    match-clients { "internal-v6"; };

    zone "example.com" {
        type primary;
        file "/etc/bind/zones/internal/db.example.com";
    };

    # Recursion for internal clients
    recursion yes;
    allow-query { "internal-v6"; };
    allow-recursion { "internal-v6"; };
    allow-query-cache { "internal-v6"; };
};

view "external" {
    match-clients { any; };

    zone "example.com" {
        type primary;
        file "/etc/bind/zones/external/db.example.com";
    };

    recursion no;
    allow-query { any; };
};
```

```dns-zone
; /etc/bind/zones/internal/db.example.com
$TTL 300
@       IN  SOA     ns1.example.com. hostmaster.example.com. (
                    2026032001 ; serial
                    3600       ; refresh
                    900        ; retry
                    604800     ; expire
                    300        ; minimum
)
@       IN  NS      ns1.example.com.
ns1     IN  AAAA    fd12:3456:789a::53
www     IN  AAAA    fd12:3456:789a::10       ; Private ULA address
api     IN  AAAA    fd12:3456:789a::11
db      IN  AAAA    fd12:3456:789a::12
```

```dns-zone
; /etc/bind/zones/external/db.example.com
$TTL 300
@       IN  SOA     ns1.example.com. hostmaster.example.com. (
                    2026032001 ; serial
                    3600       ; refresh
                    900        ; retry
                    604800     ; expire
                    300        ; minimum
)
@       IN  NS      ns1.example.com.
ns1     IN  AAAA    2001:db8::53   ; Example public-facing IPv6 address
www     IN  AAAA    2001:db8::10   ; Example public-facing IPv6 address
; api and db are not exposed externally
```

## Option 2: Unbound with Views

```text
# /etc/unbound/unbound.conf

server:
    interface: ::0
    access-control: 2001:db8:1::/48 allow
    access-control: fd12:3456:789a::/48 allow
    access-control: 2001:db8:2::/48 allow
    access-control: ::1 allow
    prefer-ip6: yes
    access-control-view: 2001:db8:1::/48 internal
    access-control-view: fd12:3456:789a::/48 internal
    access-control-view: ::1 internal
    access-control-view: 2001:db8:2::/48 external

view:
    name: "internal"
    local-zone: "example.com." transparent
    local-data: "www.example.com. 300 IN AAAA fd12:3456:789a::10"
    local-data: "api.example.com. 300 IN AAAA fd12:3456:789a::11"
    local-data: "db.example.com. 300 IN AAAA fd12:3456:789a::12"

view:
    name: "external"
    local-zone: "example.com." transparent
    local-data: "www.example.com. 300 IN AAAA 2001:db8::10"

# api and db are not exposed externally; other names use normal recursive resolution.
```

## Option 3: CoreDNS with View Plugin

```corefile
# /etc/coredns/Corefile

example.com.:53 {
    view internal {
        expr incidr(client_ip(), '2001:db8:1::/48') || incidr(client_ip(), 'fd12:3456:789a::/48')
    }
    file /etc/coredns/zones/example.com.internal
    log
}

example.com.:53 {
    file /etc/coredns/zones/example.com.external
    log
}
```

## Testing Split-Horizon

```bash
# Test from internal IPv6 address
dig AAAA www.example.com @2001:db8::53 \
    -b 2001:db8:1::1
# Expected: fd12:3456:789a::10

# Test from external
dig AAAA www.example.com @2001:db8::53 \
    -b 2001:db8:2::1
# Expected: 2001:db8::10

# Test from loopback
dig AAAA www.example.com @::1
# Expected: fd12:3456:789a::10 (loopback is internal)
```

## Split Horizon for Kubernetes Services

```yaml
# CoreDNS ConfigMap for Kubernetes split-horizon
# Internal: resolve app names under example.com to cluster-internal IPv6 addresses
# External: resolve app names under example.com to LoadBalancer IPv6 addresses

# coredns ConfigMap
data:
  Corefile: |
    example.com:53 {
        view k8s-internal {
            expr incidr(client_ip(), 'fd12:3456:789a::/48')
        }
        # Serve from cluster-internal zone file
        file /etc/coredns/internal-zones/example.com
    }
    example.com:53 {
        forward . [2606:4700:4700::1111]:53
    }
```

## Conclusion

Split-horizon DNS with IPv6 uses the same mechanisms as IPv4: BIND views match on IPv6 ACLs, Unbound maps clients to views, and CoreDNS uses the view plugin. The key difference is using IPv6 prefixes (your assigned ULA /48, specific global prefixes for internal clients, and public-facing global prefixes for external answers) in ACL definitions. Use OneUptime to verify that internal and external DNS return the expected AAAA addresses.
