# How to Configure PowerDNS as an Authoritative IPv6 DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PowerDNS, DNS, IPv6, Authoritative, AAAA, Pdns, Zone

Description: Configure PowerDNS Authoritative Server to serve zones with AAAA records over IPv6 transport, using the generic SQL backend.

## Introduction

PowerDNS Authoritative Server (pdns) supports multiple backends (MySQL, PostgreSQL, SQLite, BIND zone files). It natively serves AAAA records and can listen on IPv6 addresses. This post covers the MySQL backend with IPv6 zones.

## Installation

```bash
# Ubuntu/Debian

apt-get install -y pdns-server pdns-backend-mysql

# Initialize the schema
mysql -u root -p pdns < /usr/share/pdns-backend-mysql/schema/schema.mysql.sql
```

## Step 1: pdns.conf for IPv6

```ini
# /etc/powerdns/pdns.conf

launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=secret
gmysql-dbname=pdns

# Listen on all IPv6 and IPv4 addresses
local-address=0.0.0.0, ::

# Or specify explicit addresses
# local-address=2001:db8::53, 0.0.0.0

local-port=53

# Logging
loglevel=5
log-dns-queries=yes
```

## Step 2: Add Zone and Records via pdnsutil

```bash
# Create the zone (this also seeds a default SOA record)
pdnsutil create-zone example.com

# Replace the default SOA with one of our own
pdnsutil replace-rrset example.com @ SOA \
    "ns1.example.com. admin.example.com. 2026031901 3600 900 604800 300"

# Add NS records
pdnsutil add-record example.com @ NS ns1.example.com.
pdnsutil add-record example.com @ NS ns2.example.com.

# Add AAAA records
pdnsutil add-record example.com ns1 AAAA 2001:db8::1
pdnsutil add-record example.com ns2 AAAA 2001:db8::2
pdnsutil add-record example.com www AAAA 2001:db8::10
pdnsutil add-record example.com mail AAAA 2001:db8::20
pdnsutil add-record example.com @ AAAA 2001:db8::10

# Add A records alongside
pdnsutil add-record example.com www A 203.0.113.10
pdnsutil add-record example.com @ A 203.0.113.10

# Add MX
pdnsutil add-record example.com @ MX "10 mail.example.com."

# Rectify the zone (fix DNSSEC ordering)
pdnsutil rectify-zone example.com

# Check zone
pdnsutil check-zone example.com
```

## Step 3: IPv6 Reverse Zone

```bash
# Create the reverse zone
pdnsutil create-zone 0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

pdnsutil replace-rrset \
    0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa \
    @ SOA \
    "ns1.example.com. admin.example.com. 2026031901 3600 900 604800 300"

# PTR for 2001:db8::1
pdnsutil add-record \
    0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa \
    "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0" PTR ns1.example.com.
```

## Step 4: DNSSEC

```bash
# Enable DNSSEC on the zone
pdnsutil secure-zone example.com

# Generate DS records to submit to registrar
pdnsutil show-zone example.com | grep DS

# Set NSEC3 for privacy (optional)
pdnsutil set-nsec3 example.com "1 0 10 deadbeef"
```

## Step 5: Test

```bash
# Reload zones
pdns_control reload

# Test AAAA query over IPv6 transport
dig AAAA www.example.com @2001:db8::53 -6

# Test reverse lookup
dig -x 2001:db8::10 @2001:db8::53

# Verify DNSSEC
dig +dnssec AAAA www.example.com @2001:db8::53
```

## API for Zone Management

```bash
# Enable REST API
# pdns.conf:
# api=yes
# api-key=changeme
# webserver=yes
# webserver-address=::1

# Add AAAA record via API
curl -s -X PATCH \
    -H "X-API-Key: changeme" \
    -H "Content-Type: application/json" \
    -d '{"rrsets":[{"name":"api.example.com.","type":"AAAA","ttl":300,
         "changetype":"REPLACE","records":[{"content":"2001:db8::99","disabled":false}]}]}' \
    "http://[::1]:8081/api/v1/servers/localhost/zones/example.com."
```

## Conclusion

PowerDNS Authoritative Server enables IPv6 with `local-ipv6=::` and AAAA records managed via `pdnsutil` or the REST API. DNSSEC is straightforward with `pdnsutil secure-zone`. Monitor PowerDNS with OneUptime to track query rates, backend latency, and zone transfer health.
