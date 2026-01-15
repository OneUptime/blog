# How to Configure BIND for IPv6 DNS (AAAA Records)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, BIND, DNS, Linux, Networking, Infrastructure

Description: Learn how to configure BIND DNS server for IPv6 support with AAAA records, including zone file setup, reverse DNS, and production best practices.

---

## Introduction

As the internet continues its transition from IPv4 to IPv6, DNS administrators must ensure their infrastructure supports both protocols. BIND (Berkeley Internet Name Domain) remains the most widely deployed DNS server software, and properly configuring it for IPv6 is essential for modern network infrastructure.

This comprehensive guide walks you through configuring BIND for IPv6 DNS, focusing on AAAA records, zone file configuration, reverse DNS setup, and production-ready best practices.

## Understanding IPv6 and AAAA Records

### What are AAAA Records?

AAAA records (pronounced "quad-A") are DNS resource records that map a domain name to an IPv6 address. While A records map to 32-bit IPv4 addresses, AAAA records map to 128-bit IPv6 addresses.

**IPv4 A Record Example:**
```
www.example.com.    IN    A       192.0.2.1
```

**IPv6 AAAA Record Example:**
```
www.example.com.    IN    AAAA    2001:db8:85a3::8a2e:370:7334
```

### IPv6 Address Format

IPv6 addresses consist of eight groups of four hexadecimal digits, separated by colons:

```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

They can be abbreviated by:
- Removing leading zeros in each group
- Replacing consecutive groups of zeros with `::`

```
2001:db8:85a3::8a2e:370:7334
```

## Prerequisites

Before configuring BIND for IPv6, ensure you have:

- A Linux server (Ubuntu, Debian, CentOS, or RHEL)
- BIND9 installed
- Root or sudo access
- Valid IPv6 addresses assigned to your server
- Basic understanding of DNS concepts

### Installing BIND9

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install bind9 bind9utils bind9-doc dnsutils
```

**On CentOS/RHEL:**
```bash
sudo dnf install bind bind-utils
```

### Verifying IPv6 Support

Check if your server has IPv6 enabled:

```bash
ip -6 addr show
```

You should see output similar to:

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN qlen 1000
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000
    inet6 2001:db8:1::100/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::1/64 scope link
       valid_lft forever preferred_lft forever
```

## Configuring BIND for IPv6

### Step 1: Configure named.conf.options

The main BIND configuration file needs to be updated to enable IPv6 listening and forwarding.

Edit the options file:

```bash
sudo nano /etc/bind/named.conf.options
```

Add or modify the following configuration:

```bind
options {
    directory "/var/cache/bind";

    // Enable IPv6 listening
    listen-on-v6 { any; };
    listen-on { any; };

    // Allow queries from both IPv4 and IPv6
    allow-query { any; };

    // Enable DNSSEC validation
    dnssec-validation auto;

    // Recursion settings (adjust based on your needs)
    recursion yes;
    allow-recursion {
        localhost;
        localnets;
        // Add your trusted networks
        192.168.0.0/16;
        10.0.0.0/8;
        2001:db8::/32;
    };

    // Forwarders (optional - use your ISP or public DNS)
    forwarders {
        // Google Public DNS
        8.8.8.8;
        8.8.4.4;
        2001:4860:4860::8888;
        2001:4860:4860::8844;
        // Cloudflare DNS
        1.1.1.1;
        1.0.0.1;
        2606:4700:4700::1111;
        2606:4700:4700::64;
    };

    // Query source for IPv6
    query-source-v6 address *;

    // Transfer settings
    allow-transfer { none; };

    // Version hiding for security
    version "not disclosed";

    // Rate limiting to prevent abuse
    rate-limit {
        responses-per-second 10;
        window 5;
    };
};
```

### Step 2: Configure Logging

Proper logging helps troubleshoot IPv6 DNS issues:

```bash
sudo nano /etc/bind/named.conf.local
```

Add logging configuration:

```bind
logging {
    channel default_log {
        file "/var/log/named/default.log" versions 3 size 5m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel query_log {
        file "/var/log/named/query.log" versions 3 size 10m;
        severity debug 3;
        print-time yes;
    };

    channel security_log {
        file "/var/log/named/security.log" versions 3 size 5m;
        severity info;
        print-time yes;
        print-severity yes;
    };

    category default { default_log; };
    category queries { query_log; };
    category security { security_log; };
    category client { security_log; };
};
```

Create the log directory:

```bash
sudo mkdir -p /var/log/named
sudo chown bind:bind /var/log/named
```

### Step 3: Create Zone Configuration

Add your zone definitions to the local configuration:

```bash
sudo nano /etc/bind/named.conf.local
```

Add zone declarations:

```bind
// Forward zone for example.com
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-query { any; };
    allow-transfer {
        192.168.1.2;        // Secondary DNS IPv4
        2001:db8:1::2;      // Secondary DNS IPv6
    };
    also-notify {
        192.168.1.2;
        2001:db8:1::2;
    };
};

// IPv6 reverse zone for 2001:db8:1::/48
zone "1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/etc/bind/zones/db.2001.db8.1";
    allow-query { any; };
    allow-transfer {
        192.168.1.2;
        2001:db8:1::2;
    };
};

// IPv4 reverse zone for 192.168.1.0/24
zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.192.168.1";
    allow-query { any; };
    allow-transfer {
        192.168.1.2;
        2001:db8:1::2;
    };
};
```

## Creating Zone Files with AAAA Records

### Step 4: Create the Forward Zone File

Create the zones directory:

```bash
sudo mkdir -p /etc/bind/zones
```

Create the forward zone file:

```bash
sudo nano /etc/bind/zones/db.example.com
```

Add the following content:

```bind
;
; Zone file for example.com
; Includes both IPv4 (A) and IPv6 (AAAA) records
;
$TTL    86400       ; Default TTL (1 day)
$ORIGIN example.com.

; SOA Record
@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501      ; Serial (YYYYMMDDNN)
                        3600            ; Refresh (1 hour)
                        1800            ; Retry (30 minutes)
                        604800          ; Expire (1 week)
                        86400           ; Minimum TTL (1 day)
                        )

; Name Server Records
@               IN      NS      ns1.example.com.
@               IN      NS      ns2.example.com.

; Name Server A and AAAA Records
ns1             IN      A       192.168.1.1
ns1             IN      AAAA    2001:db8:1::1
ns2             IN      A       192.168.1.2
ns2             IN      AAAA    2001:db8:1::2

; Mail Server Records
@               IN      MX      10 mail.example.com.
@               IN      MX      20 mail2.example.com.

; Mail Server A and AAAA Records
mail            IN      A       192.168.1.10
mail            IN      AAAA    2001:db8:1::10
mail2           IN      A       192.168.1.11
mail2           IN      AAAA    2001:db8:1::11

; Web Server Records
@               IN      A       192.168.1.100
@               IN      AAAA    2001:db8:1::100
www             IN      A       192.168.1.100
www             IN      AAAA    2001:db8:1::100

; Application Servers
api             IN      A       192.168.1.101
api             IN      AAAA    2001:db8:1::101
app             IN      A       192.168.1.102
app             IN      AAAA    2001:db8:1::102

; Database Servers (internal only - IPv6 preferred)
db1             IN      A       192.168.1.200
db1             IN      AAAA    2001:db8:1::200
db2             IN      A       192.168.1.201
db2             IN      AAAA    2001:db8:1::201

; Monitoring and Management
monitor         IN      A       192.168.1.50
monitor         IN      AAAA    2001:db8:1::50
mgmt            IN      AAAA    2001:db8:1::51

; Load Balancer (multiple A/AAAA for round-robin)
lb              IN      A       192.168.1.110
lb              IN      A       192.168.1.111
lb              IN      AAAA    2001:db8:1::110
lb              IN      AAAA    2001:db8:1::111

; CDN Edge Nodes
cdn             IN      AAAA    2001:db8:1::120
cdn             IN      AAAA    2001:db8:1::121
cdn             IN      AAAA    2001:db8:1::122

; CNAME Records
blog            IN      CNAME   www.example.com.
shop            IN      CNAME   app.example.com.
status          IN      CNAME   monitor.example.com.

; TXT Records for verification and SPF
@               IN      TXT     "v=spf1 mx ip4:192.168.1.0/24 ip6:2001:db8:1::/48 -all"
_dmarc          IN      TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"

; SRV Records
_http._tcp      IN      SRV     0 5 80 www.example.com.
_https._tcp     IN      SRV     0 5 443 www.example.com.

; CAA Records (Certificate Authority Authorization)
@               IN      CAA     0 issue "letsencrypt.org"
@               IN      CAA     0 issuewild "letsencrypt.org"
@               IN      CAA     0 iodef "mailto:security@example.com"
```

### Step 5: Create IPv6 Reverse Zone File

The IPv6 reverse zone uses the `ip6.arpa` domain. IPv6 addresses are reversed nibble-by-nibble.

Create the reverse zone file:

```bash
sudo nano /etc/bind/zones/db.2001.db8.1
```

Add the following content:

```bind
;
; IPv6 Reverse Zone for 2001:db8:1::/48
;
$TTL    86400
$ORIGIN 1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.

@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501      ; Serial
                        3600            ; Refresh
                        1800            ; Retry
                        604800          ; Expire
                        86400           ; Minimum TTL
                        )

; Name Servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; PTR Records for 2001:db8:1::/48 subnet
; Format: reversed nibbles of the host portion

; 2001:db8:1::1 -> ns1.example.com
1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     ns1.example.com.

; 2001:db8:1::2 -> ns2.example.com
2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     ns2.example.com.

; 2001:db8:1::10 -> mail.example.com
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     mail.example.com.

; 2001:db8:1::11 -> mail2.example.com
1.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     mail2.example.com.

; 2001:db8:1::50 -> monitor.example.com
0.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     monitor.example.com.

; 2001:db8:1::100 -> www.example.com
0.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     www.example.com.

; 2001:db8:1::101 -> api.example.com
1.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     api.example.com.

; 2001:db8:1::102 -> app.example.com
2.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     app.example.com.

; 2001:db8:1::110 -> lb.example.com
0.1.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     lb.example.com.

; 2001:db8:1::200 -> db1.example.com
0.0.2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     db1.example.com.

; 2001:db8:1::201 -> db2.example.com
1.0.2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     db2.example.com.
```

### Step 6: Create IPv4 Reverse Zone File

For completeness, create the IPv4 reverse zone:

```bash
sudo nano /etc/bind/zones/db.192.168.1
```

```bind
;
; IPv4 Reverse Zone for 192.168.1.0/24
;
$TTL    86400
$ORIGIN 1.168.192.in-addr.arpa.

@       IN      SOA     ns1.example.com. admin.example.com. (
                        2026011501      ; Serial
                        3600            ; Refresh
                        1800            ; Retry
                        604800          ; Expire
                        86400           ; Minimum TTL
                        )

; Name Servers
@       IN      NS      ns1.example.com.
@       IN      NS      ns2.example.com.

; PTR Records
1       IN      PTR     ns1.example.com.
2       IN      PTR     ns2.example.com.
10      IN      PTR     mail.example.com.
11      IN      PTR     mail2.example.com.
50      IN      PTR     monitor.example.com.
100     IN      PTR     www.example.com.
101     IN      PTR     api.example.com.
102     IN      PTR     app.example.com.
110     IN      PTR     lb.example.com.
111     IN      PTR     lb.example.com.
200     IN      PTR     db1.example.com.
201     IN      PTR     db2.example.com.
```

## Validating and Starting BIND

### Step 7: Check Configuration Syntax

Verify your configuration files:

```bash
# Check main configuration
sudo named-checkconf

# Check zone files
sudo named-checkzone example.com /etc/bind/zones/db.example.com
sudo named-checkzone 1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa /etc/bind/zones/db.2001.db8.1
sudo named-checkzone 1.168.192.in-addr.arpa /etc/bind/zones/db.192.168.1
```

Expected output for zone checks:

```
zone example.com/IN: loaded serial 2026011501
OK
```

### Step 8: Set File Permissions

Ensure proper ownership and permissions:

```bash
sudo chown -R bind:bind /etc/bind/zones/
sudo chmod 644 /etc/bind/zones/*
```

### Step 9: Start and Enable BIND

```bash
# Restart BIND to apply changes
sudo systemctl restart bind9

# Enable BIND to start on boot
sudo systemctl enable bind9

# Check status
sudo systemctl status bind9
```

### Step 10: Configure Firewall

Allow DNS traffic through the firewall:

**Using UFW (Ubuntu):**
```bash
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo ufw reload
```

**Using firewalld (CentOS/RHEL):**
```bash
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload
```

## Testing IPv6 DNS Resolution

### Testing with dig

Test AAAA record resolution:

```bash
# Query AAAA record
dig @localhost www.example.com AAAA

# Expected output:
;; ANSWER SECTION:
www.example.com.        86400   IN      AAAA    2001:db8:1::100
```

Test both A and AAAA records:

```bash
# Query any address record
dig @localhost www.example.com ANY

# Query specific record types
dig @localhost example.com A
dig @localhost example.com AAAA
dig @localhost example.com MX
dig @localhost example.com NS
```

### Testing Reverse DNS

Test IPv6 reverse lookup:

```bash
# Reverse lookup for 2001:db8:1::100
dig @localhost -x 2001:db8:1::100

# Expected output:
;; ANSWER SECTION:
0.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. 86400 IN PTR www.example.com.
```

### Testing with nslookup

```bash
# Forward lookup
nslookup -type=AAAA www.example.com localhost

# Reverse lookup
nslookup 2001:db8:1::100 localhost
```

### Testing with host

```bash
# Check all records
host -a example.com localhost

# Check AAAA specifically
host -t AAAA www.example.com localhost
```

## Advanced IPv6 DNS Configuration

### Dual-Stack Configuration

For production environments, configure BIND to serve both IPv4 and IPv6 clients:

```bind
options {
    // Listen on all IPv4 and IPv6 interfaces
    listen-on port 53 { any; };
    listen-on-v6 port 53 { any; };

    // Allow queries from both protocols
    allow-query { any; };

    // Prefer IPv6 for outgoing queries (optional)
    prefer-ipv6 { any; };
};
```

### IPv6 ACLs (Access Control Lists)

Define ACLs for IPv6 networks:

```bind
acl "trusted-ipv6" {
    2001:db8:1::/48;        // Primary IPv6 network
    2001:db8:2::/48;        // Secondary IPv6 network
    ::1;                     // Localhost IPv6
};

acl "trusted-ipv4" {
    192.168.0.0/16;
    10.0.0.0/8;
    127.0.0.1;
};

acl "trusted" {
    "trusted-ipv4";
    "trusted-ipv6";
};

options {
    allow-recursion { "trusted"; };
    allow-query-cache { "trusted"; };
};
```

### IPv6 Views

Configure different responses based on client IPv6 addresses:

```bind
view "internal" {
    match-clients {
        192.168.0.0/16;
        2001:db8:1::/48;
    };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/internal/db.example.com";
    };
};

view "external" {
    match-clients { any; };

    zone "example.com" {
        type master;
        file "/etc/bind/zones/external/db.example.com";
    };
};
```

### Dynamic DNS Updates for IPv6

Enable secure dynamic updates:

```bind
// Generate TSIG key
// dnssec-keygen -a HMAC-SHA256 -b 256 -n HOST dhcp-update-key

key "dhcp-update-key" {
    algorithm hmac-sha256;
    secret "base64-encoded-secret-key";
};

zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-update { key "dhcp-update-key"; };
    update-policy {
        grant dhcp-update-key wildcard *.example.com A AAAA;
    };
};
```

### DNSSEC with IPv6

Enable DNSSEC for IPv6 zones:

```bash
# Generate Zone Signing Key (ZSK)
cd /etc/bind/zones
sudo dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com

# Generate Key Signing Key (KSK)
sudo dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com

# Sign the zone
sudo dnssec-signzone -A -3 $(head -c 1000 /dev/urandom | sha1sum | cut -b 1-16) \
    -N INCREMENT -o example.com -t db.example.com
```

Update zone configuration for DNSSEC:

```bind
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com.signed";
    key-directory "/etc/bind/zones";
    auto-dnssec maintain;
    inline-signing yes;
};
```

## Best Practices for IPv6 DNS

### 1. Always Provide Both A and AAAA Records

Ensure dual-stack compatibility by providing both record types for all services:

```bind
www     IN      A       192.168.1.100
www     IN      AAAA    2001:db8:1::100
```

### 2. Use Consistent TTL Values

Maintain consistent TTL values for A and AAAA records:

```bind
; Good practice - same TTL
www     3600    IN      A       192.168.1.100
www     3600    IN      AAAA    2001:db8:1::100

; Avoid different TTLs for the same hostname
```

### 3. Configure Proper Reverse DNS

Always configure reverse DNS (PTR records) for IPv6:

```bind
; Forward record
mail    IN      AAAA    2001:db8:1::10

; Corresponding reverse record (in ip6.arpa zone)
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0     IN      PTR     mail.example.com.
```

### 4. Monitor IPv6 DNS Traffic

Set up monitoring for IPv6-specific metrics:

```bash
# Check IPv6 query statistics
rndc status | grep -i ipv6

# Monitor query logs
tail -f /var/log/named/query.log | grep AAAA
```

### 5. Implement Rate Limiting

Protect against IPv6-based DNS amplification attacks:

```bind
options {
    rate-limit {
        responses-per-second 10;
        log-only no;
        ipv6-prefix-length 56;
    };
};
```

### 6. Use Response Policy Zones (RPZ)

Implement security filtering for IPv6:

```bind
response-policy {
    zone "rpz.example.com" policy passthru;
};

zone "rpz.example.com" {
    type master;
    file "/etc/bind/zones/db.rpz.example.com";
};
```

## Troubleshooting Common IPv6 DNS Issues

### Issue 1: BIND Not Listening on IPv6

**Symptom:** Queries over IPv6 fail

**Solution:**
```bash
# Check if BIND is listening on IPv6
sudo ss -tulpn | grep :53

# Verify configuration
grep -i "listen-on-v6" /etc/bind/named.conf.options

# Ensure listen-on-v6 is set to { any; } or specific addresses
```

### Issue 2: IPv6 Reverse DNS Not Resolving

**Symptom:** PTR lookups for IPv6 addresses fail

**Solution:**
```bash
# Verify zone file syntax
sudo named-checkzone 1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa /etc/bind/zones/db.2001.db8.1

# Check nibble format is correct
# Use online tools to verify IPv6 reverse address format
```

### Issue 3: Slow IPv6 DNS Resolution

**Symptom:** AAAA queries take longer than A queries

**Solution:**
```bind
options {
    // Ensure IPv6 transport is properly configured
    query-source-v6 address *;

    // Add IPv6 forwarders
    forwarders {
        2001:4860:4860::8888;
        2001:4860:4860::8844;
    };
};
```

### Issue 4: Zone Transfer Failures Over IPv6

**Symptom:** Secondary DNS servers cannot transfer zones via IPv6

**Solution:**
```bind
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
    allow-transfer {
        192.168.1.2;
        2001:db8:1::2;  // Explicitly allow IPv6 secondary
    };
    also-notify {
        192.168.1.2;
        2001:db8:1::2;
    };
};
```

### Useful Debugging Commands

```bash
# Check BIND status and statistics
rndc status

# Dump BIND cache
rndc dumpdb -cache
cat /var/cache/bind/named_dump.db | grep -A2 "example.com"

# Flush cache
rndc flush

# Reload zone
rndc reload example.com

# Check for configuration errors
sudo journalctl -u bind9 -f

# Test IPv6 connectivity to upstream DNS
ping6 2001:4860:4860::8888
dig @2001:4860:4860::8888 google.com AAAA
```

## Performance Optimization

### Optimize Query Performance

```bind
options {
    // Enable response caching
    max-cache-size 256m;
    max-cache-ttl 86400;
    max-ncache-ttl 3600;

    // Parallel queries
    clients-per-query 100;
    max-clients-per-query 500;

    // TCP performance
    tcp-clients 1000;
    tcp-listen-queue 10;

    // UDP buffer size for EDNS
    edns-udp-size 4096;
    max-udp-size 4096;
};
```

### Memory Optimization

```bind
options {
    // Limit cache size
    max-cache-size 128m;

    // Limit journal size
    max-journal-size 100m;

    // Cleaning interval
    cleaning-interval 60;
};
```

## Monitoring and Alerting

### Set Up DNS Monitoring

Create a monitoring script for IPv6 DNS:

```bash
#!/bin/bash
# /usr/local/bin/check-ipv6-dns.sh

HOSTNAME="www.example.com"
DNS_SERVER="localhost"
EXPECTED_IPV6="2001:db8:1::100"

# Query AAAA record
RESULT=$(dig @$DNS_SERVER $HOSTNAME AAAA +short)

if [ "$RESULT" == "$EXPECTED_IPV6" ]; then
    echo "OK: IPv6 DNS resolution working"
    exit 0
else
    echo "CRITICAL: IPv6 DNS resolution failed"
    echo "Expected: $EXPECTED_IPV6"
    echo "Got: $RESULT"
    exit 2
fi
```

### Integration with Monitoring Systems

For OneUptime monitoring, you can configure DNS checks:

```yaml
# Example monitoring configuration
dns_checks:
  - name: "IPv6 DNS - www"
    type: dns
    hostname: www.example.com
    record_type: AAAA
    expected_value: "2001:db8:1::100"
    interval: 60
    timeout: 10

  - name: "IPv6 Reverse DNS"
    type: dns
    query: "0.0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa"
    record_type: PTR
    expected_value: "www.example.com."
    interval: 60
```

## Summary Table

| Configuration Item | IPv4 | IPv6 |
|-------------------|------|------|
| **Record Type** | A | AAAA |
| **Address Length** | 32 bits | 128 bits |
| **Reverse Zone** | in-addr.arpa | ip6.arpa |
| **Listen Directive** | listen-on | listen-on-v6 |
| **Query Source** | query-source | query-source-v6 |
| **Address Format** | Dotted decimal | Hexadecimal with colons |
| **PTR Format** | Reversed octets | Reversed nibbles |
| **Typical TTL** | 3600-86400 | 3600-86400 |
| **ACL Notation** | 192.168.1.0/24 | 2001:db8:1::/48 |

## Quick Reference: IPv6 DNS Commands

| Task | Command |
|------|---------|
| Query AAAA record | `dig @server hostname AAAA` |
| Query all records | `dig @server hostname ANY` |
| Reverse lookup | `dig @server -x 2001:db8:1::100` |
| Check zone | `named-checkzone zone-name zone-file` |
| Check config | `named-checkconf` |
| Reload zone | `rndc reload zone-name` |
| View statistics | `rndc status` |
| Flush cache | `rndc flush` |

## Conclusion

Configuring BIND for IPv6 DNS is essential for modern network infrastructure. By following this guide, you have learned to:

1. Configure BIND to listen on IPv6 interfaces
2. Create zone files with AAAA records
3. Set up IPv6 reverse DNS zones
4. Implement best practices for dual-stack DNS
5. Troubleshoot common IPv6 DNS issues
6. Monitor and optimize IPv6 DNS performance

As IPv6 adoption continues to grow, having a properly configured DNS infrastructure ensures your services remain accessible to all users, regardless of their IP version.

Remember to:
- Always test changes in a staging environment first
- Keep your BIND installation updated
- Monitor DNS logs for issues
- Implement DNSSEC for enhanced security
- Set up proper monitoring and alerting

For ongoing monitoring of your DNS infrastructure, consider using OneUptime to track DNS resolution times, availability, and certificate expiration across both IPv4 and IPv6 endpoints.

## Additional Resources

- [BIND 9 Administrator Reference Manual](https://bind9.readthedocs.io/)
- [RFC 3596 - DNS Extensions to Support IPv6](https://tools.ietf.org/html/rfc3596)
- [RFC 4291 - IP Version 6 Addressing Architecture](https://tools.ietf.org/html/rfc4291)
- [ISC BIND Security Advisories](https://www.isc.org/bind/)
