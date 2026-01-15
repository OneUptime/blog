# How to Recover from a Compromised DNSSEC Key

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Security, Incident Response, Key Management, DevOps

Description: A comprehensive guide to detecting, responding to, and recovering from a compromised DNSSEC key, including emergency rollover procedures, communication strategies, and prevention measures to protect your domain infrastructure.

---

DNSSEC (Domain Name System Security Extensions) is the cryptographic backbone that protects your domain from cache poisoning, man-in-the-middle attacks, and DNS spoofing. When functioning correctly, it provides an unbroken chain of trust from the root DNS servers down to your authoritative nameservers. But what happens when an attacker gains access to your DNSSEC signing keys?

A compromised DNSSEC key is one of the most serious security incidents a domain operator can face. Unlike a compromised TLS certificate that affects a single service, a DNSSEC key compromise can enable attackers to redirect all traffic for your entire domain to malicious servers while appearing completely legitimate to resolvers worldwide. The stakes are high, and the recovery process requires precision, speed, and careful coordination.

This guide walks you through the complete recovery process, from initial detection to post-incident hardening. Whether you manage DNS for a startup or an enterprise with hundreds of zones, these procedures will help you respond effectively when the worst happens.

## Understanding DNSSEC Key Hierarchy

Before diving into recovery procedures, let us establish a clear understanding of the key hierarchy in DNSSEC. This knowledge is critical for making informed decisions during an incident.

### Key Signing Key (KSK)

The Key Signing Key sits at the top of your zone's trust hierarchy. Its primary purpose is to sign the DNSKEY resource record set, which contains both the KSK and ZSK public keys. The KSK is:

- Typically 2048 or 4096 bits (RSA) or 256/384 bits (ECDSA)
- Rolled infrequently, often annually or less
- Published as a DS (Delegation Signer) record in the parent zone
- The anchor point that resolvers use to validate your zone

A compromised KSK is the more severe scenario because it requires coordination with your parent zone (registrar or TLD operator) to update the DS record.

### Zone Signing Key (ZSK)

The Zone Signing Key handles the day-to-day signing operations. It signs all other resource records in your zone (A, AAAA, MX, TXT, etc.). The ZSK is:

- Usually smaller than the KSK (1024-2048 bits RSA or 256 bits ECDSA)
- Rolled more frequently, typically every 1-3 months
- Not published in the parent zone
- Validated through the KSK signature on the DNSKEY record set

A compromised ZSK is serious but more contained since recovery does not require parent zone coordination.

### Combined Signing Key (CSK)

Some operators use a Combined Signing Key that serves both purposes. While this simplifies key management, it means any compromise has the full impact of a KSK compromise.

## Signs of a Compromised DNSSEC Key

Detection is the first step in any incident response. Here are the warning signs that may indicate your DNSSEC keys have been compromised:

### Unexpected DNSSEC Validation Failures

```bash
# Check DNSSEC validation status
dig +dnssec +multi example.com SOA

# Look for the AD (Authenticated Data) flag
# If validation fails, you'll see SERVFAIL responses from validating resolvers
```

If validating resolvers suddenly start returning SERVFAIL for your domain, but non-validating resolvers work fine, investigate immediately. This could indicate:

- Unauthorized key changes
- RRSIG records signed with unknown keys
- DS record mismatches

### Unauthorized DNS Records

Monitor your zone for records you did not create:

```bash
# Compare current zone against known-good baseline
dig @your-nameserver example.com AXFR > current_zone.txt
diff baseline_zone.txt current_zone.txt
```

Attackers with key access might inject:

- A/AAAA records pointing to malicious IP addresses
- MX records redirecting email
- TXT records for SPF/DKIM manipulation
- NS records for zone delegation hijacking

### DNSKEY Record Anomalies

```bash
# List all DNSKEY records
dig +dnssec example.com DNSKEY

# Verify key IDs match your records
# Look for unexpected key tags (the 5-digit identifier)
```

Check for:

- New DNSKEY records you did not add
- Modified key flags or algorithms
- Keys with unexpected creation times

### Signing Infrastructure Alerts

If you operate your own signing infrastructure, watch for:

- Unexpected HSM access logs
- SSH/API authentication from unknown sources
- Signing service restarts or configuration changes
- Unusual signing request patterns

### Third-Party Reports

Sometimes the first indication comes from outside:

- Abuse reports about phishing from your domain
- Certificate transparency logs showing certificates you did not request
- Security researchers reporting anomalies
- Customer complaints about being redirected to wrong sites

## Immediate Response: The First 30 Minutes

When you confirm or strongly suspect a key compromise, the first 30 minutes are critical. Here is your emergency checklist:

### Step 1: Assemble Your Incident Response Team

Within the first 5 minutes, activate your incident response process:

```
NOTIFY IMMEDIATELY:
- DNS/Infrastructure team lead
- Security team lead
- Communications/PR representative
- Legal counsel (for regulated industries)
- Executive sponsor
```

Establish a war room (physical or virtual) and designate:

- Incident commander
- Technical lead
- Communications lead
- Scribe (for documentation)

### Step 2: Assess the Scope

Determine which keys are affected:

```bash
#!/bin/bash
# Quick DNSSEC status assessment

DOMAIN="example.com"

echo "=== DNSSEC Status Assessment for $DOMAIN ==="
echo ""

# Get current DNSKEY records
echo "Current DNSKEY records:"
dig +short $DOMAIN DNSKEY | while read flags proto algo key; do
    keytag=$(echo "$flags $proto $algo $key" | dnssec-dsfromkey -f - $DOMAIN 2>/dev/null | awk '{print $4}')
    echo "  Key Tag: $keytag | Flags: $flags | Algorithm: $algo"
done

echo ""
echo "DS records in parent zone:"
dig +short $DOMAIN DS

echo ""
echo "Current SOA serial:"
dig +short $DOMAIN SOA | awk '{print $3}'

echo ""
echo "RRSIG validity:"
dig +dnssec $DOMAIN SOA | grep RRSIG | awk '{print "Expires: "$9}'
```

Document:

- Which keys are compromised (KSK, ZSK, or both)
- How many zones are affected
- Current RRSIG expiration times (this is your deadline)
- Any evidence of malicious zone modifications

### Step 3: Preserve Evidence

Before making any changes, capture forensic evidence:

```bash
#!/bin/bash
# Evidence preservation script

DOMAIN="example.com"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EVIDENCE_DIR="incident_evidence_$TIMESTAMP"

mkdir -p $EVIDENCE_DIR

# Capture current DNS state
dig +dnssec +multi $DOMAIN ANY > "$EVIDENCE_DIR/dns_any_record.txt"
dig +dnssec $DOMAIN DNSKEY > "$EVIDENCE_DIR/dnskey_records.txt"
dig $DOMAIN DS > "$EVIDENCE_DIR/ds_records.txt"

# Zone transfer if possible
dig @your-primary-ns $DOMAIN AXFR > "$EVIDENCE_DIR/zone_transfer.txt"

# Capture signing infrastructure logs
cp /var/log/named/dnssec.log "$EVIDENCE_DIR/" 2>/dev/null
cp /var/log/opendnssec/* "$EVIDENCE_DIR/" 2>/dev/null

# Hash everything for integrity
find $EVIDENCE_DIR -type f -exec sha256sum {} \; > "$EVIDENCE_DIR/checksums.sha256"

echo "Evidence preserved in $EVIDENCE_DIR"
```

### Step 4: Revoke Compromised Keys (If Supported)

DNSSEC includes a key revocation mechanism. If your compromised key is a KSK with the REVOKE bit support:

```bash
# Using BIND dnssec-settime to set revoke time
dnssec-settime -R now Kexample.com.+008+12345.key

# The key will be published with flag 385 (257 + 128 REVOKE bit)
# This signals to resolvers that this key should no longer be trusted
```

**Important**: Key revocation is not universally supported and should be used alongside, not instead of, a proper key rollover.

### Step 5: Notify Your Registrar

Contact your domain registrar immediately:

```
REGISTRAR EMERGENCY CONTACT TEMPLATE:

Subject: URGENT - DNSSEC Key Compromise for [domain.com]

We have detected a compromise of our DNSSEC signing keys for [domain.com].

Account: [your account ID]
Domain: [domain.com]
Current DS records: [list them]

We are initiating emergency key rollover and request:
1. Expedited DS record update capability
2. Account security review
3. Confirmation of no unauthorized changes

Emergency contact: [your phone number]

This is a security incident requiring immediate attention.
```

## Emergency Key Rollover Procedures

The key rollover process differs based on which key is compromised and your signing setup. Here are detailed procedures for each scenario.

### Scenario 1: Compromised ZSK Only

This is the more manageable scenario since it does not require parent zone changes.

**Pre-roll timing calculation:**

```bash
# Calculate safe rollover timing
# You need: current signatures to remain valid until new signatures propagate

CURRENT_RRSIG_EXPIRY=$(dig +short example.com SOA | head -1)
ZONE_TTL=3600  # Your zone's maximum TTL
PROPAGATION_TIME=1800  # Conservative propagation estimate

# You have until RRSIG_EXPIRY - ZONE_TTL - PROPAGATION_TIME
```

**Double-signature ZSK rollover (recommended for emergencies):**

```bash
#!/bin/bash
# Emergency ZSK rollover - double signature method

DOMAIN="example.com"
ZONE_FILE="/etc/bind/zones/db.example.com"
KEY_DIR="/etc/bind/keys"

# Step 1: Generate new ZSK
cd $KEY_DIR
dnssec-keygen -a ECDSAP256SHA256 -n ZONE $DOMAIN
NEW_ZSK=$(ls -t K$DOMAIN.+013+*.key | head -1)
NEW_ZSK_ID=$(echo $NEW_ZSK | grep -oP '\+\d+' | tail -1)

echo "Generated new ZSK: $NEW_ZSK (ID: $NEW_ZSK_ID)"

# Step 2: Add new ZSK to zone (pre-publish)
# Both old and new ZSK will be in DNSKEY RRset
cat $NEW_ZSK >> $ZONE_FILE.keys

# Step 3: Re-sign zone with BOTH keys
dnssec-signzone -o $DOMAIN -k $KSK_FILE -f $ZONE_FILE.signed \
    -e +2592000 \  # 30 day signature validity
    $ZONE_FILE $OLD_ZSK_FILE $NEW_ZSK

# Step 4: Reload zone
rndc reload $DOMAIN

echo "Zone signed with both ZSKs. Wait for TTL propagation."
echo "After propagation, remove old ZSK and re-sign with new ZSK only."
```

**Post-rollover verification:**

```bash
#!/bin/bash
# Verify ZSK rollover success

DOMAIN="example.com"

echo "Verifying DNSSEC after ZSK rollover..."

# Check DNSKEY records
echo "DNSKEY records:"
dig +short $DOMAIN DNSKEY

# Verify signatures
echo ""
echo "Validating signatures:"
delv $DOMAIN SOA +rtrace

# Test from multiple resolvers
echo ""
echo "Testing validation from public resolvers:"
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    result=$(dig @$resolver +dnssec $DOMAIN A | grep -c "ad")
    echo "  $resolver: AD flag present: $result"
done
```

### Scenario 2: Compromised KSK (Emergency Double-DS Rollover)

A KSK compromise requires updating the DS record in the parent zone. This is more complex and time-sensitive.

**The double-DS method** publishes the new DS record before removing the old one:

```bash
#!/bin/bash
# Emergency KSK rollover - double DS method

DOMAIN="example.com"
KEY_DIR="/etc/bind/keys"

# Step 1: Generate new KSK immediately
cd $KEY_DIR
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK $DOMAIN
NEW_KSK=$(ls -t K$DOMAIN.+013+*.key | grep -v private | head -1)
NEW_KSK_ID=$(basename $NEW_KSK .key | grep -oP '\d+$')

echo "Generated new KSK with ID: $NEW_KSK_ID"

# Step 2: Generate DS record for new KSK
dnssec-dsfromkey -2 $NEW_KSK > new_ds_record.txt
echo "New DS record:"
cat new_ds_record.txt

# Step 3: Submit new DS record to registrar
# This varies by registrar - use their API or web interface
echo ""
echo "SUBMIT THIS DS RECORD TO YOUR REGISTRAR IMMEDIATELY:"
cat new_ds_record.txt
echo ""
echo "DS record format for common registrars:"
echo "  Key Tag: $NEW_KSK_ID"
echo "  Algorithm: 13 (ECDSAP256SHA256)"
echo "  Digest Type: 2 (SHA-256)"
echo "  Digest: $(cat new_ds_record.txt | awk '{print $7}')"
```

**Registrar DS record submission examples:**

For Cloudflare:

```bash
# Using Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dnssec" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{
        "ds_record": {
            "key_tag": '"$NEW_KSK_ID"',
            "algorithm": 13,
            "digest_type": 2,
            "digest": "'"$DS_DIGEST"'"
        }
    }'
```

For AWS Route 53:

```bash
# AWS CLI for DS record
aws route53domains update-domain-nameservers-and-dnssec \
    --domain-name example.com \
    --add-ds-records '[{
        "KeyTag": '"$NEW_KSK_ID"',
        "Algorithm": 13,
        "DigestType": 2,
        "Digest": "'"$DS_DIGEST"'"
    }]'
```

**Monitor DS propagation:**

```bash
#!/bin/bash
# Monitor DS record propagation

DOMAIN="example.com"
NEW_DS_KEYTAG="12345"

echo "Monitoring DS propagation for $DOMAIN..."

while true; do
    ds_records=$(dig +short $DOMAIN DS)
    if echo "$ds_records" | grep -q "$NEW_DS_KEYTAG"; then
        echo "[$(date)] New DS record visible!"
        echo "$ds_records"
        break
    else
        echo "[$(date)] Waiting for DS propagation..."
        sleep 60
    fi
done

echo ""
echo "DS propagation complete. Safe to proceed with key transition."
```

### Scenario 3: Both KSK and ZSK Compromised

This is the worst-case scenario requiring a complete key replacement:

```bash
#!/bin/bash
# Complete DNSSEC key replacement

DOMAIN="example.com"
KEY_DIR="/etc/bind/keys"
BACKUP_DIR="/etc/bind/keys/compromised_$(date +%Y%m%d)"

# Step 1: Backup compromised keys (for forensics)
mkdir -p $BACKUP_DIR
mv $KEY_DIR/K$DOMAIN.* $BACKUP_DIR/

# Step 2: Generate entirely new key set
cd $KEY_DIR

# New KSK
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK $DOMAIN
NEW_KSK=$(ls -t K$DOMAIN.+013+*.key | head -1)

# New ZSK
dnssec-keygen -a ECDSAP256SHA256 -n ZONE $DOMAIN
NEW_ZSK=$(ls -t K$DOMAIN.+013+*.key | head -1)

echo "New keys generated:"
echo "  KSK: $NEW_KSK"
echo "  ZSK: $NEW_ZSK"

# Step 3: Generate new DS record
dnssec-dsfromkey -2 $NEW_KSK > /tmp/emergency_ds.txt

echo ""
echo "CRITICAL: Submit this DS record to registrar immediately:"
cat /tmp/emergency_ds.txt

# Step 4: Sign zone with new keys
# Warning: This will cause validation failures until DS propagates
```

**Important consideration**: During the transition period, some resolvers will fail validation. This is unavoidable in an emergency but should be minimized through:

- Coordination with registrar for expedited DS updates
- Communication with users about temporary issues
- Monitoring validation status globally

### Scenario 4: Algorithm Rollover During Compromise

If you suspect algorithm weaknesses contributed to the compromise, perform an algorithm rollover:

```bash
#!/bin/bash
# Algorithm rollover (e.g., RSA to ECDSA)

DOMAIN="example.com"

# Generate new keys with stronger algorithm
# Moving from RSASHA256 (algorithm 8) to ECDSAP384SHA384 (algorithm 14)

dnssec-keygen -a ECDSAP384SHA384 -n ZONE -f KSK $DOMAIN
dnssec-keygen -a ECDSAP384SHA384 -n ZONE $DOMAIN

# Algorithm rollovers require extra care:
# 1. Publish new algorithm keys
# 2. Sign with both old and new algorithms
# 3. Update DS with new algorithm
# 4. Wait for full propagation
# 5. Remove old algorithm keys and signatures
```

## Post-Rollover Validation

After completing the emergency rollover, thorough validation is essential:

### Global Validation Testing

```bash
#!/bin/bash
# Comprehensive DNSSEC validation test

DOMAIN="example.com"
TEST_RESOLVERS=(
    "8.8.8.8"      # Google
    "8.8.4.4"      # Google secondary
    "1.1.1.1"      # Cloudflare
    "1.0.0.1"      # Cloudflare secondary
    "9.9.9.9"      # Quad9
    "208.67.222.222" # OpenDNS
    "64.6.64.6"    # Verisign
)

echo "=== Global DNSSEC Validation Test for $DOMAIN ==="
echo ""

for resolver in "${TEST_RESOLVERS[@]}"; do
    result=$(dig @$resolver +dnssec $DOMAIN A 2>/dev/null)

    if echo "$result" | grep -q "ad"; then
        status="PASS (AD flag set)"
    elif echo "$result" | grep -q "SERVFAIL"; then
        status="FAIL (SERVFAIL - validation failure)"
    else
        status="WARN (No AD flag)"
    fi

    echo "  $resolver: $status"
done

echo ""
echo "=== Chain of Trust Validation ==="
delv @8.8.8.8 $DOMAIN SOA +rtrace +mtrace
```

### DNSViz Analysis

Use DNSViz to visualize your DNSSEC chain:

```bash
# Install dnsviz
pip install dnsviz

# Analyze your domain
dnsviz probe $DOMAIN > analysis.json
dnsviz graph -Tpng -o dnssec_chain.png < analysis.json

echo "Visual analysis saved to dnssec_chain.png"
```

Or use the web interface at https://dnsviz.net/

### Verisign DNSSEC Debugger

```bash
# Check Verisign's analyzer
curl "https://dnssec-debugger.verisignlabs.com/api/v1/analyze?domain=$DOMAIN" \
    | jq '.results'
```

### Signature Expiration Monitoring

```bash
#!/bin/bash
# Monitor RRSIG expiration times

DOMAIN="example.com"

echo "RRSIG Expiration Report for $DOMAIN"
echo "==================================="

dig +dnssec $DOMAIN ANY | grep RRSIG | while read line; do
    rtype=$(echo $line | awk '{print $1}')
    expiry=$(echo $line | awk '{print $9}')

    # Convert expiry to human readable
    exp_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
    now_epoch=$(date +%s)
    days_left=$(( (exp_epoch - now_epoch) / 86400 ))

    echo "  $rtype RRSIG expires: $expiry ($days_left days)"
done
```

## Communication During the Incident

Effective communication is critical during a DNSSEC key compromise. Here is a structured approach:

### Internal Communication

**Initial notification (T+0):**

```
SUBJECT: [SECURITY INCIDENT] DNSSEC Key Compromise - [domain.com]

SEVERITY: Critical
STATUS: Active
INCIDENT COMMANDER: [Name]

SUMMARY:
A compromise of DNSSEC signing keys has been detected for [domain.com].
Emergency key rollover is in progress.

IMPACT:
- Potential for DNS spoofing attacks during transition
- Some users may experience validation failures
- Estimated recovery time: [X hours]

ACTIONS IN PROGRESS:
1. New keys being generated
2. Registrar contacted for DS update
3. Zone being re-signed

NEXT UPDATE: [Time]
```

**Status updates (every 30-60 minutes):**

```
SUBJECT: [UPDATE #2] DNSSEC Key Compromise - [domain.com]

STATUS: Recovery in Progress
TIME ELAPSED: 90 minutes

PROGRESS:
[X] New KSK generated
[X] New ZSK generated
[X] DS record submitted to registrar
[ ] DS propagation (waiting - estimated 2 hours)
[ ] Old key removal
[ ] Validation confirmed

CURRENT PHASE: Monitoring DS propagation
ESTIMATED COMPLETION: [Time]
```

### External Communication

**Status page update:**

```
Title: DNS Security Maintenance

We are performing emergency maintenance on our DNS infrastructure
to address a security concern.

During this maintenance window, some users may experience
intermittent connectivity issues when accessing our services.

We expect full resolution within [X hours].

For urgent matters, please contact support@example.com.

Updates will be posted here as available.

Posted: [Time]
```

**Customer notification (if required):**

```
Subject: Important Security Update - Action May Be Required

Dear [Customer],

We are writing to inform you of a security maintenance event
affecting DNS services for [domain.com].

WHAT HAPPENED:
We detected unauthorized access to our DNS security infrastructure
and are taking immediate action to secure our systems.

WHAT WE'RE DOING:
- Rotating all cryptographic keys
- Enhanced monitoring deployed
- Security audit in progress

WHAT YOU SHOULD DO:
- Clear your DNS cache: [instructions]
- Report any unusual behavior to security@example.com
- No password changes are required at this time

We take security seriously and will provide updates as our
investigation continues.

[Signature]
```

## Root Cause Analysis

After the immediate crisis is resolved, conduct a thorough root cause analysis:

### Common Compromise Vectors

**1. Key storage vulnerabilities:**

```bash
# Audit key file permissions
ls -la /etc/bind/keys/
# Keys should be:
# - Owned by the named user/group
# - Mode 600 or 640 maximum
# - Not in version control
# - Backed up encrypted
```

**2. HSM access compromise:**

```bash
# Review HSM audit logs
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so --list-objects

# Check for unauthorized key exports
grep -i "export\|extract" /var/log/hsm_audit.log
```

**3. Signing infrastructure compromise:**

```bash
# Review BIND/named logs
grep -i "key\|sign\|dnssec" /var/log/named/named.log

# Check for unauthorized zone transfers
grep "AXFR\|IXFR" /var/log/named/xfer.log
```

**4. Supply chain attack:**

```bash
# Verify software integrity
rpm -V bind bind-utils 2>/dev/null || dpkg -V bind9 2>/dev/null

# Check for modified binaries
for bin in named dnssec-keygen dnssec-signzone; do
    which $bin | xargs sha256sum
done
```

### Post-Incident Review Template

```markdown
## DNSSEC Key Compromise - Post-Incident Review

### Incident Timeline
| Time | Event | Actor |
|------|-------|-------|
| T+0  | Compromise detected | Monitoring system |
| T+5  | Incident team assembled | On-call engineer |
| ...  | ... | ... |

### Root Cause
[Detailed technical explanation of how the compromise occurred]

### Impact Assessment
- Duration of exposure: [X hours]
- Affected zones: [list]
- Evidence of exploitation: [Yes/No]
- Data exfiltration: [Yes/No/Unknown]

### What Went Well
-
-

### What Could Be Improved
-
-

### Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| Implement HSM for key storage | | | |
| Automate key rotation | | | |
| ... | | | |

### Lessons Learned
1.
2.
3.
```

## Prevention and Hardening

After recovery, implement these measures to prevent future compromises:

### Hardware Security Modules (HSM)

Store keys in HSMs to prevent extraction:

```bash
# Configure BIND to use PKCS#11 HSM
# /etc/bind/named.conf

options {
    dnssec-policy "hsm-policy";
};

dnssec-policy "hsm-policy" {
    keys {
        ksk key-store "hsm" lifetime unlimited algorithm ecdsap384sha384;
        zsk key-store "hsm" lifetime P90D algorithm ecdsap256sha256;
    };

    key-store "hsm" {
        directory "/opt/hsm";
        pkcs11-uri "pkcs11:token=dnssec;object=example-ksk";
    };
};
```

### Automated Key Rotation

Implement automatic ZSK rotation to limit exposure windows:

```bash
# Using BIND's built-in key management
dnssec-policy "auto-rotate" {
    keys {
        ksk lifetime P365D algorithm ecdsap384sha384;
        zsk lifetime P30D algorithm ecdsap256sha256;
    };

    // Pre-publish timing
    dnskey-ttl PT1H;
    publish-safety PT1H;
    retire-safety PT1H;

    // Signature parameters
    signatures-refresh P5D;
    signatures-validity P14D;
    signatures-validity-dnskey P14D;
};
```

### Multi-Signer DNSSEC

Deploy multi-signer DNSSEC for redundancy:

```bash
# Configure for RFC 8901 multi-signer model
# Provider A signs with their keys
# Provider B signs with their keys
# Both DS records published in parent

# This provides resilience against single-provider compromise
```

### Monitoring and Alerting

```bash
#!/bin/bash
# DNSSEC monitoring script - run via cron

DOMAIN="example.com"
ALERT_EMAIL="security@example.com"

# Check RRSIG expiration
expiry=$(dig +short $DOMAIN SOA | head -1)
days_to_expiry=$(( ($(date -d "$expiry" +%s) - $(date +%s)) / 86400 ))

if [ $days_to_expiry -lt 7 ]; then
    echo "ALERT: RRSIG expires in $days_to_expiry days" | \
        mail -s "DNSSEC Warning: $DOMAIN" $ALERT_EMAIL
fi

# Check for DNSKEY changes
current_keys=$(dig +short $DOMAIN DNSKEY | sort | sha256sum)
stored_keys=$(cat /var/lib/dnssec-monitor/$DOMAIN.keys.sha256)

if [ "$current_keys" != "$stored_keys" ]; then
    echo "ALERT: DNSKEY records changed unexpectedly" | \
        mail -s "DNSSEC Alert: $DOMAIN key change" $ALERT_EMAIL
fi

# Verify chain of trust
if ! delv $DOMAIN SOA > /dev/null 2>&1; then
    echo "ALERT: DNSSEC validation failed" | \
        mail -s "DNSSEC Critical: $DOMAIN validation failure" $ALERT_EMAIL
fi
```

### Access Control Best Practices

```yaml
# Example RBAC for DNSSEC operations

roles:
  dnssec_viewer:
    permissions:
      - view_dnskey_records
      - view_ds_records
      - view_rrsig_records

  dnssec_operator:
    permissions:
      - view_dnskey_records
      - view_ds_records
      - view_rrsig_records
      - trigger_zsk_rollover
      - view_signing_logs

  dnssec_admin:
    permissions:
      - all_dnssec_permissions
      - trigger_ksk_rollover
      - modify_ds_records
      - emergency_key_revocation
    requires:
      - mfa_enabled
      - security_training_current
```

## Recovery Summary Table

| Scenario | Severity | Recovery Time | Requires Parent Update | Key Steps |
|----------|----------|---------------|------------------------|-----------|
| ZSK Compromise Only | High | 2-4 hours | No | 1. Generate new ZSK 2. Double-sign zone 3. Wait for TTL 4. Remove old ZSK |
| KSK Compromise Only | Critical | 4-24 hours | Yes | 1. Generate new KSK 2. Submit new DS 3. Wait for DS propagation 4. Re-sign zone 5. Remove old KSK |
| Both Keys Compromised | Critical | 6-48 hours | Yes | 1. Generate new KSK+ZSK 2. Submit new DS 3. Accept temporary failures 4. Re-sign zone 5. Remove old keys |
| Algorithm Weakness | Critical | 24-72 hours | Yes | 1. Generate keys with new algorithm 2. Double-sign with both algorithms 3. Submit new DS 4. Full propagation 5. Remove old algorithm |
| HSM Compromise | Critical | 24-72 hours | Yes | 1. Revoke HSM access 2. Generate keys in new HSM 3. Full key rollover 4. Forensic investigation |

## Quick Reference: Emergency Commands

```bash
# === EMERGENCY DNSSEC COMMANDS ===

# Check current DNSSEC status
dig +dnssec +multi example.com SOA

# Verify validation from Google DNS
dig @8.8.8.8 +dnssec example.com A

# List current keys
dig +short example.com DNSKEY

# Get DS record for KSK
dnssec-dsfromkey -2 Kexample.com.+013+12345.key

# Validate chain of trust
delv example.com SOA +rtrace

# Generate emergency KSK (ECDSA P-256)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com

# Generate emergency ZSK (ECDSA P-256)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com

# Sign zone with specific keys
dnssec-signzone -o example.com -k ksk.key zonefile zsk.key

# Reload zone in BIND
rndc reload example.com

# Check RRSIG expiration
dig +dnssec example.com SOA | grep RRSIG
```

## Conclusion

A compromised DNSSEC key is a serious security incident, but with proper preparation and swift action, recovery is achievable. The key principles to remember are:

1. **Speed matters**: RRSIG expiration creates a hard deadline. Move quickly but methodically.

2. **Preserve evidence**: Before making changes, capture the current state for forensic analysis.

3. **Communicate clearly**: Keep stakeholders informed throughout the incident.

4. **Validate thoroughly**: After recovery, verify DNSSEC validation from multiple vantage points globally.

5. **Learn and improve**: Use every incident as an opportunity to strengthen your DNSSEC infrastructure.

The best time to prepare for a DNSSEC key compromise is before it happens. Develop runbooks, practice rollovers, implement HSMs, and establish relationships with your registrar's security team. When the worst happens, you will be ready.

## Additional Resources

- RFC 6781: DNSSEC Operational Practices, Version 2
- RFC 7583: DNSSEC Key Rollover Timing Considerations
- RFC 8901: Multi-Signer DNSSEC Models
- ICANN DNSSEC Practice Statements
- DNS-OARC (DNS Operations, Analysis, and Research Center)

## About OneUptime

OneUptime provides comprehensive monitoring solutions including DNS monitoring that can alert you to DNSSEC issues before they become incidents. Our platform monitors DNSSEC validation status, RRSIG expiration, and DS record consistency across your domains, giving you early warning of potential problems.

Visit [oneuptime.com](https://oneuptime.com) to learn how we can help protect your DNS infrastructure.
