# How to Configure AAAA Records in BIND

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, BIND, AAAA Records, DNS Configuration

Description: A step-by-step guide to adding IPv6 AAAA records to BIND zone files, enabling dual-stack hostname resolution for your services.

## What Is a AAAA Record?

A AAAA (quad-A) record maps a hostname to an IPv6 address, just as an A record maps to an IPv4 address. Adding AAAA records alongside A records enables dual-stack DNS resolution.

## BIND Zone File Syntax for AAAA Records

AAAA records use the same format as A records but contain IPv6 addresses:

```dns
; Zone file for example.com
; /var/named/example.com.zone

$ORIGIN example.com.
$TTL 3600

; SOA record
@   IN  SOA ns1.example.com. admin.example.com. (
        2026032001  ; Serial
        3600        ; Refresh
        900         ; Retry
        604800      ; Expire
        300 )       ; Negative cache TTL

; Name servers
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.

; IPv4 A records
@       IN  A       93.184.216.34
www     IN  A       93.184.216.34
mail    IN  A       93.184.216.100
ns1     IN  A       93.184.216.200
ns2     IN  A       93.184.216.201

; IPv6 AAAA records - add these alongside A records
@       IN  AAAA    2001:db8::1
www     IN  AAAA    2001:db8::1
mail    IN  AAAA    2001:db8::100
ns1     IN  AAAA    2001:db8::200
ns2     IN  AAAA    2001:db8::201
```

## Adding AAAA to an Existing Zone File

To add an AAAA record to an existing zone, open the zone file and add entries after the corresponding A records:

```bash
# Edit the zone file

vi /var/named/example.com.zone

# Add AAAA record for www (after the www A record)
# www     IN  A    93.184.216.34
# www     IN  AAAA 2001:db8::1

# IMPORTANT: Increment the serial number when modifying zone files
# Change: 2026032001 to 2026032002
```

## Reloading BIND After Zone Changes

```bash
# Check zone file syntax before reloading
named-checkzone example.com /var/named/example.com.zone

# If syntax is OK, reload just the zone (no service restart needed)
rndc reload example.com

# Or reload all zones
rndc reload

# Verify the AAAA record is loaded
# Check the file configured by BIND's dump-file option (defaults to named_dump.db)
rndc dumpdb -zones
grep 'AAAA' /path/to/named_dump.db | grep 'example.com'
```

## Verifying AAAA Records

```bash
# Query the AAAA record directly against your BIND server
dig AAAA www.example.com @127.0.0.1

# Expected output:
# www.example.com. 3600 IN AAAA 2001:db8::1

# Query the A record separately if you also want to verify dual-stack resolution
dig A www.example.com @127.0.0.1

# Test from an external client (replace 192.0.2.1 with your server's IP)
dig AAAA www.example.com @192.0.2.1
```

## Adding AAAA Records for Delegated Subdomains

If you have a delegated subdomain and need to add AAAA glue records for name servers:

```dns
; In the parent zone (example.com):
; Glue A and AAAA records for delegated NS
sub         IN  NS  ns1.sub.example.com.
ns1.sub     IN  A       203.0.113.10
ns1.sub     IN  AAAA    2001:db8:1::10
```

## Multiple AAAA Records for Load Balancing

You can add multiple AAAA records for the same hostname to distribute traffic across multiple IPv6 addresses:

```dns
; Multiple AAAA records - DNS will return all, client picks one
www     IN  AAAA    2001:db8::1
www     IN  AAAA    2001:db8::2
www     IN  AAAA    2001:db8::3
```

## AAAA Records for IPv6-Only Services

For services that are IPv6-only (no IPv4), add only a AAAA record with no A record:

```dns
; IPv6-only service - only AAAA, no A record
ipv6only    IN  AAAA    2001:db8::50
```

## Automating AAAA Record Updates with nsupdate

For dynamic updates, use `nsupdate` with TSIG authentication:

```bash
# Update AAAA record dynamically using nsupdate
nsupdate -k /etc/named/update.key << 'EOF'
server 127.0.0.1
zone example.com
update delete www.example.com. AAAA
update add www.example.com. 3600 AAAA 2001:db8::10
send
EOF
```

## Summary

Adding AAAA records in BIND is straightforward: add them to your zone files using the same format as A records but with IPv6 addresses, increment the zone serial number, validate with `named-checkzone`, and reload with `rndc reload`. Always add AAAA records alongside A records for dual-stack services, and verify with `dig AAAA` after deployment.
