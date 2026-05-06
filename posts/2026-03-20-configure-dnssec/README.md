# How to Configure DNSSEC for Secure DNS Lookups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, DNSSEC, Security, BIND, Linux, Cryptography

Description: Configure DNSSEC signing for a zone in BIND9 to protect DNS records from tampering and cache poisoning attacks.

## Introduction

DNSSEC (DNS Security Extensions) adds cryptographic signatures to DNS records. When a resolver receives a DNS response, it can verify the signature using the zone's DNSKEY records and the chain of trust back to the DNS root, confirming the data was not tampered with in transit. DNSSEC protects against cache poisoning attacks (where an attacker inserts false DNS records). This guide covers signing a zone with BIND9 and enabling DNSSEC validation.

## How DNSSEC Works

```text
DNSSEC chain of trust:
  Root Zone (.) → publishes DS for .com
  .com → publishes DS for example.com
  Each zone signs its own RRsets

Key types:
  ZSK (Zone Signing Key): signs most RRsets in the zone
  KSK (Key Signing Key): signs the DNSKEY RRset; its digest (DS) goes in parent zone

Verification:
  Resolver starts with the root trust anchor (pre-configured)
  The root trust anchor authenticates the root DNSKEY RRset
  The DS record for .com is authenticated by the root zone
  The DS record for .com authenticates the .com DNSKEY RRset
  The DS record for example.com is authenticated by the .com zone
  The DS record for example.com authenticates the example.com DNSKEY RRset
  example.com's DNSKEY RRset validates example.com's RRSIG records
  Chain is complete: answer is authenticated
```

## Enable DNSSEC Validation (Recursive Resolver)

```bash
# In /etc/bind/named.conf.options (for recursive resolver):

options {
    dnssec-validation auto;  # Uses managed-keys for root trust anchor
    # or: dnssec-validation yes;  # Requires explicit trust anchor
};

# Download root trust anchor:
unbound-anchor -a /var/lib/unbound/root.key  # For Unbound
# BIND manages its own root.key automatically with dnssec-validation auto

# Test DNSSEC validation against your validating resolver:
dig +dnssec cloudflare.com
# Look for: AD flag (Authentic Data) in the response header

# Test DNSSEC failure detection:
dig www.dnssec-failed.org A
# Should return: SERVFAIL when queried through a validating resolver
```

## Sign a Zone with BIND (Manual Method)

```bash
# Step 1: Generate keys for the zone:
cd /etc/bind/zones

# Generate ZSK (Zone Signing Key):
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com
# Creates: Kexample.com.+013+12345.key and Kexample.com.+013+12345.private

# Generate KSK (Key Signing Key):
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE example.com
# Creates: Kexample.com.+013+67890.key and Kexample.com.+013+67890.private

# Step 2: Include key files in zone:
cat >> /etc/bind/zones/db.example.com << 'EOF'
$INCLUDE "Kexample.com.+013+12345.key"
$INCLUDE "Kexample.com.+013+67890.key"
EOF

# Step 3: Sign the zone:
dnssec-signzone -a -N INCREMENT -o example.com \
  -t /etc/bind/zones/db.example.com \
  Kexample.com.+013+12345.key Kexample.com.+013+67890.key
# Creates: db.example.com.signed

# Step 4: Update zone declaration to use signed file:
# In named.conf.local: file "/etc/bind/zones/db.example.com.signed";
```

## Automate Signing with BIND Inline Signing

```bash
# Current BIND releases use dnssec-policy for automatic signing:
# /etc/bind/named.conf.local:
zone "example.com" {
    type primary;
    file "/etc/bind/zones/db.example.com";  # Unsigned zone file

    inline-signing yes;
    dnssec-policy default;    # Automatically create keys and maintain signatures
};

# Ensure named can write the zone directory and signing state:
chown -R bind:bind /etc/bind/zones

# Reload BIND:
rndc reconfig
# or:
systemctl reload bind9
```

## Publish DS Record to Parent Zone

```bash
# After signing, you must publish the DS record to your registrar/parent zone
# The DS record creates the chain of trust

# Generate DS record:
dnssec-dsfromkey -2 Kexample.com.+013+67890.key
# Output: example.com. IN DS 67890 13 2 <hash>

# Copy this DS record and submit to your domain registrar
# This creates the delegation from .com → example.com

# Verify DS is in parent zone:
dig @a.gtld-servers.net example.com DS
# Should show the DS record after registrar publishes it
```

## Verify DNSSEC is Working

```bash
# Comprehensive DNSSEC verification:
dig +dnssec example.com

# Check for RRSIG records (proof of signing):
dig example.com RRSIG +short

# Check for DNSKEY records:
dig example.com DNSKEY

# Validate the response with BIND's DNSSEC-aware lookup tool:
delv example.com
# Validates the response using the DNSSEC chain of trust

# Test with DNSSEC diagnostic tools:
# https://dnssec-analyzer.verisignlabs.com/
# https://dnsviz.net/d/example.com/dnssec/
```

## Conclusion

DNSSEC requires two components: signing the zone (creating RRSIG and DNSKEY records) and publishing the DS record to the parent zone (creating the chain of trust). Use BIND's inline signing with `dnssec-policy default` for automatic key management. After signing, submit the DS record to your domain registrar. Verify with `dig +dnssec` and look for the `AD` flag in responses from your validating recursive resolver. DNSSEC doesn't encrypt DNS - it only authenticates records. For privacy, combine with DNS over TLS or DNS over HTTPS.
