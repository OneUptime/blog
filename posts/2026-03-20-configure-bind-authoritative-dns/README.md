# How to Configure BIND as an Authoritative DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, BIND, Authoritative, Linux, Server, Configuration

Description: Configure BIND9 as an authoritative DNS server for a domain, including zone file setup, SOA records, forward and reverse zones, and security best practices.

## Introduction

BIND9 (Berkeley Internet Name Domain) is the most widely deployed DNS server. As an authoritative server, it holds the definitive records for a domain - other resolvers query it for the ground truth. This guide covers setting up BIND9 for a domain, creating zone files, configuring SOA and NS records, and restricting BIND to authoritative-only mode (not recursive). The examples below use Debian/Ubuntu file paths and service names; on RHEL/CentOS, apply the same settings in `/etc/named.conf` and typically store zone files under `/var/named/`.

## Installation

```bash
# Ubuntu/Debian:

apt-get install bind9 bind9-utils bind9-doc bind9-dnsutils -y

# CentOS/RHEL:
dnf install bind bind-utils -y

# Check version:
named -v
```

## Main Configuration

```bash
# Debian/Ubuntu example: /etc/bind/named.conf.options
# On RHEL/CentOS, make the equivalent changes in /etc/named.conf.
cat > /etc/bind/named.conf.options << 'EOF'
options {
    directory "/var/cache/bind";  # RHEL/CentOS commonly use "/var/named"

    # Listen on specific IP or all:
    listen-on { any; };
    listen-on-v6 { none; };  # Disable IPv6 if not needed

    # Authoritative-only: disable recursion for external clients
    recursion no;
    allow-recursion { none; };

    # Only allow queries (not recursive) from anyone:
    allow-query { any; };

    # Prevent zone transfers to unauthorized servers:
    allow-transfer { none; };

    # Hide BIND version:
    version "not available";

    # Authoritative-only servers do not need resolver DNSSEC validation:
    dnssec-validation no;
};
EOF
```

## Create Zone Files

```bash
# Debian/Ubuntu example: /etc/bind/named.conf.local
# On RHEL/CentOS, declare the same zones in /etc/named.conf or an included file.
cat > /etc/bind/named.conf.local << 'EOF'
// Forward zone (domain → IP):
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";  # RHEL/CentOS: /var/named/db.example.com
    allow-transfer { 10.20.0.2; };  # Secondary nameserver
    notify yes;
};

// Reverse zone (IP → domain):
zone "0.20.10.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.10.20.0";     # RHEL/CentOS: /var/named/db.10.20.0
    allow-transfer { 10.20.0.2; };
    notify yes;
};
EOF
```

## Zone File - Forward Zone

```bash
# Debian/Ubuntu example path:
# On RHEL/CentOS, use /var/named instead.
mkdir -p /etc/bind/zones

cat > /etc/bind/zones/db.example.com << 'EOF'
; example.com forward zone
$TTL 3600    ; Default TTL: 1 hour

; SOA Record - Start of Authority
@   IN  SOA  ns1.example.com. admin.example.com. (
            2026032001  ; Serial (YYYYMMDDnn format)
            3600        ; Refresh: secondary checks for updates every hour
            900         ; Retry: if refresh fails, retry after 15 min
            604800      ; Expire: secondary stops answering after 7 days if no update
            300         ; Negative TTL: cache NXDOMAIN for 5 minutes
            )

; Nameservers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; A records
@       IN  A   93.184.216.34       ; example.com → IP
ns1     IN  A   10.20.0.1           ; Primary nameserver
ns2     IN  A   10.20.0.2           ; Secondary nameserver
www     IN  A   93.184.216.34       ; www.example.com
api     IN  A   93.184.216.35       ; api.example.com
mail    IN  A   93.184.216.36       ; mail.example.com

; CNAME records
ftp     IN  CNAME   www.example.com.

; MX records (mail exchangers)
@       IN  MX  10  mail.example.com.

; TXT records
@       IN  TXT  "v=spf1 a mx ip4:93.184.216.36 ~all"
EOF
```

## Zone File - Reverse Zone

```bash
cat > /etc/bind/zones/db.10.20.0 << 'EOF'
; 10.20.0.x reverse zone
$TTL 3600

@   IN  SOA  ns1.example.com. admin.example.com. (
            2026032001
            3600
            900
            604800
            300
            )

@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; PTR records (last octet only)
1       IN  PTR ns1.example.com.
2       IN  PTR ns2.example.com.
EOF
```

## Verify and Start

```bash
# Check configuration syntax:
named-checkconf

# Check zone file syntax:
named-checkzone example.com /etc/bind/zones/db.example.com
named-checkzone 0.20.10.in-addr.arpa /etc/bind/zones/db.10.20.0

# Set correct permissions (Debian/Ubuntu):
chown -R bind:bind /etc/bind/zones
# On RHEL/CentOS, use: chown -R named:named /var/named

# Start/restart BIND (Debian/Ubuntu):
systemctl restart bind9
systemctl enable bind9
# On RHEL/CentOS:
# systemctl restart named
# systemctl enable named

# Test queries against your server:
dig @localhost example.com A
dig @localhost www.example.com
dig @localhost -x 10.20.0.1  # Reverse lookup

# Check BIND logs for errors (Debian/Ubuntu):
journalctl -u bind9 --since "5 minutes ago"
# On RHEL/CentOS: journalctl -u named --since "5 minutes ago"
```

## Conclusion

On Debian/Ubuntu, BIND9 authoritative configuration requires three parts: `named.conf.options` (global settings), `named.conf.local` (zone declarations), and zone files with SOA, NS, and resource records. On RHEL/CentOS, make the equivalent changes in `/etc/named.conf` or included files and store the zone files under `/var/named/`. Always validate configuration with `named-checkconf` and `named-checkzone` before restarting. For an authoritative-only server, disable recursion and resolver DNSSEC validation so the server does not behave like a public recursive resolver or perform unnecessary trust-anchor maintenance. Increment the SOA serial number (format YYYYMMDDNN) every time you change a zone file so secondary servers pick up the update.
