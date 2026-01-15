# How to Harden Your DNSSEC Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, Security, Hardening, DNS, Best Practices, Infrastructure

Description: A comprehensive guide to hardening your DNSSEC deployment with practical configurations, security checklists, and best practices to protect your DNS infrastructure from attacks.

---

## Ultra-Short Summary (If You Read Nothing Else)

1. Use strong cryptographic algorithms (ECDSA P-256 or Ed25519 over RSA).
2. Implement proper key management with separate KSK and ZSK.
3. Configure appropriate signature validity periods (7-14 days for ZSK signatures).
4. Automate key rollovers with monitoring and alerting.
5. Enable NSEC3 with opt-out disabled to prevent zone enumeration.
6. Deploy multiple signing servers for redundancy.
7. Monitor DNSSEC validation failures and expiring signatures.
8. Test your configuration regularly with diagnostic tools.
9. Implement response rate limiting (RRL) to prevent amplification attacks.
10. Document your key management procedures and disaster recovery plans.

---

## Why DNSSEC Hardening Matters

DNSSEC (Domain Name System Security Extensions) adds cryptographic signatures to DNS records, preventing cache poisoning and man-in-the-middle attacks. However, a poorly configured DNSSEC deployment can be worse than no DNSSEC at all:

- **Expired signatures** cause complete resolution failures
- **Weak algorithms** provide false security
- **Poor key management** leads to compromise or lockout
- **Misconfigured NSEC/NSEC3** enables zone enumeration
- **No monitoring** means silent failures go undetected

This guide provides a systematic approach to hardening every aspect of your DNSSEC configuration.

---

## How to Use This Guide

Work through each section systematically:
1. **Audit** your current configuration against each recommendation
2. **Prioritize** changes based on risk and effort
3. **Implement** changes in a staging environment first
4. **Test** thoroughly before production deployment
5. **Monitor** continuously after changes

Each section includes:
- What to configure
- Why it matters
- How to implement it
- Example configurations

---

## DNSSEC Hardening Checklist

### 1. Cryptographic Algorithm Selection
Algorithm Choice | Key Sizes | Signature Validity | Algorithm Rollover Plan

### 2. Key Management
KSK/ZSK Separation | Key Storage | Backup Procedures | Rotation Schedule | Emergency Procedures

### 3. Signing Configuration
Signature Validity | Re-signing Interval | NSEC3 Parameters | Salt Rotation

### 4. Zone Configuration
SOA Parameters | TTL Strategy | Delegation Records | DS Record Management

### 5. Operational Security
Access Control | Audit Logging | Change Management | Incident Response

### 6. Monitoring and Alerting
Signature Expiry | Validation Failures | Key Events | Performance Metrics

### 7. Infrastructure Redundancy
Multiple Signers | Geographic Distribution | Failover Procedures

### 8. Attack Mitigation
Response Rate Limiting | Amplification Prevention | DoS Protection

---

## Detailed Hardening Guide

### 1. Cryptographic Algorithm Selection

#### Choose Strong Algorithms

**What**: Select modern, secure cryptographic algorithms for signing.

**Why**: Older algorithms like RSA with SHA-1 (algorithm 5) are deprecated and vulnerable. Modern algorithms provide better security with smaller signatures.

**Recommended Algorithms (in order of preference)**:

| Algorithm | ID | Key Size | Notes |
|-----------|-----|----------|-------|
| Ed25519 | 15 | 256-bit | Best performance, smallest signatures |
| ECDSA P-256 | 13 | 256-bit | Widely supported, good performance |
| ECDSA P-384 | 14 | 384-bit | Higher security margin |
| RSA/SHA-256 | 8 | 2048-bit | Legacy compatibility only |

**Configuration Example (BIND)**:

```named.conf
dnssec-policy "hardened" {
    keys {
        ksk key-directory lifetime unlimited algorithm ecdsap256sha256;
        zsk key-directory lifetime 90d algorithm ecdsap256sha256;
    };

    // Signature parameters
    signatures-refresh 5d;
    signatures-validity 14d;
    signatures-validity-dnskey 14d;

    // NSEC3 parameters
    nsec3param iterations 0 optout no salt-length 0;
};
```

**Configuration Example (PowerDNS)**:

```bash
# Generate ECDSA keys
pdnsutil add-zone-key example.com ksk active ecdsap256sha256
pdnsutil add-zone-key example.com zsk active ecdsap256sha256

# Verify algorithm
pdnsutil show-zone example.com
```

**Avoid These Algorithms**:
- Algorithm 1 (RSA/MD5) - Broken
- Algorithm 3 (DSA/SHA-1) - Deprecated
- Algorithm 5 (RSA/SHA-1) - Deprecated
- Algorithm 6 (DSA-NSEC3-SHA1) - Deprecated
- Algorithm 7 (RSASHA1-NSEC3-SHA1) - Deprecated

---

#### Key Size Guidelines

**What**: Configure appropriate key sizes for your chosen algorithm.

**Why**: Undersized keys are vulnerable; oversized keys waste bandwidth and CPU.

| Algorithm | Minimum | Recommended | Maximum |
|-----------|---------|-------------|---------|
| RSA | 2048-bit | 2048-bit | 4096-bit |
| ECDSA P-256 | 256-bit | 256-bit | 256-bit |
| ECDSA P-384 | 384-bit | 384-bit | 384-bit |
| Ed25519 | 256-bit | 256-bit | 256-bit |

**Note**: For elliptic curve algorithms, the key size is fixed by the curve.

---

### 2. Key Management

#### Separate KSK and ZSK

**What**: Use separate Key Signing Keys (KSK) and Zone Signing Keys (ZSK).

**Why**:
- KSK changes require DS record updates (coordination with parent zone)
- ZSK changes are local operations
- Different security requirements for each key type
- Reduces exposure of the more critical KSK

**Implementation**:

```bash
# BIND - Automatic with dnssec-policy
dnssec-policy "hardened" {
    keys {
        ksk key-directory lifetime unlimited algorithm ecdsap256sha256;
        zsk key-directory lifetime 90d algorithm ecdsap256sha256;
    };
};

# PowerDNS
pdnsutil add-zone-key example.com ksk active ecdsap256sha256
pdnsutil add-zone-key example.com zsk active ecdsap256sha256
```

---

#### Secure Key Storage

**What**: Store private keys securely with appropriate access controls.

**Why**: Compromised private keys allow attackers to forge DNS responses.

**Best Practices**:

1. **Hardware Security Modules (HSMs)** for KSK storage:
```named.conf
// BIND with PKCS#11 HSM
dnssec-policy "hsm-backed" {
    keys {
        ksk key-store "hsm" lifetime unlimited algorithm ecdsap256sha256;
        zsk key-directory lifetime 90d algorithm ecdsap256sha256;
    };
};

key-store "hsm" {
    type pkcs11;
    library "/usr/lib/softhsm/libsofthsm2.so";
    slot 0;
    pin-file "/etc/bind/hsm-pin";
};
```

2. **File System Permissions**:
```bash
# Restrict key directory access
chmod 700 /var/cache/bind/keys
chown bind:bind /var/cache/bind/keys

# Restrict individual key files
chmod 600 /var/cache/bind/keys/*.private
```

3. **Encrypted Storage**:
```bash
# Use encrypted filesystem for key storage
cryptsetup luksFormat /dev/sdb1
cryptsetup luksOpen /dev/sdb1 dnssec-keys
mkfs.ext4 /dev/mapper/dnssec-keys
mount /dev/mapper/dnssec-keys /var/cache/bind/keys
```

---

#### Key Backup Procedures

**What**: Maintain secure, tested backups of all DNSSEC keys.

**Why**: Key loss without backup results in zone lockout.

**Backup Strategy**:

```bash
#!/bin/bash
# DNSSEC Key Backup Script

BACKUP_DIR="/secure/backups/dnssec"
KEY_DIR="/var/cache/bind/keys"
DATE=$(date +%Y%m%d)

# Create encrypted backup
tar -czf - "$KEY_DIR" | \
    gpg --symmetric --cipher-algo AES256 \
    > "$BACKUP_DIR/dnssec-keys-$DATE.tar.gz.gpg"

# Verify backup integrity
gpg --decrypt "$BACKUP_DIR/dnssec-keys-$DATE.tar.gz.gpg" | \
    tar -tzf - > /dev/null

# Store checksum
sha256sum "$BACKUP_DIR/dnssec-keys-$DATE.tar.gz.gpg" \
    > "$BACKUP_DIR/dnssec-keys-$DATE.tar.gz.gpg.sha256"

# Replicate to offline storage
rsync -av "$BACKUP_DIR/" /mnt/offline-backup/dnssec/
```

**Backup Verification Checklist**:
- [ ] Backups are encrypted
- [ ] Backups are stored in multiple locations
- [ ] At least one backup is offline/air-gapped
- [ ] Restoration procedures are documented and tested
- [ ] Backup access is audited

---

#### Key Rotation Schedule

**What**: Implement regular, automated key rotation.

**Why**: Limits exposure window if keys are compromised; maintains cryptographic hygiene.

**Recommended Schedule**:

| Key Type | Rotation Frequency | Notes |
|----------|-------------------|-------|
| ZSK | 30-90 days | Automated, no parent coordination |
| KSK | 1-2 years | Requires DS record update |
| Algorithm | As needed | Major security event or deprecation |

**BIND Automated Rotation**:

```named.conf
dnssec-policy "auto-rotate" {
    keys {
        ksk key-directory lifetime 365d algorithm ecdsap256sha256;
        zsk key-directory lifetime 30d algorithm ecdsap256sha256;
    };

    // Pre-publish new keys before activation
    publish-safety 7d;
    retire-safety 7d;

    // Key state timing
    dnskey-ttl 1h;
    max-zone-ttl 1d;
    zone-propagation-delay 5m;
    parent-ds-ttl 1d;
    parent-propagation-delay 1h;
};
```

**Manual KSK Rollover Process**:

```bash
# 1. Generate new KSK
dnssec-keygen -a ECDSAP256SHA256 -f KSK example.com

# 2. Add to zone (both keys active during transition)
# 3. Wait for zone propagation (2x TTL)
# 4. Update DS record at parent
# 5. Wait for parent propagation
# 6. Remove old KSK
# 7. Update DS record to remove old key
```

---

### 3. Signing Configuration

#### Signature Validity Period

**What**: Configure appropriate signature expiration times.

**Why**:
- Too short: Risk of expiration during outages
- Too long: Increased exposure if key is compromised

**Recommended Values**:

| Record Type | Validity | Re-sign Threshold |
|-------------|----------|-------------------|
| DNSKEY | 14 days | 7 days |
| Other records | 7-14 days | 3-7 days |

**Configuration**:

```named.conf
// BIND
dnssec-policy "hardened" {
    signatures-validity 14d;
    signatures-validity-dnskey 14d;
    signatures-refresh 5d;  // Re-sign when 5 days remaining
};
```

```bash
# PowerDNS
pdnsutil set-meta example.com SOA-EDIT-API INCEPTION-INCREMENT
# Signature validity is controlled by default-soa-edit-signed
```

---

#### NSEC3 Configuration

**What**: Configure NSEC3 to prevent zone enumeration while maintaining security.

**Why**:
- NSEC allows zone walking (enumerating all records)
- NSEC3 uses hashed names to prevent enumeration
- Proper parameters prevent offline dictionary attacks

**Hardened NSEC3 Configuration**:

```bash
# PowerDNS - Set NSEC3 parameters
pdnsutil set-nsec3 example.com '1 0 0 -' narrow

# BIND
dnssec-policy "hardened" {
    nsec3param iterations 0 optout no salt-length 0;
};
```

**Parameter Explanation**:

| Parameter | Recommended | Reason |
|-----------|-------------|--------|
| Algorithm | 1 (SHA-1) | Only supported option |
| Iterations | 0 | RFC 9276 recommendation; iterations add no security |
| Salt | Empty ("-") | RFC 9276 recommendation; salt adds no security |
| Opt-out | No (0) | Prevents unsigned delegations |

**Why Zero Iterations and No Salt?**

RFC 9276 updated NSEC3 best practices:
- Extra iterations only slow down legitimate resolvers
- Attackers can precompute hashes regardless
- Salt changes force re-signing entire zone
- Modern GPUs make iterations ineffective

---

### 4. Zone Configuration

#### SOA Record Optimization

**What**: Configure SOA parameters for DNSSEC compatibility.

**Why**: SOA parameters affect signature validity and zone transfer timing.

```zone
; Hardened SOA configuration
example.com. IN SOA ns1.example.com. hostmaster.example.com. (
    2024011501 ; Serial (YYYYMMDDNN format)
    3600       ; Refresh (1 hour)
    900        ; Retry (15 minutes)
    604800     ; Expire (7 days)
    300        ; Negative TTL (5 minutes)
)
```

**Parameter Guidelines**:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Refresh | 1 hour | Frequent secondary updates |
| Retry | 15 minutes | Quick recovery from failures |
| Expire | 7 days | Match minimum signature validity |
| Negative TTL | 5 minutes | Balance caching and update speed |

---

#### TTL Strategy

**What**: Configure TTLs considering DNSSEC overhead.

**Why**:
- Lower TTLs mean more queries and DNSSEC validation
- Higher TTLs risk serving stale/invalid data
- DNSSEC adds significant response size

**Recommended TTLs**:

| Record Type | TTL | Notes |
|-------------|-----|-------|
| SOA | 1 hour | Standard |
| NS | 24-48 hours | Stable, high cache value |
| MX | 1-4 hours | Balance reliability and flexibility |
| A/AAAA | 5-60 minutes | Depends on change frequency |
| DNSKEY | 1 hour | Must be shorter than signature validity |
| DS | 1 hour | Coordinate with parent TTL |

---

#### DS Record Management

**What**: Properly manage DS records at the parent zone.

**Why**: DS records are the trust anchor linking parent and child zones.

**Best Practices**:

1. **Use multiple DS records during rollovers**:
```zone
; Parent zone during KSK rollover
example.com. IN DS 12345 13 2 <old-key-digest>
example.com. IN DS 67890 13 2 <new-key-digest>
```

2. **Use strong digest algorithms**:
```bash
# Generate DS with SHA-256 (digest type 2)
dnssec-dsfromkey -2 Kexample.com.+013+12345.key
```

| Digest Type | Algorithm | Status |
|-------------|-----------|--------|
| 1 | SHA-1 | Deprecated, avoid |
| 2 | SHA-256 | Recommended |
| 4 | SHA-384 | Optional, higher security |

3. **Automate DS updates** where possible:
```bash
# Using CDS/CDNSKEY for automated updates (RFC 7344)
# Add CDS record to zone
example.com. IN CDS 12345 13 2 <digest>
example.com. IN CDNSKEY 257 3 13 <public-key>
```

---

### 5. Operational Security

#### Access Control

**What**: Implement strict access controls for DNSSEC operations.

**Why**: Unauthorized access can lead to key compromise or configuration errors.

**Implementation**:

```bash
# Dedicated DNSSEC management user
useradd -r -s /sbin/nologin dnssec-admin

# Restrict access to key material
setfacl -m u:dnssec-admin:rx /var/cache/bind/keys
setfacl -m u:bind:rx /var/cache/bind/keys

# Sudo rules for DNSSEC operations
# /etc/sudoers.d/dnssec
dnssec-admin ALL=(bind) NOPASSWD: /usr/sbin/rndc sign *
dnssec-admin ALL=(bind) NOPASSWD: /usr/sbin/rndc reload *
```

**Role-Based Access**:

| Role | Permissions |
|------|-------------|
| DNS Admin | Full zone management |
| DNSSEC Operator | Key operations, signing |
| Security Auditor | Read-only access to logs and configs |
| Monitoring | Query statistics only |

---

#### Audit Logging

**What**: Enable comprehensive logging of all DNSSEC operations.

**Why**: Audit trails are essential for security investigation and compliance.

**BIND Logging Configuration**:

```named.conf
logging {
    channel dnssec_log {
        file "/var/log/named/dnssec.log" versions 10 size 10m;
        severity info;
        print-time yes;
        print-severity yes;
        print-category yes;
    };

    channel security_log {
        file "/var/log/named/security.log" versions 10 size 10m;
        severity info;
        print-time yes;
        print-severity yes;
    };

    category dnssec { dnssec_log; };
    category security { security_log; };
};
```

**Events to Log**:
- Key generation and deletion
- Key state changes (publish, activate, retire)
- Signature operations
- Validation failures
- Configuration changes
- Access attempts

---

#### Change Management

**What**: Implement formal change control for DNSSEC modifications.

**Why**: DNSSEC misconfiguration can cause widespread resolution failures.

**Change Control Process**:

1. **Pre-change checklist**:
   - [ ] Change documented and approved
   - [ ] Rollback procedure defined
   - [ ] Backup taken
   - [ ] Monitoring alerts configured
   - [ ] Communication plan ready

2. **Validation steps**:
```bash
# Check zone before signing
named-checkzone example.com /etc/bind/zones/example.com.zone

# Verify DNSSEC configuration
dnssec-verify -o example.com /etc/bind/zones/example.com.zone.signed

# Test with diagnostic tools
dig @localhost example.com +dnssec +multi
delv @localhost example.com
```

3. **Post-change verification**:
```bash
# External validation
dig @8.8.8.8 example.com +dnssec
dig @1.1.1.1 example.com +dnssec

# Check signature validity
dig example.com RRSIG +short | head -5
```

---

### 6. Monitoring and Alerting

#### Signature Expiry Monitoring

**What**: Monitor signature expiration and alert before failure.

**Why**: Expired signatures cause SERVFAIL for validating resolvers.

**Monitoring Script**:

```bash
#!/bin/bash
# DNSSEC Signature Expiry Monitor

DOMAIN="example.com"
WARNING_DAYS=7
CRITICAL_DAYS=3

# Get signature expiration
EXPIRY=$(dig +short "$DOMAIN" RRSIG | head -1 | awk '{print $5}')
EXPIRY_EPOCH=$(date -d "${EXPIRY:0:4}-${EXPIRY:4:2}-${EXPIRY:6:2}" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $CRITICAL_DAYS ]; then
    echo "CRITICAL: $DOMAIN signatures expire in $DAYS_LEFT days"
    exit 2
elif [ $DAYS_LEFT -lt $WARNING_DAYS ]; then
    echo "WARNING: $DOMAIN signatures expire in $DAYS_LEFT days"
    exit 1
else
    echo "OK: $DOMAIN signatures valid for $DAYS_LEFT days"
    exit 0
fi
```

**Prometheus Metrics** (with dnssec-exporter):

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dnssec'
    static_configs:
      - targets: ['localhost:9204']
    metrics_path: /probe
    params:
      target: ['example.com']
```

**Alert Rules**:

```yaml
# alertmanager rules
groups:
  - name: dnssec
    rules:
      - alert: DNSSECSignatureExpiringSoon
        expr: dnssec_signature_expiry_days < 7
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "DNSSEC signatures expiring soon"

      - alert: DNSSECSignatureCritical
        expr: dnssec_signature_expiry_days < 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DNSSEC signatures critically close to expiry"
```

---

#### Validation Failure Monitoring

**What**: Monitor for DNSSEC validation failures from resolvers.

**Why**: Validation failures indicate misconfigurations or attacks.

**BIND Statistics**:

```named.conf
statistics-channels {
    inet 127.0.0.1 port 8053 allow { 127.0.0.1; };
};
```

**Key Metrics to Monitor**:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `dnssec-validation-success` | Successful validations | Baseline deviation |
| `dnssec-validation-failure` | Failed validations | > 1% of queries |
| `resolver.dnssec.bogus` | Bogus responses | Any occurrence |
| `resolver.dnssec.indeterminate` | Uncertain validation | Trend increase |

---

#### External Monitoring

**What**: Use external services to validate DNSSEC from multiple vantage points.

**Why**: Internal monitoring may miss issues visible from the internet.

**Recommended Tools**:

1. **DNSViz** (https://dnsviz.net):
```bash
# Install dnsviz locally
pip install dnsviz

# Analyze zone
dnsviz probe example.com | dnsviz graph -Tpng -o example.png
```

2. **Verisign DNSSEC Debugger**:
   - https://dnssec-debugger.verisignlabs.com

3. **BIND delv tool**:
```bash
# Validate from specific resolver
delv @8.8.8.8 example.com

# Trace validation chain
delv +trace example.com
```

4. **Integrate with OneUptime**:
   - Configure DNS monitors for DNSSEC-enabled domains
   - Set up alerts for validation failures
   - Track DNSSEC health over time

---

### 7. Infrastructure Redundancy

#### Multiple Signing Servers

**What**: Deploy redundant signing infrastructure.

**Why**: Single points of failure risk zone unavailability.

**Architecture Options**:

1. **Active-Passive with Shared Keys**:
```
Primary Signer (Active) --> Zone Transfer --> Secondary DNS
     |
     v
Standby Signer (Passive, same keys)
```

2. **Active-Active with Key Synchronization**:
```
Signer 1 <--> Key Sync <--> Signer 2
    |                          |
    v                          v
Secondary DNS <----------> Secondary DNS
```

3. **Managed DNSSEC Service**:
```
Zone Management --> Cloud DNSSEC Service --> Global DNS
```

**Key Synchronization** (for active-active):

```bash
#!/bin/bash
# Key synchronization script
rsync -avz --delete \
    -e "ssh -i /path/to/key" \
    /var/cache/bind/keys/ \
    signer2:/var/cache/bind/keys/

# Trigger re-sign on secondary
ssh signer2 'rndc sign example.com'
```

---

#### Geographic Distribution

**What**: Distribute DNS infrastructure across regions.

**Why**: Reduces latency and provides resilience against regional failures.

**Considerations**:
- Key material must be available at all signing locations
- Time synchronization is critical (NTP)
- Consistent configuration across all servers

---

### 8. Attack Mitigation

#### Response Rate Limiting (RRL)

**What**: Implement RRL to prevent DNS amplification attacks.

**Why**: DNSSEC responses are larger, making them attractive for amplification.

**BIND RRL Configuration**:

```named.conf
options {
    rate-limit {
        responses-per-second 10;
        window 5;
        slip 2;

        // Exempt internal networks
        exempt-clients { 10.0.0.0/8; 192.168.0.0/16; };

        // Log rate limiting events
        log-only no;
    };
};
```

**Parameter Tuning**:

| Parameter | Value | Description |
|-----------|-------|-------------|
| responses-per-second | 5-15 | Max identical responses per second |
| window | 5-15 | Seconds to track response rates |
| slip | 2 | Send truncated response every N drops |
| errors-per-second | 5 | Rate for error responses |

---

#### TCP Fallback Configuration

**What**: Ensure proper TCP support for large DNSSEC responses.

**Why**: DNSSEC responses often exceed 512 bytes, requiring TCP or EDNS.

```named.conf
options {
    // Support large UDP responses
    edns-udp-size 4096;
    max-udp-size 4096;

    // TCP configuration
    tcp-clients 1000;
    tcp-listen-queue 10;
};
```

---

#### Key Compromise Response

**What**: Have a documented procedure for responding to key compromise.

**Why**: Quick response limits damage from compromised keys.

**Emergency Rollover Procedure**:

```bash
#!/bin/bash
# Emergency KSK rollover

ZONE="example.com"

# 1. Generate new KSK immediately
dnssec-keygen -a ECDSAP256SHA256 -f KSK $ZONE

# 2. Add new key to zone
rndc sign $ZONE

# 3. Generate new DS record
dnssec-dsfromkey -2 K${ZONE}.+013+*.key

# 4. Contact parent zone operator for DS update
# (automated via CDS/CDNSKEY if supported)

# 5. Remove compromised key after propagation
rndc dnssec -checkds published $ZONE
rndc dnssec -rollover -key <old-key-id> $ZONE
```

---

## DNSSEC Hardening Summary Table

| Category | Hardening Measure | Priority | Complexity |
|----------|------------------|----------|------------|
| **Algorithms** | Use ECDSA P-256 or Ed25519 | Critical | Low |
| | Avoid SHA-1 based algorithms | Critical | Low |
| | Use SHA-256 for DS digests | Critical | Low |
| **Key Management** | Separate KSK and ZSK | High | Low |
| | Secure key storage (HSM for KSK) | High | Medium |
| | Automated key rotation | High | Medium |
| | Encrypted backups | High | Low |
| | Tested recovery procedures | High | Medium |
| **Signing** | 7-14 day signature validity | High | Low |
| | Automatic re-signing | Critical | Low |
| | NSEC3 with 0 iterations | Medium | Low |
| | No salt (per RFC 9276) | Medium | Low |
| **Zone Config** | Appropriate TTLs | Medium | Low |
| | SOA aligned with signatures | Medium | Low |
| | Multiple DS during rollover | High | Medium |
| **Operations** | Role-based access control | High | Medium |
| | Comprehensive audit logging | High | Low |
| | Change management process | High | Medium |
| | Documented procedures | High | Medium |
| **Monitoring** | Signature expiry alerts | Critical | Low |
| | Validation failure tracking | Critical | Low |
| | External validation checks | High | Low |
| | Integration with OneUptime | High | Low |
| **Infrastructure** | Multiple signing servers | Medium | High |
| | Geographic distribution | Medium | High |
| | Tested failover procedures | High | Medium |
| **Attack Mitigation** | Response Rate Limiting | High | Low |
| | TCP fallback support | High | Low |
| | Emergency rollover procedure | Critical | Medium |

---

## Common DNSSEC Misconfigurations

### 1. Expired Signatures

**Symptoms**: SERVFAIL responses from validating resolvers

**Detection**:
```bash
dig +dnssec example.com | grep RRSIG
# Check expiration date in RRSIG record
```

**Fix**:
```bash
# Force immediate re-sign
rndc sign example.com

# Verify new signatures
dig +dnssec example.com RRSIG
```

---

### 2. Missing DS Record

**Symptoms**: Chain of trust broken, validation fails

**Detection**:
```bash
# Check for DS at parent
dig +short example.com DS

# Trace validation chain
delv +trace example.com
```

**Fix**:
- Contact parent zone operator
- Submit DS record via registrar portal
- Use CDS/CDNSKEY for automated updates

---

### 3. Algorithm Mismatch

**Symptoms**: Validation failures despite valid signatures

**Detection**:
```bash
# Compare algorithms in DNSKEY and DS
dig +short example.com DNSKEY | awk '{print $3}'
dig +short example.com DS | awk '{print $2}'
```

**Fix**:
- Ensure DS algorithm matches DNSKEY
- Update DS record if algorithm changed

---

### 4. Clock Skew

**Symptoms**: Signatures appear expired or not yet valid

**Detection**:
```bash
# Check RRSIG inception and expiration
dig +dnssec example.com | grep RRSIG

# Compare with current time
date -u
```

**Fix**:
```bash
# Synchronize time with NTP
systemctl restart chronyd
chronyc tracking
```

---

### 5. Zone Transfer Issues

**Symptoms**: Secondary servers have stale or unsigned data

**Detection**:
```bash
# Compare SOA serials
dig @ns1.example.com example.com SOA +short
dig @ns2.example.com example.com SOA +short

# Check DNSSEC status on secondary
dig @ns2.example.com +dnssec example.com
```

**Fix**:
```bash
# Force zone transfer
rndc retransfer example.com

# Check transfer logs
grep "transfer of" /var/log/named/xfer.log
```

---

## Testing Your DNSSEC Configuration

### Comprehensive Testing Checklist

```bash
#!/bin/bash
# DNSSEC Testing Script

DOMAIN="example.com"

echo "=== DNSSEC Configuration Test ==="
echo "Domain: $DOMAIN"
echo

# 1. Check DNSKEY records
echo "1. DNSKEY Records:"
dig +short $DOMAIN DNSKEY | while read flags proto algo key; do
    echo "   Algorithm: $algo, Flags: $flags"
done
echo

# 2. Check signatures
echo "2. Signature Validity:"
dig +short $DOMAIN RRSIG A | head -1 | \
    awk '{print "   Expires: " $5 ", Inception: " $6}'
echo

# 3. Check DS at parent
echo "3. DS Records at Parent:"
dig +short $DOMAIN DS | while read keytag algo dtype digest; do
    echo "   KeyTag: $keytag, Algorithm: $algo, Digest Type: $dtype"
done
echo

# 4. Validate chain of trust
echo "4. Validation Chain:"
delv $DOMAIN 2>&1 | grep -E "(fully validated|unsigned|bogus)"
echo

# 5. Check NSEC3 parameters
echo "5. NSEC3 Parameters:"
dig +short $DOMAIN NSEC3PARAM
echo

# 6. Test from multiple resolvers
echo "6. External Validation:"
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
    result=$(dig @$resolver +dnssec +short $DOMAIN A 2>/dev/null)
    if [ -n "$result" ]; then
        echo "   $resolver: OK"
    else
        echo "   $resolver: FAILED"
    fi
done
echo

echo "=== Test Complete ==="
```

---

## Disaster Recovery

### Key Loss Recovery

If all keys are lost without backup:

1. **Generate new keys**:
```bash
dnssec-keygen -a ECDSAP256SHA256 -f KSK example.com
dnssec-keygen -a ECDSAP256SHA256 example.com
```

2. **Re-sign zone**:
```bash
dnssec-signzone -o example.com zone.db
```

3. **Update DS at parent** (will cause validation failures until propagated)

4. **Monitor recovery**:
```bash
# Wait for old DS TTL to expire
# Monitor validation status
while true; do
    delv example.com && break
    sleep 60
done
```

### Signature Expiry Recovery

If signatures have already expired:

1. **Immediately re-sign**:
```bash
rndc sign example.com
```

2. **If automatic signing fails**:
```bash
# Manual emergency sign
dnssec-signzone -o example.com -e +3600 zone.db
rndc reload example.com
```

3. **Verify recovery**:
```bash
dig +dnssec example.com | grep -E "(RRSIG|SERVFAIL)"
```

---

## Integration with OneUptime

OneUptime can help monitor your DNSSEC deployment:

1. **DNS Monitoring**: Configure DNS monitors to check DNSSEC-enabled domains
2. **Custom Monitors**: Create scripts to check signature expiry
3. **Alerting**: Set up alerts for validation failures
4. **Incident Management**: Track DNSSEC-related incidents
5. **Status Page**: Communicate DNSSEC issues to stakeholders

```bash
# Example: OneUptime API integration for DNSSEC monitoring
curl -X POST https://api.oneuptime.com/monitors \
  -H "Authorization: Bearer $ONEUPTIME_API_KEY" \
  -d '{
    "name": "DNSSEC Signature Monitor",
    "type": "script",
    "script": "dig +dnssec example.com | grep RRSIG",
    "interval": "5m",
    "alertThreshold": 2
  }'
```

---

## Conclusion

DNSSEC hardening is not a one-time task but an ongoing process. The key principles are:

1. **Use modern cryptography**: ECDSA P-256 or Ed25519
2. **Automate everything**: Key rotation, re-signing, monitoring
3. **Monitor continuously**: Signature expiry, validation failures
4. **Test regularly**: Validation chain, disaster recovery
5. **Document thoroughly**: Procedures, contacts, escalation paths

A well-hardened DNSSEC deployment provides strong protection against DNS-based attacks while minimizing operational risk. Combined with comprehensive monitoring through platforms like OneUptime, you can maintain high availability and security for your DNS infrastructure.

### Quick Reference Commands

```bash
# Check DNSSEC status
dig +dnssec example.com

# Validate chain of trust
delv example.com

# Check signature expiry
dig +short example.com RRSIG | head -1

# View DS records
dig +short example.com DS

# Test from Google DNS
dig @8.8.8.8 +dnssec example.com

# Force re-sign (BIND)
rndc sign example.com

# Show zone keys (PowerDNS)
pdnsutil show-zone example.com
```

Remember: DNSSEC is only as strong as its weakest configuration. Regular audits, automated monitoring, and tested recovery procedures are essential for maintaining a secure DNS infrastructure.

---
