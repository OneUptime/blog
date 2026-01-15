# How to Migrate from NSEC to NSEC3 in Your DNSSEC Zone

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, NSEC, NSEC3, DNS, Security, Migration

Description: A comprehensive guide to migrating your DNSSEC-signed zone from NSEC to NSEC3, including step-by-step instructions, verification procedures, and best practices for a seamless transition.

---

## Introduction

DNSSEC (Domain Name System Security Extensions) provides authentication and integrity verification for DNS responses. One critical component of DNSSEC is the mechanism used to prove that a specific DNS record does not exist, known as authenticated denial of existence. Two primary methods exist for this purpose: NSEC (Next Secure) and NSEC3 (Next Secure Version 3).

While NSEC was the original solution, it has a significant drawback: it allows zone enumeration, meaning attackers can walk through your entire DNS zone and discover all hostnames. NSEC3 was introduced in RFC 5155 to address this vulnerability by using hashed owner names, making zone enumeration computationally expensive.

This guide will walk you through the complete process of migrating from NSEC to NSEC3, ensuring your DNS infrastructure maintains security while preventing zone enumeration attacks.

## Understanding NSEC vs NSEC3

Before diving into the migration process, it is essential to understand the fundamental differences between these two mechanisms.

### NSEC (Next Secure Record)

NSEC records work by creating a chain of all existing domain names in a zone. Each NSEC record points to the next domain name in canonical order and lists the record types that exist for the current name.

```
example.com.    IN NSEC api.example.com. A AAAA MX NS SOA RRSIG NSEC DNSKEY
api.example.com. IN NSEC mail.example.com. A AAAA RRSIG NSEC
mail.example.com. IN NSEC www.example.com. A AAAA MX RRSIG NSEC
www.example.com. IN NSEC example.com. A AAAA RRSIG NSEC
```

The problem with this approach is immediately apparent: anyone can query for NSEC records and traverse the entire chain to enumerate every hostname in your zone.

### NSEC3 (Next Secure Version 3)

NSEC3 addresses the zone enumeration vulnerability by using cryptographic hashes of domain names instead of the actual names. The chain still exists, but it is now composed of hashed values.

```
h9p7u7tr2u91d0v0ljs9l1gidnp90u3h.example.com. IN NSEC3 1 0 10 AABBCCDD (
    kohar7mbb8dc2ce8a9qvl8hon4k53uhi A AAAA RRSIG )
```

The hash algorithm, iteration count, and salt make it computationally expensive to determine which domain names correspond to which hashes.

### Key Differences Summary

| Feature | NSEC | NSEC3 |
|---------|------|-------|
| Zone Enumeration | Easy | Computationally expensive |
| Record Size | Smaller | Larger |
| Complexity | Simple | More complex |
| CPU Usage | Lower | Higher |
| Opt-Out Support | No | Yes |
| RFC | RFC 4034 | RFC 5155 |

## Prerequisites for Migration

Before beginning the migration, ensure you have the following in place:

### 1. DNS Server Software

Your DNS server software must support NSEC3. Most modern DNS servers do, including:

- BIND 9.6 and later
- PowerDNS 3.0 and later
- Knot DNS 1.0 and later
- NSD 3.0 and later

### 2. Current Zone Status

Verify your zone is currently signed with DNSSEC and using NSEC:

```bash
# Check current DNSSEC status
dig @your-nameserver example.com DNSKEY +dnssec

# Verify NSEC records exist
dig @your-nameserver example.com NSEC +dnssec

# Check the NSEC chain
dig @your-nameserver nonexistent.example.com A +dnssec
```

### 3. Backup Your Zone

Always create a complete backup before making changes:

```bash
# Backup the zone file
cp /var/named/zones/example.com.zone /var/named/zones/example.com.zone.backup

# Export current zone with DNSSEC records
named-compilezone -o /var/named/backup/example.com.export example.com /var/named/zones/example.com.zone
```

### 4. Key Management

Ensure you have access to your ZSK (Zone Signing Key) and KSK (Key Signing Key):

```bash
# List current keys
ls -la /var/named/keys/

# Verify key status
dnssec-settime -p all Kexample.com.+008+12345
```

## Planning the Migration

A successful migration requires careful planning. Consider the following factors:

### Timing

- Choose a low-traffic period for the migration
- Ensure you have adequate time to complete and verify the migration
- Have rollback procedures ready

### NSEC3 Parameters

You will need to decide on several NSEC3 parameters:

#### Hash Algorithm

Currently, SHA-1 (algorithm 1) is the only widely supported hash algorithm for NSEC3.

```
Algorithm 1 = SHA-1
```

#### Iterations

The iteration count determines how many times the hash function is applied. Higher values increase CPU usage but provide better protection against rainbow table attacks.

- Recommended: 0-10 iterations for most zones
- Maximum recommended: 150 iterations (higher values may cause resolver issues)

```bash
# Modern recommendation (RFC 9276)
# Use 0 iterations for better performance
ITERATIONS=0
```

#### Salt

The salt is a random value that makes precomputed rainbow tables ineffective. However, RFC 9276 now recommends using an empty salt for operational simplicity.

```bash
# Traditional approach (random salt)
SALT=$(head -c 8 /dev/urandom | xxd -p)

# Modern recommendation (RFC 9276)
# Use empty salt
SALT="-"
```

#### Opt-Out Flag

The opt-out flag allows unsigned delegations to be excluded from the NSEC3 chain. This is useful for large zones with many unsigned delegations (like TLD zones).

```
0 = No opt-out (all delegations included)
1 = Opt-out enabled (unsigned delegations may be excluded)
```

For most zones, opt-out should be disabled (0).

## Step-by-Step Migration Guide

### Step 1: Verify Current Configuration

First, confirm your current DNSSEC setup is working correctly.

```bash
# Check zone signing status
rndc zonestatus example.com

# Verify DNSSEC chain
dnssec-verify -o example.com /var/named/zones/example.com.zone

# Test external validation
dig @8.8.8.8 example.com A +dnssec +multiline
```

Expected output should show the AD (Authenticated Data) flag:

```
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
```

### Step 2: Prepare NSEC3 Parameters

Create a configuration file with your NSEC3 parameters:

```bash
# Create NSEC3 parameter file
cat > /var/named/nsec3-params.conf << EOF
# NSEC3 Parameters for example.com
# Algorithm: 1 (SHA-1)
# Flags: 0 (no opt-out)
# Iterations: 0 (RFC 9276 recommendation)
# Salt: - (empty, RFC 9276 recommendation)

NSEC3_ALGO=1
NSEC3_FLAGS=0
NSEC3_ITERATIONS=0
NSEC3_SALT="-"
EOF
```

### Step 3: Generate NSEC3PARAM Record

The NSEC3PARAM record tells resolvers about your NSEC3 configuration. Generate it using dnssec-signzone or your DNS server's tools.

#### Using BIND

```bash
# Source the parameters
source /var/named/nsec3-params.conf

# Create the NSEC3PARAM record
# This will be added during zone signing
echo "Creating NSEC3PARAM with:"
echo "  Algorithm: $NSEC3_ALGO"
echo "  Flags: $NSEC3_FLAGS"
echo "  Iterations: $NSEC3_ITERATIONS"
echo "  Salt: $NSEC3_SALT"
```

### Step 4: Configure Zone for NSEC3

Update your zone configuration to use NSEC3.

#### BIND Configuration

Edit your named.conf or zone configuration file:

```
zone "example.com" {
    type master;
    file "/var/named/zones/example.com.zone";

    // Enable inline signing
    inline-signing yes;
    auto-dnssec maintain;

    // Configure NSEC3
    dnssec-policy "nsec3-policy";
};

// Define NSEC3 policy
dnssec-policy "nsec3-policy" {
    keys {
        ksk key-directory lifetime unlimited algorithm ecdsap256sha256;
        zsk key-directory lifetime 30d algorithm ecdsap256sha256;
    };

    // NSEC3 parameters
    nsec3param iterations 0 optout no salt-length 0;

    dnskey-ttl 3600;
    publish-safety 1h;
    retire-safety 1h;
    purge-keys 90d;

    signatures-refresh 5d;
    signatures-validity 14d;
    signatures-validity-dnskey 14d;

    max-zone-ttl 86400;
    zone-propagation-delay 300;
    parent-ds-ttl 86400;
    parent-propagation-delay 3600;
};
```

#### Alternative: Manual Zone Signing

If you prefer manual signing, use dnssec-signzone:

```bash
# Navigate to your zone directory
cd /var/named/zones

# Sign the zone with NSEC3
dnssec-signzone \
    -3 - \                    # Use NSEC3 with empty salt
    -H 0 \                    # 0 iterations
    -A \                      # Generate NSEC3 for all types
    -o example.com \          # Zone origin
    -f example.com.zone.signed \  # Output file
    -k /var/named/keys/Kexample.com.+013+12345.key \  # KSK
    /var/named/zones/example.com.zone \
    /var/named/keys/Kexample.com.+013+54321.key       # ZSK
```

### Step 5: Apply the Changes

Reload your DNS zone to apply the NSEC3 configuration.

```bash
# Check configuration syntax
named-checkconf /etc/named.conf

# Check zone file syntax
named-checkzone example.com /var/named/zones/example.com.zone

# Reload the zone
rndc reload example.com

# Or restart BIND if necessary
systemctl restart named
```

### Step 6: Verify NSEC3 Deployment

After applying changes, verify the migration was successful.

#### Check NSEC3PARAM Record

```bash
# Query for NSEC3PARAM
dig @localhost example.com NSEC3PARAM +short

# Expected output (example)
# 1 0 0 -
```

The output format is: `algorithm flags iterations salt`

#### Check NSEC3 Records

```bash
# Query for a non-existent name to trigger NSEC3 response
dig @localhost nonexistent.example.com A +dnssec

# Look for NSEC3 in the AUTHORITY section
# You should see hashed names like:
# h9p7u7tr2u91d0v0ljs9l1gidnp90u3h.example.com. IN NSEC3 1 0 0 - (...)
```

#### Verify No NSEC Records Remain

```bash
# Check that NSEC records are no longer present
dig @localhost example.com NSEC +dnssec

# Should return NXDOMAIN or empty answer
```

### Step 7: Test External Resolvers

Verify that external resolvers can properly validate your zone.

```bash
# Test with Google DNS
dig @8.8.8.8 example.com A +dnssec

# Test with Cloudflare DNS
dig @1.1.1.1 example.com A +dnssec

# Test with Quad9 DNS
dig @9.9.9.9 example.com A +dnssec
```

All responses should include the AD (Authenticated Data) flag.

### Step 8: Monitor and Validate

Use online DNSSEC validators to confirm proper configuration:

```bash
# DNSViz (command line)
dnsviz probe example.com | dnsviz graph -Tpng -o example.com.png

# Or use web-based tools:
# - https://dnsviz.net/
# - https://dnssec-debugger.verisignlabs.com/
# - https://www.zonemaster.net/
```

## Verification Procedures

Thorough verification is essential after migration. Follow these procedures to ensure everything is working correctly.

### Local Verification

```bash
#!/bin/bash
# nsec3-verify.sh - NSEC3 Migration Verification Script

ZONE="example.com"
NS="localhost"

echo "=== NSEC3 Migration Verification for $ZONE ==="
echo ""

# 1. Check NSEC3PARAM record
echo "1. Checking NSEC3PARAM record..."
NSEC3PARAM=$(dig @$NS $ZONE NSEC3PARAM +short)
if [ -n "$NSEC3PARAM" ]; then
    echo "   PASS: NSEC3PARAM found: $NSEC3PARAM"
else
    echo "   FAIL: NSEC3PARAM not found"
fi
echo ""

# 2. Check for NSEC3 in NXDOMAIN response
echo "2. Checking NSEC3 in NXDOMAIN response..."
NSEC3_RESPONSE=$(dig @$NS nonexistent.$ZONE A +dnssec | grep "NSEC3")
if [ -n "$NSEC3_RESPONSE" ]; then
    echo "   PASS: NSEC3 records found in denial response"
else
    echo "   FAIL: NSEC3 records not found"
fi
echo ""

# 3. Check that NSEC is no longer used
echo "3. Checking that NSEC is no longer used..."
NSEC_RESPONSE=$(dig @$NS $ZONE NSEC +short)
if [ -z "$NSEC_RESPONSE" ]; then
    echo "   PASS: No NSEC records found"
else
    echo "   WARN: NSEC records still present"
fi
echo ""

# 4. Verify DNSSEC validation
echo "4. Verifying DNSSEC validation..."
AD_FLAG=$(dig @8.8.8.8 $ZONE A | grep "flags:" | grep " ad")
if [ -n "$AD_FLAG" ]; then
    echo "   PASS: AD flag present in response"
else
    echo "   FAIL: AD flag not present - validation may be broken"
fi
echo ""

# 5. Check DNSKEY records
echo "5. Checking DNSKEY records..."
DNSKEY_COUNT=$(dig @$NS $ZONE DNSKEY +short | wc -l)
echo "   INFO: Found $DNSKEY_COUNT DNSKEY records"
echo ""

# 6. Check SOA serial
echo "6. Checking SOA serial..."
SOA=$(dig @$NS $ZONE SOA +short)
echo "   INFO: Current SOA: $SOA"
echo ""

echo "=== Verification Complete ==="
```

### Remote Validation

Test your zone from multiple locations and resolvers:

```bash
# Test from different geographic locations using public resolvers
RESOLVERS=("8.8.8.8" "8.8.4.4" "1.1.1.1" "1.0.0.1" "9.9.9.9" "149.112.112.112")

for resolver in "${RESOLVERS[@]}"; do
    echo "Testing with resolver: $resolver"
    dig @$resolver example.com A +dnssec +short
    echo ""
done
```

### NSEC3 Hash Verification

Verify the NSEC3 hash chain is correct:

```bash
# Calculate expected NSEC3 hash for a known name
# Using nsec3hash tool from BIND

# Syntax: nsec3hash <salt> <algorithm> <iterations> <domain>
nsec3hash - 1 0 www.example.com

# Compare with actual NSEC3 record
dig @localhost www.example.com NSEC3 +dnssec
```

## Troubleshooting Common Issues

### Issue 1: NSEC3PARAM Not Appearing

If the NSEC3PARAM record is not appearing after reload:

```bash
# Check zone signing status
rndc signing -list example.com

# Force re-signing
rndc sign example.com

# Check for errors in logs
journalctl -u named -f
```

### Issue 2: Validation Failures

If external resolvers fail to validate:

```bash
# Check DS record matches KSK
dig @your-registrar example.com DS +short

# Calculate DS from your KSK
dnssec-dsfromkey -2 /var/named/keys/Kexample.com.+013+12345.key

# Verify chain of trust
delv @8.8.8.8 example.com A +rtrace
```

### Issue 3: Mixed NSEC/NSEC3 Records

If both NSEC and NSEC3 records appear:

```bash
# Force complete re-signing
rndc freeze example.com
rm /var/named/zones/example.com.zone.signed
rm /var/named/zones/example.com.zone.jnl
rndc thaw example.com

# Wait for signing to complete
sleep 30

# Verify
dig @localhost example.com NSEC +short
dig @localhost example.com NSEC3PARAM +short
```

### Issue 4: High CPU Usage

If you notice increased CPU usage after migration:

```bash
# Reduce NSEC3 iterations
# Edit named.conf and change iterations to 0

# Reload configuration
rndc reconfig

# Monitor CPU usage
top -p $(pgrep named)
```

### Issue 5: Resolver Compatibility

Some older resolvers may have issues with certain NSEC3 configurations:

```bash
# Test with various resolver implementations
# Check for specific error messages

# Use verbose output
dig @problem-resolver example.com A +dnssec +all
```

## Rollback Procedure

If you need to rollback to NSEC, follow these steps:

### Step 1: Update Configuration

Remove NSEC3 configuration from named.conf:

```
zone "example.com" {
    type master;
    file "/var/named/zones/example.com.zone";
    inline-signing yes;
    auto-dnssec maintain;

    // Remove or comment out NSEC3 configuration
    // dnssec-policy "nsec3-policy";
    dnssec-policy "default";  // Uses NSEC by default
};
```

### Step 2: Remove NSEC3PARAM

```bash
# Freeze the zone
rndc freeze example.com

# Remove NSEC3PARAM from zone file if manually added
# Edit the zone file to remove NSEC3PARAM record

# Thaw and reload
rndc thaw example.com
```

### Step 3: Re-sign with NSEC

```bash
# Force re-signing without NSEC3
dnssec-signzone \
    -o example.com \
    -f example.com.zone.signed \
    -k /var/named/keys/Kexample.com.+013+12345.key \
    /var/named/zones/example.com.zone \
    /var/named/keys/Kexample.com.+013+54321.key

# Reload
rndc reload example.com
```

### Step 4: Verify Rollback

```bash
# Check NSEC records are back
dig @localhost example.com NSEC +dnssec

# Verify NSEC3PARAM is gone
dig @localhost example.com NSEC3PARAM +short
# Should return nothing
```

## Best Practices

### 1. Use Modern Parameters

Following RFC 9276 recommendations:

```
Algorithm:  1 (SHA-1, only option currently)
Flags:      0 (no opt-out for most zones)
Iterations: 0 (for better performance)
Salt:       Empty/None (for operational simplicity)
```

### 2. Monitor Zone Signing

Set up monitoring for your DNSSEC-signed zone:

```bash
#!/bin/bash
# dnssec-monitor.sh - DNSSEC Health Check Script

ZONE="example.com"
ALERT_EMAIL="admin@example.com"

# Check signature expiration
check_signatures() {
    EARLIEST_EXP=$(dig @localhost $ZONE RRSIG +short | \
        awk '{print $5}' | sort | head -1)

    # Convert to Unix timestamp and compare
    EXP_TS=$(date -d "$EARLIEST_EXP" +%s 2>/dev/null)
    NOW_TS=$(date +%s)
    DAYS_LEFT=$(( ($EXP_TS - $NOW_TS) / 86400 ))

    if [ $DAYS_LEFT -lt 7 ]; then
        echo "WARNING: Signatures expire in $DAYS_LEFT days" | \
            mail -s "DNSSEC Alert: $ZONE" $ALERT_EMAIL
    fi
}

# Check DNSSEC validation
check_validation() {
    AD_FLAG=$(dig @8.8.8.8 $ZONE A | grep "flags:" | grep " ad")
    if [ -z "$AD_FLAG" ]; then
        echo "CRITICAL: DNSSEC validation failing for $ZONE" | \
            mail -s "DNSSEC Alert: $ZONE" $ALERT_EMAIL
    fi
}

check_signatures
check_validation
```

### 3. Document Your Configuration

Maintain documentation of your DNSSEC configuration:

```bash
# Create configuration documentation
cat > /var/named/docs/dnssec-config.txt << EOF
DNSSEC Configuration for example.com
=====================================

Migration Date: $(date)
Previous State: NSEC
Current State: NSEC3

NSEC3 Parameters:
- Algorithm: 1 (SHA-1)
- Flags: 0 (no opt-out)
- Iterations: 0
- Salt: (empty)

Key Information:
- KSK Algorithm: ECDSAP256SHA256
- ZSK Algorithm: ECDSAP256SHA256
- KSK Rollover Schedule: Yearly
- ZSK Rollover Schedule: Monthly

Monitoring:
- Health check script: /usr/local/bin/dnssec-monitor.sh
- Cron schedule: 0 * * * * (hourly)
- Alert email: admin@example.com

Rollback Procedure: See /var/named/docs/nsec3-rollback.md
EOF
```

### 4. Plan for Key Rollovers

Ensure your key rollover procedures work with NSEC3:

```bash
# Test ZSK rollover
rndc dnssec -rollover -key 54321 example.com

# Monitor rollover progress
rndc dnssec -status example.com
```

### 5. Consider NSEC3 Opt-Out Carefully

Only use opt-out if you have many unsigned delegations:

| Zone Type | Recommended Opt-Out Setting |
|-----------|----------------------------|
| Standard domain | Disabled (0) |
| Hosting provider | Consider enabled (1) |
| TLD/Registry | Typically enabled (1) |

## PowerDNS Migration Guide

If you are using PowerDNS instead of BIND, here are the equivalent steps:

### Configure NSEC3 in PowerDNS

```bash
# Using pdnsutil to set NSEC3
pdnsutil set-nsec3 example.com '1 0 0 -' narrow

# Parameters explanation:
# 1 = SHA-1 algorithm
# 0 = no opt-out
# 0 = iterations
# - = empty salt
# narrow = use narrow mode (recommended)
```

### Verify PowerDNS NSEC3

```bash
# Check zone NSEC3 status
pdnsutil show-zone example.com

# Expected output should include:
# Zone has NSEC3 semantics

# Rectify the zone to generate NSEC3 records
pdnsutil rectify-zone example.com
```

### Rollback in PowerDNS

```bash
# Remove NSEC3 and revert to NSEC
pdnsutil unset-nsec3 example.com

# Rectify the zone
pdnsutil rectify-zone example.com
```

## Knot DNS Migration Guide

For Knot DNS users:

### Configure NSEC3 in Knot DNS

Edit your zone configuration in knot.conf:

```yaml
zone:
  - domain: example.com
    storage: /var/lib/knot/zones
    file: example.com.zone
    dnssec-signing: on
    dnssec-policy: nsec3-policy

policy:
  - id: nsec3-policy
    algorithm: ecdsap256sha256
    ksk-lifetime: 365d
    zsk-lifetime: 30d
    nsec3: on
    nsec3-iterations: 0
    nsec3-opt-out: off
    nsec3-salt-length: 0
```

### Apply and Verify

```bash
# Reload configuration
knotc reload

# Check zone status
knotc zone-status example.com

# Force zone signing
knotc zone-sign example.com
```

## Migration Summary Table

| Step | Action | Verification Command |
|------|--------|---------------------|
| 1 | Backup zone | `cp zone.file zone.file.backup` |
| 2 | Verify current DNSSEC | `dig @localhost zone DNSKEY +dnssec` |
| 3 | Plan NSEC3 parameters | Document algorithm, iterations, salt |
| 4 | Update DNS server config | `named-checkconf` |
| 5 | Reload zone | `rndc reload zone` |
| 6 | Verify NSEC3PARAM | `dig @localhost zone NSEC3PARAM` |
| 7 | Test NSEC3 denial | `dig @localhost nonexistent.zone A +dnssec` |
| 8 | Verify no NSEC | `dig @localhost zone NSEC` |
| 9 | Test external validation | `dig @8.8.8.8 zone A +dnssec` |
| 10 | Monitor and document | Run monitoring scripts |

## Quick Reference Commands

```bash
# Check current DNSSEC status
dig @localhost example.com DNSKEY +dnssec +multiline

# Verify NSEC (before migration)
dig @localhost example.com NSEC +dnssec

# Check NSEC3PARAM (after migration)
dig @localhost example.com NSEC3PARAM +short

# Test authenticated denial with NSEC3
dig @localhost nonexistent.example.com A +dnssec

# Verify external validation
dig @8.8.8.8 example.com A +dnssec | grep "flags:"

# Check zone signing status (BIND)
rndc signing -list example.com

# Force re-signing (BIND)
rndc sign example.com

# Check zone NSEC3 status (PowerDNS)
pdnsutil show-zone example.com

# Calculate NSEC3 hash
nsec3hash - 1 0 www.example.com
```

## Conclusion

Migrating from NSEC to NSEC3 is a straightforward process that significantly improves the security of your DNSSEC-signed zones by preventing zone enumeration attacks. The key steps are:

1. Understand your current DNSSEC configuration
2. Plan your NSEC3 parameters following modern recommendations (RFC 9276)
3. Update your DNS server configuration
4. Apply and verify the changes
5. Monitor for any issues

Following modern best practices, use zero iterations and an empty salt for optimal performance while maintaining security. Always test your changes thoroughly before and after migration, and maintain documentation and rollback procedures.

DNSSEC with NSEC3 provides robust protection for your DNS infrastructure, ensuring both data integrity and privacy of your zone contents. Regular monitoring and maintenance will help ensure your DNSSEC deployment remains secure and operational.

## Additional Resources

- RFC 5155: DNS Security (DNSSEC) Hashed Authenticated Denial of Existence
- RFC 9276: Guidance for NSEC3 Parameter Settings
- BIND 9 Administrator Reference Manual
- PowerDNS DNSSEC Documentation
- Knot DNS Documentation
- DNSViz: A DNS visualization tool
- DNSSEC Deployment Guide by ICANN

---

*This guide is part of the OneUptime infrastructure documentation series. For more information about monitoring your DNS infrastructure and ensuring uptime, visit [OneUptime](https://oneuptime.com).*
