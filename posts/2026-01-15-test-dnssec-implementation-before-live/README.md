# How to Test Your DNSSEC Implementation Before Going Live

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, Testing, DNS, Security, QA, DevOps

Description: A comprehensive guide to validating your DNSSEC configuration using industry-standard tools and procedures to prevent outages before enabling signature validation in production.

---

DNSSEC (Domain Name System Security Extensions) protects your users from DNS spoofing and cache poisoning attacks by cryptographically signing DNS records. But a misconfigured DNSSEC deployment can take your entire domain offline. Unlike most security features where a mistake causes degraded security, a DNSSEC mistake causes complete service unavailability.

This guide covers the essential testing procedures, validation tools, and common pitfalls to check before you flip the switch on DNSSEC in production.

## Why DNSSEC Testing Matters

When DNSSEC validation fails, resolvers that enforce DNSSEC will return `SERVFAIL` instead of your DNS records. This means:

- Your website becomes unreachable
- Email delivery fails
- APIs return connection errors
- Mobile apps stop working

The failure is silent from your server's perspective - your infrastructure is healthy, but nobody can reach it. This makes DNSSEC failures particularly insidious during incident response.

## Understanding DNSSEC Components

Before testing, understand what you are validating:

### Key Types

| Key Type | Purpose | Rotation Frequency |
|----------|---------|-------------------|
| KSK (Key Signing Key) | Signs the DNSKEY RRset | Annually or less |
| ZSK (Zone Signing Key) | Signs all other records | Monthly to quarterly |
| DS (Delegation Signer) | Published in parent zone | When KSK changes |

### Record Types

| Record | Description | Where It Lives |
|--------|-------------|----------------|
| DNSKEY | Public keys for the zone | Your authoritative servers |
| RRSIG | Signatures for each RRset | Your authoritative servers |
| DS | Hash of child's KSK | Parent zone (registrar) |
| NSEC/NSEC3 | Authenticated denial of existence | Your authoritative servers |

## Pre-Deployment Testing Checklist

### 1. Zone Signing Verification

First, verify your zone is properly signed:

```bash
# Check if DNSKEY records exist
dig @your-nameserver.com example.com DNSKEY +dnssec +multi

# Check for RRSIG records on your A record
dig @your-nameserver.com example.com A +dnssec +multi

# Check for RRSIG records on your MX record
dig @your-nameserver.com example.com MX +dnssec +multi
```

Expected output should include:
- At least two DNSKEY records (KSK and ZSK)
- RRSIG records with valid timestamps
- Flags: 256 for ZSK, 257 for KSK

### 2. Signature Expiration Check

DNSSEC signatures have expiration dates. Expired signatures cause validation failures.

```bash
# Extract signature expiration dates
dig @your-nameserver.com example.com A +dnssec +short

# More detailed view
dig @your-nameserver.com example.com A +dnssec | grep RRSIG
```

The RRSIG record format includes:
```
RRSIG A 13 2 300 20260215120000 20260115120000 12345 example.com. [signature]
                 ^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^
                 Expiration     Inception
```

Verify:
- Inception date is in the past
- Expiration date is sufficiently in the future (at least 7-14 days)
- Your re-signing automation is working

### 3. Key Algorithm Compatibility

Check that your chosen algorithm is widely supported:

```bash
# View the algorithm number in your DNSKEY
dig example.com DNSKEY +short | awk '{print $3}'
```

| Algorithm | Number | Support Level | Recommendation |
|-----------|--------|---------------|----------------|
| RSA/SHA-256 | 8 | Universal | Good default |
| RSA/SHA-512 | 10 | Universal | Good default |
| ECDSA P-256 | 13 | Very High | Recommended |
| ECDSA P-384 | 14 | Very High | Recommended |
| Ed25519 | 15 | Growing | Future-proof |
| Ed448 | 16 | Limited | Avoid for now |

## Essential Testing Tools

### DNSViz - Visual Chain of Trust Analysis

DNSViz is the gold standard for DNSSEC visualization and testing.

Visit [https://dnsviz.net](https://dnsviz.net) and enter your domain. The tool will:
- Crawl the entire chain of trust from root to your zone
- Visualize each delegation point
- Highlight errors in red, warnings in yellow
- Show signature validity periods

Command line version:

```bash
# Install DNSViz
pip install dnsviz

# Probe your domain
dnsviz probe example.com

# Generate analysis
dnsviz probe example.com | dnsviz graph -T png -o example-dnssec.png

# Get detailed text output
dnsviz probe example.com | dnsviz print
```

| Color | Meaning | Action |
|-------|---------|--------|
| Green | Valid and secure | None needed |
| Yellow | Warning (e.g., expiring soon) | Plan remediation |
| Red | Error (validation will fail) | Fix before going live |
| Gray | Insecure (no DNSSEC) | Expected for unsigned zones |

### Verisign DNSSEC Debugger

Verisign provides a comprehensive debugger at [https://dnssec-debugger.verisignlabs.com](https://dnssec-debugger.verisignlabs.com).

This tool checks:
- DS record presence at parent
- DNSKEY record validity
- Signature chain integrity
- Algorithm consistency
- Key tag matching

### dig with DNSSEC Flags

The `dig` command is your primary CLI tool for DNSSEC testing.

```bash
# Basic DNSSEC query
dig example.com A +dnssec

# Show only answer section with DNSSEC
dig example.com A +dnssec +noall +answer

# Multi-line output for readability
dig example.com DNSKEY +dnssec +multi

# Check AD (Authenticated Data) flag
dig example.com A +dnssec | grep flags
```

The AD flag in the response indicates the resolver validated DNSSEC:
```
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
                   ^^
                   Authenticated Data flag
```

### delv - DNSSEC Lookup and Validation

`delv` (BIND's replacement for `dig +sigchase`) performs full validation:

```bash
# Validate DNSSEC chain
delv example.com A

# Verbose validation output
delv example.com A +vtrace
```

Expected successful output:
```
; fully validated
example.com.        300    IN    A    192.0.2.1
```

Failed validation shows:
```
;; resolution failed: SERVFAIL
```

### drill - LDNS DNSSEC Tool

`drill` from the ldns package provides detailed DNSSEC tracing:

```bash
# Install on various systems
# macOS: brew install ldns
# Ubuntu/Debian: apt install ldnsutils
# RHEL/CentOS: yum install ldns

# Chase the DNSSEC chain
drill -S example.com

# Trace from root
drill -TD example.com
```

## Step-by-Step Testing Procedure

### Step 1: Test Zone Signing (Before DS Publication)

At this stage, your zone is signed but the DS record is not yet at the parent. This is a safe state.

```bash
# Verify DNSKEY records exist
dig @ns1.example.com example.com DNSKEY +short

# Should return something like:
# 257 3 13 oJMRESz5E4... (KSK)
# 256 3 13 2b3fL8jM9K... (ZSK)

# Verify RRSIG records exist for A record
dig @ns1.example.com example.com A +dnssec +short
```

### Step 2: Generate and Verify DS Record

Before uploading the DS record, verify it is correct:

```bash
# Generate DS record from DNSKEY (using dnssec-dsfromkey from BIND)
dig example.com DNSKEY | dnssec-dsfromkey -2 -f - example.com

# Output format:
# example.com. IN DS 12345 13 2 49FD46E6C4B45C55D4AC...
```

| Field | Example | Description |
|-------|---------|-------------|
| Key Tag | 12345 | Matches KSK key tag |
| Algorithm | 13 | Must match DNSKEY algorithm |
| Digest Type | 2 | SHA-256 (recommended) |
| Digest | 49FD46... | Hash of KSK public key |

### Step 3: Validate the Complete Chain

Use DNSViz to validate the complete chain before going live:

```bash
# Full validation
dnsviz probe example.com | dnsviz print

# Look for any errors
dnsviz probe example.com | dnsviz print | grep -E "(ERROR|WARNING)"
```

### Step 4: Test from Multiple Locations

DNSSEC validation can vary by resolver. Test from multiple vantage points:

```bash
# Google Public DNS (DNSSEC-validating)
dig @8.8.8.8 example.com A +dnssec

# Cloudflare DNS (DNSSEC-validating)
dig @1.1.1.1 example.com A +dnssec

# Quad9 (DNSSEC-validating)
dig @9.9.9.9 example.com A +dnssec

# Check AD flag is set in all responses
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo "Testing $resolver:"
    dig @$resolver example.com A +dnssec | grep -E "(flags|status)"
done
```

### Step 5: Test Negative Responses

DNSSEC must also authenticate that records do NOT exist:

```bash
# Query for a non-existent subdomain
dig @your-nameserver.com nonexistent.example.com A +dnssec

# Should return NSEC or NSEC3 records proving non-existence
```

## Automated Testing Script

```bash
#!/bin/bash
# dnssec-test.sh - Comprehensive DNSSEC testing script

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

echo "=== DNSSEC Testing for $DOMAIN ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

test_check() {
    local name=$1
    local result=$2
    if [ $result -eq 0 ]; then
        echo -e "[${GREEN}PASS${NC}] $name"
    else
        echo -e "[${RED}FAIL${NC}] $name"
    fi
}

# 1. Check DNSKEY records
echo "--- Checking DNSKEY Records ---"
DNSKEY_COUNT=$(dig $DOMAIN DNSKEY +short | wc -l)
test_check "DNSKEY records present" $([ $DNSKEY_COUNT -ge 2 ] && echo 0 || echo 1)

KSK_COUNT=$(dig $DOMAIN DNSKEY +short | grep "^257" | wc -l)
test_check "KSK (flag 257) present" $([ $KSK_COUNT -ge 1 ] && echo 0 || echo 1)

ZSK_COUNT=$(dig $DOMAIN DNSKEY +short | grep "^256" | wc -l)
test_check "ZSK (flag 256) present" $([ $ZSK_COUNT -ge 1 ] && echo 0 || echo 1)

# 2. Check DS record at parent
echo "--- Checking DS Record at Parent ---"
DS_COUNT=$(dig $DOMAIN DS +short | wc -l)
test_check "DS record at parent zone" $([ $DS_COUNT -ge 1 ] && echo 0 || echo 1)

# 3. Check RRSIG records
echo "--- Checking RRSIG Records ---"
for RRTYPE in A MX NS SOA; do
    RRSIG_CHECK=$(dig $DOMAIN $RRTYPE +dnssec | grep -c "RRSIG")
    test_check "RRSIG for $RRTYPE record" $([ $RRSIG_CHECK -ge 1 ] && echo 0 || echo 1)
done

# 4. Validate with multiple resolvers
echo "--- Validating with Public Resolvers ---"
for RESOLVER in 8.8.8.8 1.1.1.1 9.9.9.9; do
    AD_FLAG=$(dig @$RESOLVER $DOMAIN A +dnssec | grep -c "flags:.*ad")
    case $RESOLVER in
        8.8.8.8) RESOLVER_NAME="Google" ;;
        1.1.1.1) RESOLVER_NAME="Cloudflare" ;;
        9.9.9.9) RESOLVER_NAME="Quad9" ;;
    esac
    test_check "Validation via $RESOLVER_NAME ($RESOLVER)" $([ $AD_FLAG -ge 1 ] && echo 0 || echo 1)
done

# 5. Check NSEC/NSEC3
echo "--- Checking Denial of Existence ---"
NSEC3_PARAM=$(dig $DOMAIN NSEC3PARAM +short)
if [ -n "$NSEC3_PARAM" ]; then
    echo "  Using NSEC3 (recommended)"
    test_check "NSEC3PARAM record present" 0
else
    NSEC_TYPE=$(dig $DOMAIN NSEC +short | head -1)
    if [ -n "$NSEC_TYPE" ]; then
        echo "  Using NSEC (zone walking possible)"
        test_check "NSEC record present" 0
    else
        test_check "NSEC/NSEC3 records present" 1
    fi
fi

echo "=== Testing Complete ==="
```

## Common DNSSEC Issues and Solutions

### Issue 1: DS Record Mismatch

**Symptoms:** SERVFAIL from validating resolvers; DNSViz shows "DS digest does not match DNSKEY"

**Diagnosis:**
```bash
# Get DS from parent
dig example.com DS +short

# Get DNSKEY and compute expected DS
dig example.com DNSKEY | dnssec-dsfromkey -2 -f - example.com
```

**Solution:** Update the DS record at your registrar with the correct value.

### Issue 2: Expired Signatures

**Symptoms:** SERVFAIL errors that started at a specific time; signatures show past expiration date

**Diagnosis:**
```bash
dig example.com A +dnssec | grep RRSIG
```

**Solution:** Re-sign the zone immediately and fix your automated re-signing process.

### Issue 3: Missing DNSKEY Records

**Symptoms:** DS record exists but no DNSKEY at authoritative server

**Diagnosis:**
```bash
dig @ns1.example.com example.com DNSKEY +short
```

**Solution:** Ensure zone signing is enabled and verify keys are being published.

### Issue 4: Algorithm Mismatch

**Symptoms:** DS algorithm number does not match DNSKEY algorithm

**Diagnosis:**
```bash
# Get DS algorithm (third field)
dig example.com DS +short | awk '{print $2}'

# Get DNSKEY algorithm (third field)
dig example.com DNSKEY +short | awk '{print $3}'
```

**Solution:** Regenerate DS record with correct algorithm.

### Issue 5: Clock Skew

**Symptoms:** Intermittent validation failures; "Signature not yet valid" errors

**Solution:** Synchronize server clocks with NTP and increase signature validity window.

### Issue 6: Incomplete Zone Transfers

**Symptoms:** Primary server validates, secondary does not

**Diagnosis:**
```bash
for ns in ns1.example.com ns2.example.com; do
    echo "=== $ns ==="
    dig @$ns example.com DNSKEY +short | wc -l
done
```

**Solution:** Ensure secondaries support DNSSEC and verify zone transfers include DNSSEC records.

## Testing DNSSEC Key Rollover

Key rollovers are high-risk operations. Test them thoroughly.

### ZSK Rollover Testing

```bash
# Pre-rollover state
dig example.com DNSKEY +short | wc -l  # Should be 2

# During double-signature rollover
dig example.com DNSKEY +short | wc -l  # Should be 3

# Post-rollover (after old ZSK removal)
dig example.com DNSKEY +short | wc -l  # Should be 2
```

### KSK Rollover Testing

```bash
# Phase 1: Add new KSK to zone
dig example.com DNSKEY +short | grep "^257"  # Should show 2 KSKs

# Phase 2: Update DS at parent
dig example.com DS +short  # Should show new DS

# Phase 3: Validate with new chain
delv example.com A +vtrace

# Phase 4: Remove old KSK (after DS TTL)
dig example.com DNSKEY +short | grep "^257"  # Should show 1 KSK
```

### Rollover Test Timeline

| Phase | Duration | Action | Validation |
|-------|----------|--------|------------|
| 1 | Day 0 | Add new key | Count DNSKEY records |
| 2 | Day 1-7 | Wait for propagation | Check all nameservers |
| 3 | Day 7 | Update DS (KSK only) | Verify at parent |
| 4 | Day 8-14 | Wait for DS TTL | Check multiple resolvers |
| 5 | Day 14 | Remove old key | Final validation |

## Integration with Monitoring

### OneUptime DNSSEC Monitoring

Configure OneUptime to monitor your DNSSEC deployment:

1. **DNS Monitor**: Create a DNS monitor for your domain that checks DNSSEC-enabled resolvers
2. **Alert on SERVFAIL**: Configure alerts when DNS queries return SERVFAIL
3. **Signature Expiry**: Monitor signature expiration dates similar to TLS certificates

## Pre-Go-Live Checklist

### Zone Configuration

- [ ] Zone is signed with valid KSK and ZSK
- [ ] All record types have valid RRSIG signatures
- [ ] NSEC3 is configured (if zone walking is a concern)
- [ ] Signature validity period is at least 14 days
- [ ] Automated re-signing is configured and tested

### Key Management

- [ ] KSK is stored securely (HSM or secure key management)
- [ ] ZSK rotation is automated
- [ ] Key backup and recovery procedures are documented
- [ ] Emergency key rollover procedure is tested

### DS Record

- [ ] DS record is generated from KSK
- [ ] DS uses SHA-256 digest (algorithm 2)
- [ ] DS is ready to upload to registrar
- [ ] Registrar supports DNSSEC DS management

### Validation Testing

- [ ] DNSViz shows green across the entire chain
- [ ] Verisign debugger shows no errors
- [ ] `delv` validates successfully
- [ ] Multiple public resolvers return AD flag
- [ ] Negative queries (NXDOMAIN) validate correctly

### Operational Readiness

- [ ] DNSSEC monitoring is configured
- [ ] Alerting for validation failures is active
- [ ] Signature expiry alerts are configured
- [ ] Runbook for DNSSEC incidents is documented
- [ ] Emergency disable procedure is documented

### Rollback Plan

- [ ] DS record removal procedure is documented
- [ ] Registrar supports quick DS removal
- [ ] Team knows how to disable DNSSEC if needed
- [ ] TTL values allow for quick recovery

## Testing Tools Summary

| Tool | Best For | Installation | Online Option |
|------|----------|--------------|---------------|
| DNSViz | Visual chain analysis | `pip install dnsviz` | dnsviz.net |
| Verisign Debugger | Comprehensive checking | N/A | dnssec-debugger.verisignlabs.com |
| dig | Quick CLI queries | Pre-installed (bind-utils) | N/A |
| delv | Full validation | Pre-installed (bind-utils) | N/A |
| drill | DNSSEC tracing | `apt install ldnsutils` | N/A |
| unbound-host | Resolver validation | `apt install unbound` | N/A |
| DNSSEC Analyzer | Zone analysis | N/A | dnssec-analyzer.verisignlabs.com |
| Zonemaster | Comprehensive DNS testing | `pip install zonemaster` | zonemaster.net |

## Conclusion

DNSSEC testing is not optional - it is essential. A single misconfiguration can take your domain offline for hours while you scramble to understand why resolvers are returning SERVFAIL. The testing procedures in this guide will help you catch issues before they impact production.

Key takeaways:

1. **Test before publishing DS**: Once the DS record is at the parent zone, validation is enforced. Test everything while you can still back out easily.

2. **Use multiple tools**: Different tools catch different issues. DNSViz for visualization, delv for validation, dig for quick checks.

3. **Monitor continuously**: DNSSEC failures often happen during automated key rollovers or when signatures expire. Set up monitoring before you need it.

4. **Have a rollback plan**: Know how to disable DNSSEC quickly. Sometimes the fastest path to recovery is removing the DS record.

5. **Test key rollovers**: The most common DNSSEC outages happen during key rollovers. Practice in staging before doing it in production.

DNSSEC adds genuine security value by preventing DNS spoofing attacks. With proper testing, you can deploy it confidently and keep your domains secure without sacrificing availability.
