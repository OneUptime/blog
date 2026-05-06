# How to Configure Forward and Reverse DNS Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, BIND, Forward Zone, Reverse Zone, PTR, Linux, Configuration

Description: Configure both forward (hostname to IP) and reverse (IP to hostname) DNS zones in BIND9 to enable PTR record lookups alongside standard A record resolution.

## Introduction

Forward DNS resolves names to IP addresses (A records). Reverse DNS resolves IP addresses to names (PTR records). Both are important: forward DNS for service discovery, reverse DNS for logging, email deliverability (many mail servers reject email from servers without matching PTR records), and security tools that verify host identities. This guide covers creating both zones in BIND9.

## Forward Zone Configuration

```bash
# Forward zone: example.com → 10.20.0.x

# /etc/bind/zones/db.example.com:

mkdir -p /etc/bind/zones

cat > /etc/bind/zones/db.example.com << 'EOF'
$TTL 3600

; SOA record:
@   IN  SOA ns1.example.com. admin.example.com. (
            2026032001  ; Serial
            3600        ; Refresh
            900         ; Retry
            604800      ; Expire
            300 )       ; Negative TTL

; Name Servers:
@   IN  NS  ns1.example.com.
@   IN  NS  ns2.example.com.

; A Records:
ns1     IN  A   10.20.0.1
ns2     IN  A   10.20.0.2
@       IN  A   10.20.0.10        ; example.com itself
www     IN  A   10.20.0.10
api     IN  A   10.20.0.11
db      IN  A   10.20.0.20
mail    IN  A   10.20.0.30

; MX Records:
@       IN  MX  10 mail.example.com.

; CNAME Records:
webmail IN  CNAME mail.example.com.
EOF
```

## Reverse Zone Configuration

```bash
# Reverse zone: 10.20.0.x → hostname
# For octet-aligned networks, the zone name is the network prefix reversed + .in-addr.arpa

# For 10.20.0.0/24 network:
# Zone name: 0.20.10.in-addr.arpa

cat > /etc/bind/zones/db.10.20.0 << 'EOF'
$TTL 3600

@   IN  SOA ns1.example.com. admin.example.com. (
            2026032001  ; Serial (same as forward zone)
            3600
            900
            604800
            300 )

@   IN  NS  ns1.example.com.
@   IN  NS  ns2.example.com.

; PTR Records (last octet only for /24):
1   IN  PTR ns1.example.com.
2   IN  PTR ns2.example.com.
10  IN  PTR example.com.
10  IN  PTR www.example.com.     ; Multiple PTR for same IP is valid
11  IN  PTR api.example.com.
20  IN  PTR db.example.com.
30  IN  PTR mail.example.com.
EOF
```

## Reverse Zone for Larger Subnets

```bash
# For /16 network (10.20.0.0/16):
# Zone name: 20.10.in-addr.arpa

cat > /etc/bind/zones/db.10.20 << 'EOF'
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (2026032001 3600 900 604800 300)
@   IN  NS  ns1.example.com.

; Last two octets in reverse order for /16:
1.0     IN  PTR ns1.example.com.
2.0     IN  PTR ns2.example.com.
10.0    IN  PTR www.example.com.
10.1    IN  PTR server-in-subnet1.example.com.
EOF

# For /8 network (10.0.0.0/8):
# Zone name: 10.in-addr.arpa
# Last three octets in reverse order:
# 20.0.1  IN  PTR host1.example.com.
```

## Register Zones in BIND

```bash
cat >> /etc/bind/named.conf.local << 'EOF'
// Forward zone:
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
};

// Reverse zone for 10.20.0.0/24:
zone "0.20.10.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.10.20.0";
};
EOF

# Verify zone file syntax:
named-checkzone example.com /etc/bind/zones/db.example.com
named-checkzone 0.20.10.in-addr.arpa /etc/bind/zones/db.10.20.0

# Reload BIND:
systemctl reload bind9
```

## Test Forward and Reverse

```bash
# Test forward lookup (hostname → IP):
dig @localhost www.example.com
dig @localhost api.example.com

# Test reverse lookup (IP → hostname):
dig @localhost -x 10.20.0.10
dig @localhost -x 10.20.0.11

# Verify matching (forward/reverse should agree):
# Forward: www.example.com → 10.20.0.10
# Reverse: 10.20.0.10 → www.example.com (or example.com)

# Batch check the sample PTR records:
for ip in 10.20.0.1 10.20.0.2 10.20.0.10 10.20.0.11 10.20.0.20 10.20.0.30; do
    echo -n "$ip: "
    dig @localhost -x "$ip" +short
done
```

## Delegated Reverse Zones

```bash
# If your IP range is delegated by your ISP:
# ISP must add NS records for your reverse zone in their reverse zone

# Check if your ISP has delegated your range:
dig NS 0.20.10.in-addr.arpa
# Should return your nameservers if delegation exists

# If not delegated: contact your ISP to add:
# 0.20.10.in-addr.arpa IN NS ns1.example.com.
# 0.20.10.in-addr.arpa IN NS ns2.example.com.

# For cloud providers:
# AWS: configure reverse DNS for an Elastic IP in Amazon EC2
# GCP: configure PTR records for a VM's external IP in Compute Engine
# Azure: configure reverse DNS on the Public IP resource; use Azure DNS for IP ranges assigned to your organization
```

## Conclusion

Forward and reverse DNS zones are configured separately but should be consistent - every PTR record should have a matching A record pointing back. Forward zones use standard hostnames as record names. Reverse zones use the reversed network prefix as the zone name, with individual PTR records using the remaining octets in reverse order. After configuration, test both directions with `dig` and `dig -x`. For public IP addresses, ensure your ISP has delegated the reverse zone to your nameservers before PTR records will work for external queries.
