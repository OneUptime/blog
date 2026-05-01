# How to Configure DNSSEC with BIND for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, DNSSEC, BIND, IPv6, Security, Network

Description: A step-by-step guide to enabling DNSSEC on a BIND nameserver with full IPv6 support for signing and serving AAAA records securely.

## Overview

DNSSEC (DNS Security Extensions) adds cryptographic signatures to DNS records, protecting against cache poisoning and spoofing attacks. When combined with IPv6, you need to ensure BIND listens on IPv6 interfaces and that AAAA records are properly signed.

## Prerequisites

- BIND 9.16+ installed
- A zone file with AAAA records
- Root access on the nameserver

## Step 1: Configure BIND to Listen on IPv6

Edit `/etc/bind/named.conf.options` to listen on IPv6 interfaces:

```bash
# Open the BIND options file

sudo nano /etc/bind/named.conf.options
```

```text
options {
    // Listen on all IPv6 and IPv4 interfaces
    listen-on-v6 { any; };
    listen-on { any; };
};
```

## Step 2: Generate DNSSEC Keys

With `dnssec-policy default`, `named` generates and manages the zone's signing keys automatically when the zone is loaded or reloaded, so you do not run `dnssec-keygen` manually for this workflow.

## Step 3: Configure the Zone for DNSSEC

Update your zone configuration to enable automatic signing, and ensure `named` can write to the zone file location and the key directory:

```text
// /etc/bind/named.conf.local
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";

    // Enable automatic DNSSEC signing
    dnssec-policy default;
    inline-signing yes;

    // Directory where generated DNSSEC keys are stored
    key-directory "/etc/bind/keys";
};
```

## Step 4: Ensure AAAA Records Exist in Your Zone File

Your zone file should include IPv6 addresses for your hosts:

```text
; /etc/bind/zones/db.example.com
$ORIGIN example.com.
$TTL 300

@   IN  SOA  ns1.example.com. admin.example.com. (
                2026031901 ; Serial
                3600       ; Refresh
                900        ; Retry
                604800     ; Expire
                300 )      ; Minimum TTL

; Nameserver records
@   IN  NS   ns1.example.com.

; IPv4 and IPv6 addresses for the nameserver
ns1 IN  A    203.0.113.1
ns1 IN  AAAA 2001:db8:1::1

; Web server with IPv6
www IN  A    203.0.113.10
www IN  AAAA 2001:db8:1::10
```

## Step 5: Validate and Reload

```bash
# Check the configuration syntax
sudo named-checkconf

# Check the zone file syntax
sudo named-checkzone example.com /etc/bind/zones/db.example.com

# Reload BIND to apply changes and start automatic signing
sudo rndc reload
```

## Step 6: Verify DNSSEC is Working

```bash
# Query the authoritative server over IPv6 and look for an RRSIG covering the AAAA answer
dig +dnssec @2001:db8:1::1 www.example.com AAAA

# Query through a validating resolver; if your resolver validates DNSSEC, the response includes the AD flag
dig +dnssec www.example.com AAAA

# Verify the DS record is visible after publishing it in the parent zone
dig +dnssec example.com DS
```

## Monitoring with OneUptime

After configuring DNSSEC, monitor your DNS resolution over IPv6 using [OneUptime](https://oneuptime.com). Set up DNS monitors that query your AAAA records via IPv6 and alert you if DNSSEC validation fails or records become unreachable.

## Conclusion

Configuring DNSSEC with BIND for IPv6 involves listening on IPv6 interfaces and enabling automatic signing for the zone. Always verify that AAAA records carry valid RRSIG signatures and publish DS records to your registrar to complete the chain of trust.
