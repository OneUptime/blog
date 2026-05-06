# How to Configure AAAA Records in PowerDNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, PowerDNS, AAAA Records, DNS Configuration

Description: A guide to adding IPv6 AAAA records in PowerDNS using the pdnsutil command-line tool and the REST API.

## PowerDNS Overview

PowerDNS Authoritative Server can store DNS records in several backends, including SQLite, MySQL, PostgreSQL, and BIND zone files, and exposes management via the `pdnsutil` command-line tool and an HTTP REST API. Adding AAAA records can be done through either interface.

## Method 1: Using pdnsutil

`pdnsutil` is the primary CLI for managing PowerDNS records:

```bash
# List existing records in a zone

pdnsutil zone list example.com

# Add an AAAA record for www.example.com
# Format: pdnsutil rrset add ZONE NAME TYPE TTL CONTENT
pdnsutil rrset add example.com www.example.com AAAA 3600 2001:db8::1

# Add multiple AAAA records (round-robin)
pdnsutil rrset add example.com www.example.com AAAA 3600 2001:db8::2
pdnsutil rrset add example.com www.example.com AAAA 3600 2001:db8::3

# Add AAAA for the zone apex
pdnsutil rrset add example.com example.com AAAA 3600 2001:db8::1

# Add AAAA for a subdomain
pdnsutil rrset add example.com mail.example.com AAAA 3600 2001:db8::100

# Verify the records were added
pdnsutil zone list example.com | grep AAAA

# Increment the SOA serial after changes
pdnsutil zone increase-serial example.com
```

## Method 2: Direct Database Manipulation (MySQL/PostgreSQL)

PowerDNS recommends using `pdnsutil` or the REST API instead of raw SQL, but if you need to batch-import AAAA records you can insert directly into the PowerDNS database:

```sql
-- First, find the domain_id for the zone
SELECT id FROM domains WHERE name = 'example.com';
-- Assume domain_id = 1

-- Insert an AAAA record
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled)
VALUES (1, 'www.example.com', 'AAAA', '2001:db8::1', 3600, NULL, false);

-- Insert AAAA for the apex
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled)
VALUES (1, 'example.com', 'AAAA', '2001:db8::1', 3600, NULL, false);

-- Verify
SELECT name, type, content, ttl FROM records
WHERE domain_id = 1 AND type = 'AAAA';
```

If DNSSEC is enabled for the backend or zone, rectify the zone after direct SQL changes:

```bash
pdnsutil zone rectify example.com
```

## Method 3: Using the PowerDNS REST API

The PowerDNS HTTP API allows programmatic record management:

```bash
# First, enable the API in pdns.conf if not already done:
# api=yes
# api-key=your-secret-key
# webserver=yes
# webserver-address=127.0.0.1
# webserver-port=8081

# Add an AAAA record via the REST API using curl
curl -X PATCH \
    -H "X-API-Key: your-secret-key" \
    -H "Content-Type: application/json" \
    -d '{
        "rrsets": [{
            "name": "www.example.com.",
            "type": "AAAA",
            "ttl": 3600,
            "changetype": "REPLACE",
            "records": [
                {"content": "2001:db8::1", "disabled": false},
                {"content": "2001:db8::2", "disabled": false}
            ]
        }]
    }' \
    http://127.0.0.1:8081/api/v1/servers/localhost/zones/example.com.
```

## Method 4: Zone File Import

If you have a zone file with AAAA records to import:

```bash
# Create a zone file with AAAA records
cat > /tmp/example.com.zone << 'EOF'
$ORIGIN example.com.
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
        2026032001 3600 900 604800 300 )
@   IN  NS  ns1.example.com.
@   IN  A   93.184.216.34
@   IN  AAAA 2001:db8::1
www IN  A   93.184.216.34
www IN  AAAA 2001:db8::1
EOF

# Load the zone file into PowerDNS
pdnsutil zone load example.com /tmp/example.com.zone

# Or create the zone first, then load the file
pdnsutil zone create example.com
pdnsutil zone load example.com /tmp/example.com.zone
```

## Verifying AAAA Records in PowerDNS

```bash
# List all records in the zone
pdnsutil zone list example.com

# Test resolution directly against PowerDNS
dig AAAA www.example.com @127.0.0.1

# Check zone correctness
pdnsutil zone check example.com

# If you changed records directly in the backend on a DNSSEC-capable setup,
# rectify the zone to recalculate DNSSEC metadata
pdnsutil zone rectify example.com
```

## Removing AAAA Records

```bash
# Delete a specific AAAA record
pdnsutil rrset delete example.com www.example.com AAAA

# To remove only one record when multiple exist, use the API
# with a REPLACE changetype specifying only the records to keep
```

## Summary

PowerDNS offers multiple ways to add AAAA records: `pdnsutil rrset add` for interactive use, direct SQL inserts for bulk operations, the REST API for programmatic management, and zone file imports for initial setup. After adding records with `pdnsutil` or direct SQL, increment the SOA serial with `pdnsutil zone increase-serial` and verify with `dig AAAA`. API changes follow the zone's `SOA-EDIT-API` rules.
