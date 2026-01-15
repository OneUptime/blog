# How to Use DNSViz to Visualize and Debug DNSSEC Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNSViz, DNS, Troubleshooting, Security, Visualization

Description: A comprehensive guide to using DNSViz for visualizing DNSSEC trust chains, interpreting authentication graphs, and systematically debugging common DNSSEC validation failures.

---

DNSSEC (Domain Name System Security Extensions) adds cryptographic signatures to DNS records, ensuring that the responses you receive are authentic and haven't been tampered with. It's a critical security layer for any domain - but when it breaks, debugging can feel like navigating a maze blindfolded.

That's where DNSViz comes in. DNSViz is a tool for visualizing the status of a DNS zone, specifically focused on DNSSEC authentication chains. It produces detailed graphs showing exactly how trust flows from the root zone down to your domain, highlighting any breaks in the chain along the way.

This guide will take you from basic DNSViz usage through advanced debugging scenarios, complete with practical examples and interpretation strategies.

---

## What is DNSViz?

DNSViz is an open-source tool developed by Sandia National Laboratories and later maintained by Verisign. It provides:

- **Visual representation** of DNSSEC trust chains
- **Detailed analysis** of zone signing status
- **Error detection** for common DNSSEC misconfigurations
- **Historical analysis** capabilities (on the web version)

You can use DNSViz in three ways:

1. **Web interface** at [dnsviz.net](https://dnsviz.net)
2. **Command-line tools** for local analysis
3. **API** for automated checks

---

## Understanding DNSSEC Basics (Quick Refresher)

Before diving into DNSViz, let's ensure we're on the same page about DNSSEC fundamentals.

### The Chain of Trust

DNSSEC works through a hierarchical chain of trust:

```
Root Zone (.)
    |
    |-- Signs --> .com TLD
                    |
                    |-- Signs --> example.com
                                    |
                                    |-- Signs --> www.example.com
```

Each level signs the public keys of the level below it, creating an unbroken chain from the root to your specific record.

### Key Record Types

| Record Type | Purpose |
|-------------|---------|
| **DNSKEY** | Contains the public key used to verify signatures |
| **RRSIG** | Contains the cryptographic signature for a record set |
| **DS** | Delegation Signer - links parent zone to child's DNSKEY |
| **NSEC/NSEC3** | Proves non-existence of records (authenticated denial) |

### Key Types

- **KSK (Key Signing Key)**: Signs the DNSKEY records; its hash is published as DS in parent zone
- **ZSK (Zone Signing Key)**: Signs all other records in the zone

---

## Getting Started with DNSViz Web Interface

The easiest way to start is with the web interface at [https://dnsviz.net](https://dnsviz.net).

### Running Your First Analysis

1. Navigate to dnsviz.net
2. Enter your domain name (e.g., `example.com`)
3. Click "Analyze"
4. Wait for the analysis to complete (usually 10-60 seconds)

The tool will query multiple DNS resolvers and build a comprehensive picture of your domain's DNSSEC status.

### Reading the Basic Output

DNSViz produces a graph with several elements:

- **Green elements**: Properly validated and secure
- **Yellow elements**: Warnings or potential issues
- **Red elements**: Errors or validation failures
- **Gray elements**: Insecure (no DNSSEC) but not necessarily wrong

---

## Installing DNSViz Command-Line Tools

For deeper analysis and automation, install the CLI tools.

### On Debian/Ubuntu

```bash
sudo apt update
sudo apt install dnsviz
```

### On macOS (using Homebrew)

```bash
brew install dnsviz
```

### On RHEL/CentOS/Rocky Linux

```bash
sudo dnf install epel-release
sudo dnf install dnsviz
```

### Using pip (Python)

```bash
pip install dnsviz
```

### Verifying Installation

```bash
dnsviz --version
```

---

## DNSViz Command-Line Usage

The CLI provides three main commands that work together in a pipeline.

### dnsviz probe - Collecting DNS Data

The `probe` command queries DNS servers and collects all DNSSEC-related information.

```bash
# Basic probe
dnsviz probe example.com > example.json

# Probe with specific resolver
dnsviz probe -s 8.8.8.8 example.com > example.json

# Probe multiple domains
dnsviz probe example.com example.org > combined.json

# Probe with debug output
dnsviz probe -d example.com > example.json

# Include authoritative server queries
dnsviz probe -A example.com > example.json
```

#### Probe Options Explained

| Option | Description |
|--------|-------------|
| `-s SERVER` | Use specific DNS resolver |
| `-A` | Query authoritative servers directly |
| `-d` | Enable debug output |
| `-t THREADS` | Number of concurrent queries |
| `-a ALGORITHM` | Specific digest algorithm to use |
| `-D DLVKEY` | Use DLV (deprecated but sometimes useful) |

### dnsviz grok - Analyzing the Data

The `grok` command analyzes the probed data and identifies issues.

```bash
# Analyze and output to JSON
dnsviz grok < example.json > analysis.json

# Output as text (human-readable)
dnsviz grok -o text < example.json

# Show specific trust anchor
dnsviz grok -t /path/to/trust-anchor.key < example.json
```

### dnsviz graph - Creating Visualizations

The `graph` command creates visual representations.

```bash
# Create PNG image
dnsviz graph -Tpng < example.json > example.png

# Create SVG (scalable, better for docs)
dnsviz graph -Tsvg < example.json > example.svg

# Create HTML (interactive)
dnsviz graph -Thtml < example.json > example.html

# Create PDF
dnsviz graph -Tpdf < example.json > example.pdf

# Show only errors
dnsviz graph -O -Tpng < example.json > errors.png
```

### Complete Pipeline Example

```bash
# Full analysis pipeline
dnsviz probe example.com | dnsviz grok | dnsviz graph -Tpng > result.png

# With intermediate files for debugging
dnsviz probe example.com > probe.json
dnsviz grok < probe.json > grok.json
dnsviz graph -Thtml < probe.json > graph.html
```

---

## Interpreting DNSViz Output

Understanding the visual output is crucial for effective debugging.

### Node Types

**Zone Nodes (Boxes)**
- Represent DNS zones (like `example.com`, `com`, root)
- Contains information about zone keys and signatures

**RRset Nodes (Rounded Boxes)**
- Represent specific record sets
- Shows the records and their signatures

### Edge Types

**DS Edges (from parent to child)**
- Shows delegation signer relationship
- Connects parent zone to child's DNSKEY

**DNSKEY Edges**
- Shows which key signed which records
- Connects DNSKEY to signed RRsets

### Color Coding in Detail

#### Green (Secure/Valid)

```
GREEN SOLID LINE: Valid signature, complete trust chain
GREEN DASHED LINE: Valid but with minor warnings
GREEN BOX: Zone is properly signed and validates
```

- The signature is cryptographically valid
- The chain of trust is complete
- All algorithms match expected values

#### Yellow (Warning)

```
YELLOW LINE: Signature valid but has warnings
YELLOW BOX: Zone has potential issues
```

Common warnings include:
- Signature expiring soon
- Algorithm considered weak
- TTL inconsistencies

#### Red (Error)

```
RED LINE: Signature invalid or broken trust
RED BOX: Zone has validation failures
RED X: Broken chain of trust
```

Critical errors include:
- Invalid signature
- Missing DS record
- Expired signature
- Algorithm mismatch

#### Gray (Insecure)

```
GRAY LINE: No DNSSEC protection
GRAY BOX: Zone not signed
```

This isn't necessarily an error - many zones legitimately don't use DNSSEC.

---

## Common DNSSEC Issues and How DNSViz Reveals Them

### Issue 1: Missing DS Record at Parent

**Symptoms in DNSViz:**
- Red or gray line between parent and child zone
- Message: "No DS records found at parent"
- Child zone shows as "insecure island"

**What it looks like:**

```
com (green)
    |
    X-- No DS record
    |
example.com (gray/red - no trust anchor)
```

**Root Cause:**
The DS record was never published at the parent zone, or it was removed.

**Resolution:**
1. Generate DS record from your DNSKEY
2. Submit DS record to your registrar
3. Wait for parent zone update (can take 24-48 hours)

```bash
# Generate DS record from DNSKEY
dig +dnssec DNSKEY example.com | dnssec-dsfromkey -2 -f - example.com
```

### Issue 2: DS Record Mismatch

**Symptoms in DNSViz:**
- Red line between DS and DNSKEY
- Message: "DS record does not match any DNSKEY"
- Shows both the DS digest and available DNSKEYs

**Common Causes:**
- Key rollover incomplete
- Wrong key submitted to registrar
- Algorithm mismatch between DS and DNSKEY

**Resolution:**
1. Compare DS at parent with your current DNSKEYs
2. If rolling keys, complete the rollover properly
3. Update DS at registrar to match current KSK

```bash
# Check current DS at parent
dig +short DS example.com

# Check your DNSKEYs
dig +short DNSKEY example.com

# Generate what DS should be
dig DNSKEY example.com | dnssec-dsfromkey -2 -f - example.com
```

### Issue 3: Expired Signatures

**Symptoms in DNSViz:**
- Red RRSIG nodes
- Message: "Signature expired on [date]"
- Timestamp shows past date

**Common Causes:**
- DNSSEC signing daemon stopped
- Time synchronization issues
- Zone not being resigned

**Resolution:**
1. Check your signing infrastructure
2. Verify NTP is working
3. Re-sign the zone

```bash
# Check signature expiration
dig +dnssec example.com | grep RRSIG

# Output shows inception and expiration times
# RRSIG A 13 2 300 20260215120000 20260115120000 12345 example.com. [signature]
#                    ^expiration    ^inception
```

### Issue 4: Algorithm Mismatch

**Symptoms in DNSViz:**
- Red lines with algorithm warnings
- Message: "Algorithm X not supported" or "Algorithm mismatch"
- Different algorithms shown at different levels

**Common Causes:**
- Using deprecated algorithms (like DSA or RSASHA1)
- Resolver doesn't support newer algorithms
- Mixed algorithms without proper handling

**Resolution:**
1. Use widely supported algorithms (ECDSAP256SHA256 - Algorithm 13)
2. If migrating algorithms, follow RFC 6781 guidelines
3. Ensure all records use consistent algorithms

### Issue 5: Missing NSEC/NSEC3 Records

**Symptoms in DNSViz:**
- Warnings about authenticated denial of existence
- Message: "No NSEC/NSEC3 proof for [name]"
- Incomplete zone signing

**Common Causes:**
- Zone not fully signed
- NSEC3 parameters misconfigured
- Dynamic zone update issues

**Resolution:**
1. Ensure complete zone signing
2. Verify NSEC3 chain integrity
3. Check for orphaned NSEC3 records

### Issue 6: Trust Anchor Issues

**Symptoms in DNSViz:**
- Red root zone
- Message: "Trust anchor not found" or "Trust anchor expired"
- Entire chain shows as insecure

**Common Causes:**
- Root key rollover not applied
- Resolver using outdated trust anchor
- Custom trust anchor misconfigured

**Resolution:**
1. Update root trust anchor (root-anchors.xml)
2. Use RFC 5011 automated trust anchor updates
3. Verify resolver configuration

```bash
# Check current root trust anchor
dig +dnssec . DNSKEY | grep 257

# Verify against IANA trust anchor
curl -s https://data.iana.org/root-anchors/root-anchors.xml
```

---

## Advanced DNSViz Techniques

### Analyzing Specific Record Types

```bash
# Analyze specific RRtype
dnsviz probe -R A,AAAA,MX example.com > specific.json

# Focus on mail-related records
dnsviz probe -R MX,TXT example.com | dnsviz graph -Tpng > mail.png
```

### Comparing Historical States

The web interface maintains historical data:

1. Run analysis at time T1
2. Make changes to zone
3. Run analysis at time T2
4. Compare graphs side by side

For CLI, save probe outputs with timestamps:

```bash
# Save timestamped analyses
dnsviz probe example.com > "example-$(date +%Y%m%d-%H%M%S).json"
```

### Batch Analysis of Multiple Domains

```bash
#!/bin/bash
# analyze_domains.sh

DOMAINS="example.com example.org example.net"
OUTPUT_DIR="./dnsviz-results"

mkdir -p "$OUTPUT_DIR"

for domain in $DOMAINS; do
    echo "Analyzing $domain..."
    dnsviz probe "$domain" > "$OUTPUT_DIR/$domain.json"
    dnsviz graph -Tpng < "$OUTPUT_DIR/$domain.json" > "$OUTPUT_DIR/$domain.png"
    dnsviz grok -o text < "$OUTPUT_DIR/$domain.json" > "$OUTPUT_DIR/$domain-analysis.txt"
done

echo "Analysis complete. Results in $OUTPUT_DIR"
```

### Using Custom Resolvers

```bash
# Test against multiple resolvers
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    echo "Testing with $resolver"
    dnsviz probe -s "$resolver" example.com | dnsviz grok -o text
done
```

### Debugging Resolution Paths

```bash
# Trace full resolution path with debug
dnsviz probe -d -A example.com 2>&1 | tee debug.log

# This shows:
# - Which servers were queried
# - Response times
# - Any network issues
```

---

## Integrating DNSViz into Your Workflow

### Automated DNSSEC Monitoring

Create a monitoring script:

```bash
#!/bin/bash
# dnssec_monitor.sh

DOMAIN="example.com"
ALERT_EMAIL="admin@example.com"

# Run analysis
OUTPUT=$(dnsviz probe "$DOMAIN" | dnsviz grok -o text 2>&1)

# Check for errors
if echo "$OUTPUT" | grep -qi "error\|invalid\|expired"; then
    echo "DNSSEC issues detected for $DOMAIN"
    echo "$OUTPUT" | mail -s "DNSSEC Alert: $DOMAIN" "$ALERT_EMAIL"
    exit 1
fi

echo "DNSSEC validation passed for $DOMAIN"
exit 0
```

### Pre-Change Validation

Before making DNS changes:

```bash
#!/bin/bash
# pre_change_check.sh

DOMAIN=$1

echo "=== Pre-change DNSSEC status ==="
dnsviz probe "$DOMAIN" > pre-change.json
dnsviz grok -o text < pre-change.json

# Make your changes here

echo "=== Post-change DNSSEC status ==="
dnsviz probe "$DOMAIN" > post-change.json
dnsviz grok -o text < post-change.json

# Compare
echo "=== Comparison ==="
diff <(dnsviz grok -o text < pre-change.json) <(dnsviz grok -o text < post-change.json)
```

### Key Rollover Monitoring

```bash
#!/bin/bash
# monitor_key_rollover.sh

DOMAIN=$1
STATE_FILE="/var/lib/dnsviz/${DOMAIN}_keys.txt"

# Get current keys
CURRENT_KEYS=$(dig +short DNSKEY "$DOMAIN" | sort)

# Load previous state
if [ -f "$STATE_FILE" ]; then
    PREVIOUS_KEYS=$(cat "$STATE_FILE")

    if [ "$CURRENT_KEYS" != "$PREVIOUS_KEYS" ]; then
        echo "DNSKEY change detected for $DOMAIN"
        echo "Running DNSViz analysis..."
        dnsviz probe "$DOMAIN" | dnsviz graph -Tpng > "/tmp/${DOMAIN}_keychange.png"
        # Alert team
    fi
fi

# Save current state
echo "$CURRENT_KEYS" > "$STATE_FILE"
```

---

## Troubleshooting Guide by Error Message

### "No valid RRSIGs made by a key at the child"

**Meaning:** The zone is signed but no signatures validate.

**Debugging Steps:**
1. Check that DNSKEY records exist
2. Verify RRSIG inception/expiration times
3. Confirm signing key matches published DNSKEY

```bash
dig +dnssec DNSKEY example.com
dig +dnssec +all example.com
```

### "DS refers to a DNSKEY that does not exist"

**Meaning:** The DS record at the parent points to a key that's not in the child zone.

**Debugging Steps:**
1. List DS records at parent
2. List DNSKEYs at child
3. Generate DS from current DNSKEYs
4. Update parent with correct DS

### "DNSKEY is not found for RRSIG"

**Meaning:** A signature references a key ID that doesn't exist.

**Debugging Steps:**
1. Check key tag in RRSIG
2. List available DNSKEYs
3. May indicate incomplete key rollover

### "RRSIG validity period is in the future"

**Meaning:** Signature inception time hasn't arrived yet.

**Debugging Steps:**
1. Check system time on signing server
2. Verify NTP synchronization
3. Examine RRSIG inception timestamp

### "BOGUS due to signature verification failure"

**Meaning:** The cryptographic signature doesn't verify.

**Debugging Steps:**
1. Re-sign the zone
2. Check for zone file corruption
3. Verify no record modification between signing and serving

---

## Best Practices for DNSSEC Operations

### Regular Validation Schedule

| Check | Frequency | Tool |
|-------|-----------|------|
| Basic validation | Daily | DNSViz automated |
| Full analysis | Weekly | DNSViz with graph |
| Key expiration | Monthly | dig + manual review |
| Algorithm audit | Quarterly | Full security review |

### Signature Lifetime Management

- **Short signatures (1-2 weeks):** More secure but requires reliable re-signing
- **Long signatures (1-3 months):** More tolerant of failures but longer exposure if compromised
- **Recommended:** 2-4 weeks with automated re-signing

### Key Rollover Checklist

1. Generate new key pair
2. Publish new DNSKEY (pre-publish phase)
3. Wait for old DNSKEY to propagate (2x TTL)
4. Sign zone with new key
5. Update DS at parent (if KSK)
6. Wait for DS propagation (2x parent TTL)
7. Remove old key
8. Verify with DNSViz at each step

### Emergency Response Playbook

**DNSSEC Broken - Quick Recovery:**

```bash
# 1. Assess damage
dnsviz probe example.com | dnsviz grok -o text

# 2. If signatures expired, re-sign immediately
# (Commands depend on your DNS software)

# 3. If DS mismatch, contact registrar immediately

# 4. If complete failure, consider emergency DS removal
# (Last resort - makes zone insecure)

# 5. Post-incident: full DNSViz analysis and documentation
```

---

## Summary: DNSViz Error Reference Table

| Error | Severity | Common Cause | First Step |
|-------|----------|--------------|------------|
| Missing DS at parent | High | DS not submitted | Contact registrar |
| DS/DNSKEY mismatch | High | Key rollover incomplete | Compare DS and DNSKEY |
| Expired RRSIG | Critical | Signing daemon stopped | Check signing system |
| Invalid RRSIG | Critical | Key mismatch or corruption | Re-sign zone |
| No NSEC/NSEC3 proof | Medium | Incomplete signing | Re-sign entire zone |
| Algorithm not supported | Medium | Using deprecated algorithm | Migrate to Algorithm 13 |
| Future inception time | Medium | Time sync issues | Fix NTP |
| Trust anchor missing | Critical | Root key outdated | Update trust anchor |
| DNSKEY not found | High | Key removed too early | Check rollover status |
| Zone not signed | Info | DNSSEC not deployed | Consider enabling DNSSEC |

---

## DNSViz Output Symbols Quick Reference

| Symbol | Meaning |
|--------|---------|
| Solid green line | Valid, secure connection |
| Dashed green line | Valid with minor warnings |
| Solid red line | Invalid, broken trust |
| Red X | Critical error, trust chain broken |
| Yellow line | Warning, action recommended |
| Gray line | Insecure (no DNSSEC) |
| Box with lock | Zone is signed |
| Box without lock | Zone is not signed |
| Arrow direction | Trust flows from parent to child |

---

## Additional Resources

### Official Documentation
- DNSViz GitHub: https://github.com/dnsviz/dnsviz
- DNSSEC RFC 4033, 4034, 4035
- DNSSEC Key Rollover RFC 6781

### Testing Domains
- `dnssec-failed.org` - Intentionally broken DNSSEC (for testing)
- `dnssec-deployment.org` - Properly signed reference
- Root zone (.) - Always verify root is green

### Community Tools
- DNSSEC Debugger (Verisign): https://dnssec-debugger.verisignlabs.com
- DNSViz (web): https://dnsviz.net
- Zonemaster: https://zonemaster.net

---

## Conclusion

DNSSEC adds crucial security to your DNS infrastructure, but its complexity can make troubleshooting challenging. DNSViz transforms this complexity into visual, actionable information.

Key takeaways:

1. **Use DNSViz proactively** - Don't wait for an outage to learn how your DNSSEC looks
2. **Understand the colors** - Green is good, red needs immediate attention, yellow needs a plan
3. **Automate monitoring** - Regular checks catch problems before they impact users
4. **Document your baseline** - Know what "healthy" looks like for comparison
5. **Follow the chain** - DNSSEC issues often stem from parent-child relationships

DNSSEC problems are rarely mysteries - they're puzzles with clear visual clues. DNSViz gives you the map to solve them.

---

*Need comprehensive monitoring for your infrastructure, including DNS and DNSSEC? OneUptime provides unified observability with proactive alerting for all your critical services.*
