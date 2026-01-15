# How to Troubleshoot DNSSEC SERVFAIL Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Troubleshooting, Security, Infrastructure, DevOps

Description: A comprehensive guide to diagnosing and resolving DNSSEC SERVFAIL errors that can cause complete DNS resolution failures for your domains.

---

## Introduction

DNSSEC (Domain Name System Security Extensions) adds a layer of security to DNS by enabling DNS responses to be cryptographically verified. While DNSSEC is essential for preventing DNS spoofing and cache poisoning attacks, misconfigurations can lead to SERVFAIL errors that completely break DNS resolution for your domain.

A SERVFAIL response in the context of DNSSEC typically means that the DNS resolver attempted to validate the DNSSEC signatures but encountered an issue that prevented successful validation. Unlike other DNS errors that might return partial information, a DNSSEC validation failure results in a hard failure - the resolver simply refuses to return any answer.

This guide will walk you through understanding DNSSEC SERVFAIL errors, diagnosing their root causes, and implementing effective solutions.

## Understanding DNSSEC and SERVFAIL Errors

### What is DNSSEC?

DNSSEC extends DNS with a chain of trust, similar to SSL/TLS certificates for websites. It works by:

1. **Signing DNS records** with cryptographic signatures (RRSIG records)
2. **Publishing public keys** (DNSKEY records) to verify those signatures
3. **Creating a chain of trust** from the root zone down to your domain through DS (Delegation Signer) records

### Why SERVFAIL Occurs

When a DNSSEC-validating resolver queries a signed zone, it performs these validation steps:

1. Retrieves the DNS records (A, AAAA, MX, etc.)
2. Retrieves the corresponding RRSIG records
3. Retrieves the DNSKEY records for the zone
4. Verifies the RRSIG signatures using the DNSKEY
5. Validates the DNSKEY against the DS record in the parent zone
6. Continues up the chain to the root zone

If any step in this validation process fails, the resolver returns SERVFAIL rather than returning potentially spoofed data.

### Common Causes of DNSSEC SERVFAIL

1. **Expired signatures** - RRSIG records have validity periods
2. **Key rollover issues** - Problems during DNSKEY rotation
3. **DS record mismatch** - DS record doesn't match the current DNSKEY
4. **Missing DNSSEC records** - Incomplete zone signing
5. **Clock synchronization issues** - Server time drift affecting signature validation
6. **Algorithm mismatches** - Resolver doesn't support the signing algorithm
7. **NSEC/NSEC3 problems** - Issues with denial of existence records

## Diagnostic Tools and Commands

### Essential Tools

Before diving into troubleshooting, ensure you have these tools available:

```bash
# Install dig (part of bind-utils/dnsutils)
# On Ubuntu/Debian
sudo apt-get install dnsutils

# On CentOS/RHEL
sudo yum install bind-utils

# On macOS
brew install bind

# Install delv (DNSSEC lookup and validation utility)
# Usually included with bind-utils/dnsutils

# Install drill (alternative to dig with DNSSEC support)
# On Ubuntu/Debian
sudo apt-get install ldnsutils

# On macOS
brew install ldns
```

### Basic DNS Query with DNSSEC Information

```bash
# Basic query showing DNSSEC-related flags
dig example.com +dnssec

# Query with full validation trace
dig example.com +dnssec +multi +trace

# Query specific record types
dig example.com DNSKEY +dnssec
dig example.com DS +dnssec
dig example.com RRSIG +dnssec
```

### Using delv for DNSSEC Validation

The `delv` command is specifically designed for DNSSEC troubleshooting:

```bash
# Basic DNSSEC validation
delv example.com

# Verbose output showing validation chain
delv example.com +vtrace

# Check specific record type
delv example.com A +vtrace

# Use a specific resolver
delv @8.8.8.8 example.com +vtrace

# Root trust anchor validation
delv example.com +root=/etc/bind/bind.keys
```

### Using drill for DNSSEC Analysis

```bash
# Basic DNSSEC query
drill -D example.com

# Trace the delegation path with DNSSEC
drill -TD example.com

# Show the chain of trust
drill -S example.com

# Verbose DNSSEC chase
drill -DT example.com
```

## Step-by-Step Troubleshooting Process

### Step 1: Confirm the SERVFAIL Error

First, verify that you're actually experiencing a DNSSEC-related SERVFAIL:

```bash
# Query with DNSSEC validation
dig example.com +dnssec
```

Expected output for a SERVFAIL:

```
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1
```

Now test without DNSSEC validation using a non-validating resolver or the CD (Checking Disabled) flag:

```bash
# Disable DNSSEC validation
dig example.com +cd

# Or use a non-validating resolver
dig @4.2.2.2 example.com
```

If the query succeeds with `+cd` but fails without it, you have a DNSSEC validation issue.

### Step 2: Check DNSSEC Record Presence

Verify all required DNSSEC records exist:

```bash
# Check for DNSKEY records
dig example.com DNSKEY +short

# Check for DS records at the parent zone
dig example.com DS +short

# Check for RRSIG records
dig example.com RRSIG +short

# Check NSEC/NSEC3 records
dig example.com NSEC +dnssec
dig example.com NSEC3PARAM +short
```

### Step 3: Validate the Chain of Trust

Use delv to trace the validation chain:

```bash
delv example.com +vtrace +rtrace
```

Look for error messages like:

- `resolution failed: SERVFAIL`
- `validation failed: no valid signature found`
- `validation failed: verify failed`
- `validation failed: key not found`

### Step 4: Check Signature Expiration

RRSIG records have inception and expiration times. Check if signatures are valid:

```bash
# View RRSIG details
dig example.com RRSIG +multi

# Look for the signature validity period
# Output includes: inception and expiration dates
```

Example RRSIG output:

```
example.com.    3600 IN RRSIG A 13 2 3600 (
                20260215000000 20260115000000 12345 example.com.
                ABCDEF123456... )
```

The format is: `expiration inception keyid signer signature`

Verify the current time falls within this window:

```bash
# Check current system time
date -u

# Compare with RRSIG times
# Format: YYYYMMDDHHMMSS
```

### Step 5: Verify DS Record Matches DNSKEY

The DS record in the parent zone must match a DNSKEY in your zone:

```bash
# Get the DS record from parent zone
dig example.com DS @a.gtld-servers.net +short

# Get DNSKEY records and generate DS
dig example.com DNSKEY +short | dnssec-dsfromkey -f - example.com
```

Compare the output. The DS record should match one of the generated DS records.

### Step 6: Check Algorithm Support

Verify the resolver supports your signing algorithm:

```bash
# Check the algorithm number in DNSKEY
dig example.com DNSKEY +short
# Third field is the algorithm number

# Common algorithms:
# 5 = RSA/SHA-1 (deprecated)
# 7 = RSASHA1-NSEC3-SHA1
# 8 = RSA/SHA-256
# 10 = RSA/SHA-512
# 13 = ECDSA Curve P-256 with SHA-256
# 14 = ECDSA Curve P-384 with SHA-384
# 15 = Ed25519
# 16 = Ed448
```

### Step 7: Analyze NSEC/NSEC3 Records

For negative responses (NXDOMAIN), NSEC/NSEC3 records prove the non-existence of records:

```bash
# Query a non-existent subdomain
dig nonexistent.example.com +dnssec

# Check NSEC3 parameters
dig example.com NSEC3PARAM +short
```

## Common DNSSEC SERVFAIL Scenarios and Solutions

### Scenario 1: Expired RRSIG Signatures

**Symptoms:**
- SERVFAIL on all queries
- `+cd` flag returns valid results
- RRSIG expiration date is in the past

**Diagnosis:**

```bash
# Check RRSIG expiration
dig example.com RRSIG +multi | grep -A2 "RRSIG"
```

**Solution:**

```bash
# For BIND DNS server - resign the zone
rndc sign example.com

# Or reload the zone to trigger automatic re-signing
rndc reload example.com

# For PowerDNS - rectify and re-sign
pdnsutil rectify-zone example.com
pdnsutil secure-zone example.com

# Verify new signatures
dig example.com RRSIG +multi
```

**Prevention:**
- Set up monitoring for RRSIG expiration
- Configure automatic zone re-signing
- Ensure signature validity period is longer than maximum expected outage

### Scenario 2: DS Record Mismatch After Key Rollover

**Symptoms:**
- SERVFAIL after key rollover
- DS record at parent doesn't match DNSKEY
- `delv` shows "key not found" errors

**Diagnosis:**

```bash
# Get current DS from parent
dig example.com DS +short

# Generate DS from current DNSKEY
dig example.com DNSKEY | dnssec-dsfromkey -2 -f - example.com

# Compare the values
```

**Solution:**

```bash
# Generate correct DS record
dig example.com DNSKEY +short | grep "257" | dnssec-dsfromkey -2 -f - example.com

# Update DS record at your registrar
# This is typically done through your registrar's control panel

# Wait for propagation (can take 24-48 hours)
# Monitor with
watch -n 60 "dig example.com DS +short"
```

**Prevention:**
- Follow proper key rollover procedures (RFC 7583)
- Use double-DS method for KSK rollovers
- Monitor DS record synchronization

### Scenario 3: Clock Synchronization Issues

**Symptoms:**
- Intermittent SERVFAIL errors
- Signatures appear valid but fail validation
- Different resolvers give different results

**Diagnosis:**

```bash
# Check system time
date -u
timedatectl status

# Check NTP synchronization
ntpq -p
# or for systemd-timesyncd
timedatectl timesync-status

# Compare with RRSIG times
dig example.com RRSIG +multi
```

**Solution:**

```bash
# Enable and configure NTP
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd

# Or use ntpd
sudo systemctl enable ntpd
sudo systemctl start ntpd

# Force time synchronization
sudo ntpdate pool.ntp.org
# or
sudo timedatectl set-ntp true

# Verify synchronization
timedatectl status
```

**Prevention:**
- Ensure all DNS servers use NTP
- Set reasonable RRSIG validity periods (7-30 days)
- Monitor time drift across infrastructure

### Scenario 4: Missing DNSKEY Records

**Symptoms:**
- DS record exists but no matching DNSKEY
- Zone was accidentally unsigned
- `delv` shows "key not found"

**Diagnosis:**

```bash
# Check for DNSKEY
dig example.com DNSKEY +short

# If empty, check zone file
cat /var/named/example.com.zone | grep DNSKEY
```

**Solution:**

```bash
# For BIND - regenerate keys and sign zone
cd /var/named/keys
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com

# Sign the zone
dnssec-signzone -o example.com example.com.zone

# Reload configuration
rndc reload example.com

# Verify DNSKEY exists
dig example.com DNSKEY +short
```

### Scenario 5: Algorithm Rollover Problems

**Symptoms:**
- SERVFAIL after algorithm change
- Older resolvers fail while newer ones succeed
- Multiple DNSKEY records with different algorithms

**Diagnosis:**

```bash
# Check all DNSKEY algorithms
dig example.com DNSKEY +multi | grep -E "algorithm|DNSKEY"

# Check DS record algorithm
dig example.com DS +short
```

**Solution:**

Follow algorithm rollover procedure:

```bash
# Step 1: Add new algorithm keys alongside old
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com

# Step 2: Publish both sets of keys and signatures
# Update named.conf to include new keys
rndc reload example.com

# Step 3: Wait for TTL expiration

# Step 4: Update DS record at parent with new algorithm

# Step 5: Wait for DS propagation

# Step 6: Remove old algorithm keys
```

### Scenario 6: NSEC3 Opt-Out Issues

**Symptoms:**
- SERVFAIL on some subdomains
- Delegations fail validation
- Insecure delegations not working properly

**Diagnosis:**

```bash
# Check NSEC3PARAM
dig example.com NSEC3PARAM +short

# Check if zone uses opt-out
# Flag 1 indicates opt-out is enabled
```

**Solution:**

```bash
# For BIND - regenerate NSEC3 without opt-out
# In named.conf:
dnssec-policy "standard" {
    nsec3param iterations 0 optout no salt-length 0;
};

# Reload
rndc reload example.com
```

### Scenario 7: Incomplete Zone Transfer

**Symptoms:**
- Secondary servers return SERVFAIL
- Primary server works correctly
- DNSSEC records missing on secondaries

**Diagnosis:**

```bash
# Query primary directly
dig @ns1.example.com example.com DNSKEY +short

# Query secondary directly
dig @ns2.example.com example.com DNSKEY +short

# Check zone transfer
dig @ns1.example.com example.com AXFR
```

**Solution:**

```bash
# On primary - ensure DNSSEC records are included in transfer
# Check named.conf
zone "example.com" {
    type master;
    file "example.com.zone.signed";
    allow-transfer { secondary-servers; };
};

# Force zone transfer on secondary
rndc retransfer example.com

# Or restart secondary
systemctl restart named

# Verify records on secondary
dig @ns2.example.com example.com DNSKEY +short
```

## Advanced Debugging Techniques

### Using DNSViz for Visualization

DNSViz is an excellent online tool for visualizing DNSSEC validation:

```bash
# Generate DNSViz compatible output
dig example.com +dnssec +multi > dnsviz-input.txt

# Or use the web interface at https://dnsviz.net/
# Enter your domain and analyze the chain of trust
```

### Packet Capture Analysis

For deep debugging, capture DNS packets:

```bash
# Capture DNS traffic
sudo tcpdump -i any -w dns-capture.pcap port 53

# Analyze with tshark
tshark -r dns-capture.pcap -Y "dns.flags.rcode == 2" -V

# Filter for DNSSEC records
tshark -r dns-capture.pcap -Y "dns.type == 48 or dns.type == 46 or dns.type == 43"
```

### BIND Query Logging

Enable detailed logging for DNSSEC validation:

```bash
# Add to named.conf
logging {
    channel dnssec_log {
        file "/var/log/named/dnssec.log" versions 3 size 5m;
        severity debug 3;
        print-time yes;
        print-severity yes;
        print-category yes;
    };
    category dnssec { dnssec_log; };
    category resolver { dnssec_log; };
};

# Reload configuration
rndc reconfig

# Monitor the log
tail -f /var/log/named/dnssec.log
```

### Using Unbound for Debugging

Unbound's logging provides detailed DNSSEC validation information:

```bash
# Add to unbound.conf
server:
    verbosity: 2
    val-log-level: 2
    log-queries: yes
    log-replies: yes
    logfile: "/var/log/unbound/unbound.log"

# Restart unbound
systemctl restart unbound

# Monitor logs
tail -f /var/log/unbound/unbound.log
```

## Monitoring and Prevention

### Setting Up DNSSEC Monitoring

Create a monitoring script:

```bash
#!/bin/bash
# dnssec-monitor.sh

DOMAIN=$1
ALERT_EMAIL="admin@example.com"

# Function to check DNSSEC status
check_dnssec() {
    local result=$(delv $DOMAIN 2>&1)

    if echo "$result" | grep -q "fully validated"; then
        return 0
    else
        return 1
    fi
}

# Function to check RRSIG expiration
check_expiration() {
    local expiry=$(dig $DOMAIN RRSIG +short | head -1 | awk '{print $5}')
    local expiry_epoch=$(date -d "${expiry:0:4}-${expiry:4:2}-${expiry:6:2}" +%s 2>/dev/null)
    local now_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))

    echo $days_until_expiry
}

# Main monitoring logic
if ! check_dnssec; then
    echo "CRITICAL: DNSSEC validation failed for $DOMAIN" | \
        mail -s "DNSSEC Alert: $DOMAIN" $ALERT_EMAIL
fi

days=$(check_expiration)
if [ "$days" -lt 7 ]; then
    echo "WARNING: DNSSEC signatures for $DOMAIN expire in $days days" | \
        mail -s "DNSSEC Expiration Warning: $DOMAIN" $ALERT_EMAIL
fi
```

### Prometheus Metrics for DNSSEC

```yaml
# prometheus.yml - Add DNSSEC monitoring
scrape_configs:
  - job_name: 'dnssec'
    static_configs:
      - targets: ['localhost:9153']
    metrics_path: /probe
    params:
      module: [dns_dnssec]
```

### OneUptime Integration

You can use OneUptime to monitor your DNSSEC health:

1. Create a synthetic monitor that runs the validation check
2. Set up alerts for SERVFAIL responses
3. Monitor RRSIG expiration dates
4. Track DS record synchronization status

## Best Practices for DNSSEC Management

### Key Management

1. **Use appropriate key sizes:**
   - RSA: minimum 2048 bits
   - ECDSA: P-256 or P-384
   - Ed25519: recommended for new deployments

2. **Implement key rollover schedule:**
   - ZSK: every 1-3 months
   - KSK: every 1-2 years

3. **Store keys securely:**
   - Use hardware security modules (HSM) for KSKs
   - Implement proper access controls
   - Maintain key backups

### Signature Management

1. **Set appropriate signature validity:**
   - Minimum: 1 week
   - Recommended: 2-4 weeks
   - Maximum: 3 months

2. **Re-sign before expiration:**
   - Automate re-signing process
   - Set re-sign interval to half of validity period

3. **Monitor signature health:**
   - Alert when signatures are within 7 days of expiration
   - Implement automated re-signing on alerts

### Testing Changes

Before making DNSSEC changes:

```bash
# Test in a staging environment first
dig @staging-ns.example.com example.com +dnssec

# Use zonecheck tools
named-checkzone example.com example.com.zone.signed

# Validate DNSSEC configuration
dnssec-verify -o example.com example.com.zone.signed
```

## Troubleshooting Quick Reference

### Essential Commands Summary

```bash
# Quick SERVFAIL diagnosis
dig example.com                    # Basic query
dig example.com +cd               # Query without DNSSEC validation
dig example.com +dnssec           # Query with DNSSEC
delv example.com                  # Validate DNSSEC
delv example.com +vtrace          # Verbose validation trace

# Check DNSSEC records
dig example.com DNSKEY +short     # Get DNSKEY records
dig example.com DS +short         # Get DS records
dig example.com RRSIG +multi      # Get signatures with details

# Verify chain of trust
drill -S example.com              # Chase DNSSEC chain
dig example.com +dnssec +trace    # Trace with DNSSEC

# Generate DS from DNSKEY
dig example.com DNSKEY | dnssec-dsfromkey -2 -f - example.com
```

### Common Error Messages and Meanings

| Error Message | Meaning | Likely Cause |
|--------------|---------|--------------|
| `no valid signature found` | RRSIG validation failed | Expired signature or wrong key |
| `key not found` | DS doesn't match DNSKEY | Key rollover issue |
| `verify failed` | Cryptographic verification failed | Corrupted signature |
| `algorithm not supported` | Unknown signing algorithm | Resolver doesn't support algorithm |
| `too many iterations` | NSEC3 iterations too high | Security setting too aggressive |
| `no DNSKEY` | Missing DNSKEY record | Zone not properly signed |
| `bad cache hit` | Cached negative response | Previous failure cached |

## Summary Table: DNSSEC SERVFAIL Troubleshooting

| Issue | Symptoms | Diagnosis Command | Solution |
|-------|----------|-------------------|----------|
| Expired RRSIG | All queries SERVFAIL, `+cd` works | `dig domain RRSIG +multi` | Re-sign zone |
| DS/DNSKEY mismatch | SERVFAIL after key change | `dnssec-dsfromkey` comparison | Update DS at registrar |
| Clock drift | Intermittent failures | `date -u` + `timedatectl` | Configure NTP |
| Missing DNSKEY | No DNSKEY in response | `dig domain DNSKEY +short` | Sign zone, publish keys |
| Algorithm issue | Fails on some resolvers | Check algorithm numbers | Algorithm rollover |
| NSEC3 problems | Delegation failures | `dig domain NSEC3PARAM` | Reconfigure NSEC3 |
| Zone transfer issue | Secondary SERVFAIL | Compare primary/secondary | Force retransfer |
| Broken chain | Root to domain failure | `delv +vtrace` | Fix each broken link |

## Conclusion

DNSSEC SERVFAIL errors can be challenging to diagnose because they result from cryptographic validation failures that aren't immediately obvious. The key to successful troubleshooting is:

1. **Confirm it's a DNSSEC issue** using the `+cd` flag
2. **Identify the specific failure point** using `delv +vtrace`
3. **Check the basics** - signatures, keys, and DS records
4. **Verify time synchronization** across all systems
5. **Follow proper key management procedures** to prevent future issues

By implementing proper monitoring, following best practices for key management, and maintaining automated re-signing processes, you can prevent most DNSSEC-related outages before they impact your users.

Remember that DNSSEC is designed to fail closed - when validation fails, no answer is returned. While this provides strong security guarantees, it also means that configuration mistakes have severe consequences. Always test changes in a staging environment and have a rollback plan before making DNSSEC modifications in production.

## Additional Resources

- RFC 4033-4035: DNSSEC Protocol Specification
- RFC 7583: DNSSEC Key Rollover Timing Considerations
- RFC 8624: Algorithm Implementation Requirements and Usage Guidance
- ICANN DNSSEC Deployment Guide
- DNSViz (https://dnsviz.net/) - Visual DNSSEC analyzer
- Verisign DNSSEC Debugger - Online validation tool

For monitoring your DNS infrastructure and DNSSEC health, consider using OneUptime's comprehensive monitoring platform to receive proactive alerts before issues impact your users.
