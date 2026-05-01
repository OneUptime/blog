# How to Configure DNSSEC with PowerDNS for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, DNSSEC, PowerDNS, IPv6, Security

Description: Learn how to enable DNSSEC on a PowerDNS authoritative nameserver with IPv6 support for signing and serving AAAA records.

## Overview

PowerDNS Authoritative Server offers built-in DNSSEC support with easy key management via the `pdnsutil` command-line tool. This guide covers enabling IPv6 listening and signing a zone that includes AAAA records.

## Prerequisites

- PowerDNS Authoritative Server 5.0+
- A zone with AAAA records already loaded
- Root or sudo access

## Step 1: Configure IPv6 Listening

Edit `/etc/powerdns/pdns.conf`:

```bash
# Listen on all IPv4 and IPv6 interfaces

local-address=0.0.0.0, ::

# Bind to port 53 explicitly
local-port=53
```

## Step 2: Enable DNSSEC on a Zone

PowerDNS uses `pdnsutil` to manage DNSSEC keys and policies:

```bash
# Secure the zone - PowerDNS generates a default CSK automatically
sudo pdnsutil zone secure example.com

# Verify the zone is secured and keys are created
sudo pdnsutil zone show example.com
```

## Step 3: Review the Generated Keys

```bash
# List all DNSSEC keys for the zone
sudo pdnsutil zone list-keys example.com

# Output shows key IDs, algorithms, and status
# By default, PowerDNS creates a single CSK using algorithm 13 (ECDSAP256SHA256)
```

## Step 4: Rectify the Zone

After securing a zone, rectify it so PowerDNS updates the backend fields needed for DNSSEC:

```bash
# Rectify updates the auth and ordername fields used for DNSSEC processing
sudo pdnsutil zone rectify example.com

# Check for any issues
sudo pdnsutil zone check example.com
```

## Step 5: Export DS Records for the Parent Zone

```bash
# Show the zone's DNSSEC details, including DS and DNSKEY material
sudo pdnsutil zone show example.com

# Or export DS records directly to send to your registrar
sudo pdnsutil zone export-ds example.com
```

## Step 6: Add AAAA Records via the API or CLI

```bash
# Add an AAAA record using pdnsutil
sudo pdnsutil rrset add example.com www.example.com AAAA 300 "2001:db8:1::10"

# Add a record for the nameserver host
sudo pdnsutil rrset add example.com ns1.example.com AAAA 300 "2001:db8:1::1"

# Rectify again after adding records
sudo pdnsutil zone rectify example.com
```

## Step 7: Verify DNSSEC Over IPv6

```bash
# Query your PowerDNS server directly over IPv6 and request DNSSEC records
dig +dnssec +norecurse AAAA www.example.com @2001:db8:1::1

# Check for the AA flag and an accompanying RRSIG AAAA in the answer section
# The AD flag is normally set by a validating recursive resolver, not an authoritative server

# Use delv with a validating resolver for end-to-end DNSSEC validation
delv AAAA www.example.com
```

## Using the PowerDNS API

PowerDNS also provides a REST API for zone management, which is useful for automation:

```bash
# Enable the API in pdns.conf
# api=yes
# api-key=your-secret-key
# webserver=yes
# webserver-address=::

# Create a zone via the API
curl -H "X-API-Key: your-secret-key" \
     -H "Content-Type: application/json" \
     -X POST \
     http://[::1]:8081/api/v1/servers/localhost/zones \
     -d '{"name":"example.com.","kind":"Native","nameservers":["ns1.example.com."]}'
```

## Monitoring DNSSEC Health

Use [OneUptime](https://oneuptime.com) to monitor your PowerDNS server over IPv6, checking both DNS availability and DNSSEC validation status. Configure alerts for when RRSIG records are about to expire.

## Conclusion

PowerDNS simplifies DNSSEC management with `pdnsutil`. Ensure IPv6 listening is configured, secure your zones, rectify them, and publish DS records to complete the chain of trust. Regularly monitor key expiry and zone health.
