# How to Perform a DNSSEC ZSK (Zone Signing Key) Rollover

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Security, Key Management, Infrastructure, DevOps

Description: A comprehensive guide to performing DNSSEC Zone Signing Key (ZSK) rollovers safely, covering pre-roll, double-signature, and automated methods to maintain DNS security without service disruption.

---

## Introduction

DNSSEC (Domain Name System Security Extensions) is a critical security protocol that adds cryptographic signatures to DNS records, protecting against various attacks such as cache poisoning and man-in-the-middle attacks. At the heart of DNSSEC are two types of keys: the Key Signing Key (KSK) and the Zone Signing Key (ZSK).

The ZSK is used to sign the actual DNS records in your zone, while the KSK signs the DNSKEY record set. Because the ZSK is used more frequently and is more exposed, it needs to be rotated (rolled over) more often than the KSK. This process is known as a ZSK rollover.

In this comprehensive guide, we will explore:

- Why ZSK rollovers are necessary
- The different methods for performing ZSK rollovers
- Step-by-step instructions for each method
- Automation strategies
- Common pitfalls and how to avoid them
- Best practices for maintaining DNSSEC security

## Why ZSK Rollovers Are Necessary

### Security Best Practices

Cryptographic keys should be rotated periodically to minimize the risk of compromise. The longer a key is in use, the more opportunities attackers have to attempt to break it. Regular key rotation limits the window of vulnerability.

### Compliance Requirements

Many security standards and compliance frameworks require periodic key rotation. Industries such as finance, healthcare, and government often mandate specific key rotation schedules.

### Algorithm Migration

As cryptographic algorithms evolve, you may need to migrate from older, potentially weaker algorithms to newer, stronger ones. ZSK rollovers provide the mechanism for this migration.

### Key Compromise Recovery

If you suspect or confirm that a ZSK has been compromised, an emergency rollover is necessary to restore the security of your DNS infrastructure.

## Understanding DNSSEC Key Types

Before diving into rollover procedures, let us clarify the key types involved:

### Zone Signing Key (ZSK)

- Signs individual DNS records (A, AAAA, MX, etc.)
- Smaller key size (typically 1024-2048 bits for RSA)
- Rotated more frequently (every 1-3 months)
- Not published in the parent zone

### Key Signing Key (KSK)

- Signs the DNSKEY record set
- Larger key size (typically 2048-4096 bits for RSA)
- Rotated less frequently (every 1-2 years)
- Hash (DS record) published in the parent zone

## ZSK Rollover Methods

There are three primary methods for performing a ZSK rollover:

1. **Pre-Publication Method** - Publish the new key before using it
2. **Double-Signature Method** - Sign with both old and new keys simultaneously
3. **Double-RRSIG Method** - Maintain signatures from both keys

Let us explore each method in detail.

---

## Method 1: Pre-Publication ZSK Rollover

The Pre-Publication method is the most commonly used approach for ZSK rollovers. It involves introducing the new ZSK into the zone before it starts signing records.

### How It Works

1. Generate a new ZSK
2. Publish the new ZSK in the DNSKEY record set (but do not use it for signing yet)
3. Wait for the new key to propagate
4. Start signing with the new ZSK
5. Remove signatures made with the old ZSK
6. Remove the old ZSK from the zone

### Timeline

```
Phase 1: Key Introduction
|-------- TTL + Propagation Time --------|

Phase 2: Signing Transition
|-------- Signature Validity Period -----|

Phase 3: Key Removal
|-------- TTL + Propagation Time --------|
```

### Step-by-Step Instructions

#### Step 1: Generate a New ZSK

Using BIND's `dnssec-keygen`:

```bash
# Generate a new ZSK for your zone
dnssec-keygen -a RSASHA256 -b 2048 -n ZONE example.com

# For ECDSA (recommended for modern deployments)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com
```

This will create two files:
- `Kexample.com.+008+12345.key` (public key)
- `Kexample.com.+008+12345.private` (private key)

#### Step 2: Add the New ZSK to Your Zone

Add the new public key to your zone file:

```bash
# Include the new key in your zone file
$INCLUDE /path/to/keys/Kexample.com.+008+12345.key
```

Or if using inline signing:

```bash
# Copy the new key files to your key directory
cp Kexample.com.+008+12345.* /var/named/keys/
```

#### Step 3: Reload the Zone

```bash
# For BIND
rndc reload example.com

# Verify the new key is published
dig @localhost example.com DNSKEY +dnssec
```

You should see both the old and new ZSK in the output:

```
example.com.    3600    IN    DNSKEY    256 3 8 (
                        AwEAAd... ; old ZSK
                        ) ; ZSK; alg = RSASHA256
example.com.    3600    IN    DNSKEY    256 3 8 (
                        BwFBBe... ; new ZSK
                        ) ; ZSK; alg = RSASHA256
```

#### Step 4: Wait for Propagation

Wait for at least:
- 2x DNSKEY TTL
- Plus any additional propagation delay

```bash
# Check the DNSKEY TTL
dig example.com DNSKEY | grep -E "^example.com.*DNSKEY"

# If TTL is 3600 seconds (1 hour), wait at least 2 hours
```

#### Step 5: Start Signing with the New ZSK

Mark the new ZSK as active and the old ZSK as inactive:

```bash
# Using dnssec-settime
dnssec-settime -I now Kexample.com.+008+OLD_KEY_ID
dnssec-settime -A now Kexample.com.+008+NEW_KEY_ID

# Reload to apply changes
rndc reload example.com
```

#### Step 6: Wait for Signature Expiration

Wait for all signatures made with the old key to expire:

```bash
# Check signature validity period in your configuration
# Default is typically 30 days

# Monitor signature expiration
dig example.com A +dnssec | grep -A 1 RRSIG
```

#### Step 7: Remove the Old ZSK

Once all old signatures have expired:

```bash
# Mark the old key for deletion
dnssec-settime -D now Kexample.com.+008+OLD_KEY_ID

# Or remove it from the zone file manually
# Then reload
rndc reload example.com
```

#### Step 8: Verify the Rollover

```bash
# Verify only the new ZSK is present
dig example.com DNSKEY +short

# Verify signatures are valid
dnssec-verify -o example.com example.com.signed

# Use external validation
dig example.com +dnssec +trace
```

---

## Method 2: Double-Signature ZSK Rollover

The Double-Signature method involves signing all records with both the old and new ZSK simultaneously during the transition period.

### How It Works

1. Generate a new ZSK
2. Sign all records with both old and new ZSK
3. Publish both keys and both sets of signatures
4. Wait for propagation
5. Remove the old ZSK and its signatures

### Advantages

- Simpler timing requirements
- No need to track signature validity separately
- Works well with short TTLs

### Disadvantages

- Doubles the zone size during transition
- Increased DNS response sizes
- Higher bandwidth consumption

### Step-by-Step Instructions

#### Step 1: Generate a New ZSK

```bash
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com
```

#### Step 2: Configure Dual Signing

In BIND's named.conf:

```conf
zone "example.com" {
    type master;
    file "/var/named/example.com.zone";
    key-directory "/var/named/keys";
    auto-dnssec maintain;
    inline-signing yes;
};
```

Add both keys to the key directory and set their timing:

```bash
# New key - active immediately
dnssec-settime -A now -I none Kexample.com.+013+NEW_ID

# Old key - still active
# (keep as is, will be deactivated later)
```

#### Step 3: Re-sign the Zone

```bash
# Force immediate re-signing
rndc sign example.com

# Or reload the zone
rndc reload example.com
```

#### Step 4: Verify Dual Signatures

```bash
# Check that records have multiple RRSIGs
dig example.com A +dnssec

# You should see two RRSIG records for each RRset
```

Example output:

```
example.com.    300    IN    A    192.0.2.1
example.com.    300    IN    RRSIG    A 8 2 300 (
                        20240315000000 20240215000000 12345 example.com.
                        ... ) ; old ZSK signature
example.com.    300    IN    RRSIG    A 8 2 300 (
                        20240315000000 20240215000000 67890 example.com.
                        ... ) ; new ZSK signature
```

#### Step 5: Wait for Cache Expiration

Wait for at least:
- Maximum TTL in your zone
- Plus propagation time

```bash
# Find the maximum TTL in your zone
grep -E "^\S+\s+[0-9]+" /var/named/example.com.zone | \
    awk '{print $2}' | sort -n | tail -1
```

#### Step 6: Remove the Old ZSK

```bash
# Mark old key as deleted
dnssec-settime -I now -D now Kexample.com.+008+OLD_ID

# Re-sign with only the new key
rndc sign example.com
```

#### Step 7: Verify Completion

```bash
# Verify only new key remains
dig example.com DNSKEY +dnssec

# Verify signatures
dig example.com A +dnssec
```

---

## Method 3: Double-RRSIG Method

The Double-RRSIG method is a variation where you maintain signatures from both keys but manage them independently.

### When to Use

- When you need precise control over signature timing
- During algorithm rollovers
- When zone size is a concern

### Implementation

This method requires more manual control and is typically handled by advanced DNS management systems.

```bash
# Generate signatures with specific validity periods
dnssec-signzone -o example.com \
    -S \
    -e +2592000 \
    -k Kexample.com.+008+KSK_ID \
    -k Kexample.com.+008+OLD_ZSK \
    -k Kexample.com.+008+NEW_ZSK \
    example.com.zone
```

---

## Automated ZSK Rollover

Modern DNS software supports automated key rollovers. Here is how to configure them:

### BIND Automated Rollover

#### Configuration

In `named.conf`:

```conf
options {
    directory "/var/named";
    dnssec-policy "standard";
};

dnssec-policy "standard" {
    keys {
        ksk key-directory lifetime unlimited algorithm ecdsap256sha256;
        zsk key-directory lifetime 90d algorithm ecdsap256sha256;
    };

    // Signature validity
    signatures-validity 14d;
    signatures-validity-dnskey 14d;

    // Timing parameters
    dnskey-ttl 3600;
    publish-safety 1h;
    retire-safety 1h;

    // Parent synchronization (for KSK)
    parent-ds-ttl 86400;
    parent-propagation-delay 1h;
};

zone "example.com" {
    type master;
    file "example.com.zone";
    dnssec-policy "standard";
    inline-signing yes;
};
```

#### Monitoring Automated Rollovers

```bash
# Check key states
rndc dnssec -status example.com

# View key timing
dnssec-settime -p all /var/named/keys/Kexample.com.*
```

### PowerDNS Automated Rollover

PowerDNS uses the `pdnsutil` command for key management:

```bash
# Enable DNSSEC
pdnsutil secure-zone example.com

# Set automatic rollover
pdnsutil set-meta example.com SOA-EDIT-API DEFAULT
pdnsutil set-meta example.com PRESIGNED 0

# Configure ZSK rollover interval (in seconds)
# 90 days = 7776000 seconds
pdnsutil set-meta example.com ZSK-ROLLOVER-INTERVAL 7776000
```

### Knot DNS Automated Rollover

In `knot.conf`:

```yaml
policy:
  - id: automatic
    algorithm: ecdsap256sha256
    ksk-size: 256
    zsk-size: 256
    zsk-lifetime: 90d
    ksk-lifetime: 0  # unlimited
    propagation-delay: 1h
    rrsig-lifetime: 14d
    rrsig-refresh: 7d

zone:
  - domain: example.com
    file: example.com.zone
    dnssec-signing: on
    dnssec-policy: automatic
```

---

## Automation Scripts

### Bash Script for Manual Pre-Publication Rollover

```bash
#!/bin/bash
# ZSK Pre-Publication Rollover Script

ZONE="example.com"
KEY_DIR="/var/named/keys"
ALGORITHM="ECDSAP256SHA256"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to get current active ZSK
get_active_zsk() {
    for keyfile in ${KEY_DIR}/K${ZONE}.+*.key; do
        if grep -q "ZSK" "$keyfile" && \
           dnssec-settime -p A "$keyfile" | grep -q "A:"; then
            basename "$keyfile" .key
        fi
    done
}

# Step 1: Generate new ZSK
log "Generating new ZSK..."
NEW_KEY=$(dnssec-keygen -K "$KEY_DIR" -a "$ALGORITHM" -n ZONE "$ZONE")
log "New key generated: $NEW_KEY"

# Step 2: Set timing for new key (publish now, activate in 1 hour)
log "Setting key timing..."
dnssec-settime -P now -A +3600 "${KEY_DIR}/${NEW_KEY}"

# Step 3: Reload zone
log "Reloading zone..."
rndc reload "$ZONE"

# Step 4: Wait for propagation
DNSKEY_TTL=$(dig "$ZONE" DNSKEY +short | head -1 | awk '{print $1}')
WAIT_TIME=$((DNSKEY_TTL * 2 + 300))
log "Waiting ${WAIT_TIME} seconds for propagation..."
sleep "$WAIT_TIME"

# Step 5: Verify new key is visible
log "Verifying new key publication..."
if dig @localhost "$ZONE" DNSKEY | grep -q "$NEW_KEY"; then
    log "New key is published and visible"
else
    log "ERROR: New key not visible. Aborting."
    exit 1
fi

# Step 6: Activate new key (should happen automatically based on timing)
log "New key should now be active based on timing settings"

# Step 7: Get old ZSK and schedule removal
OLD_KEY=$(get_active_zsk | grep -v "$NEW_KEY")
if [ -n "$OLD_KEY" ]; then
    log "Scheduling old key ($OLD_KEY) for removal..."
    dnssec-settime -I +86400 -D +172800 "${KEY_DIR}/${OLD_KEY}"
fi

log "ZSK rollover initiated successfully"
log "Old signatures will expire and old key will be removed automatically"
```

### Python Script for Monitoring ZSK Status

```python
#!/usr/bin/env python3
"""
DNSSEC ZSK Monitoring Script
Monitors key states and alerts on potential issues
"""

import subprocess
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class DNSSECKeyMonitor:
    def __init__(self, zone: str, key_directory: str):
        self.zone = zone
        self.key_directory = key_directory

    def get_key_timing(self, keyfile: str) -> Dict[str, Optional[datetime]]:
        """Extract timing information from a key file."""
        cmd = ['dnssec-settime', '-p', 'all', keyfile]
        result = subprocess.run(cmd, capture_output=True, text=True)

        timing = {
            'created': None,
            'publish': None,
            'activate': None,
            'inactive': None,
            'delete': None
        }

        for line in result.stdout.split('\n'):
            for field in timing.keys():
                if line.startswith(f'{field[0].upper()}:'):
                    date_str = line.split(':', 1)[1].strip()
                    if date_str and date_str != 'UNSET':
                        timing[field] = datetime.strptime(
                            date_str, '%Y%m%d%H%M%S'
                        )

        return timing

    def get_all_zsks(self) -> List[Dict]:
        """Get all ZSKs for the zone."""
        import glob

        zsks = []
        pattern = f'{self.key_directory}/K{self.zone}.+*.key'

        for keyfile in glob.glob(pattern):
            with open(keyfile, 'r') as f:
                content = f.read()

            # ZSK has flags = 256
            if '256 3' in content:
                key_id = keyfile.split('+')[-1].replace('.key', '')
                timing = self.get_key_timing(keyfile.replace('.key', ''))

                zsks.append({
                    'file': keyfile,
                    'key_id': key_id,
                    'timing': timing,
                    'state': self._determine_state(timing)
                })

        return zsks

    def _determine_state(self, timing: Dict) -> str:
        """Determine the current state of a key."""
        now = datetime.now()

        if timing['delete'] and timing['delete'] <= now:
            return 'deleted'
        if timing['inactive'] and timing['inactive'] <= now:
            return 'inactive'
        if timing['activate'] and timing['activate'] <= now:
            if timing['publish'] and timing['publish'] <= now:
                return 'active'
        if timing['publish'] and timing['publish'] <= now:
            return 'published'

        return 'pending'

    def check_rollover_status(self) -> Dict:
        """Check the overall rollover status."""
        zsks = self.get_all_zsks()

        active_keys = [k for k in zsks if k['state'] == 'active']
        published_keys = [k for k in zsks if k['state'] == 'published']
        inactive_keys = [k for k in zsks if k['state'] == 'inactive']

        status = {
            'zone': self.zone,
            'timestamp': datetime.now().isoformat(),
            'active_zsks': len(active_keys),
            'published_zsks': len(published_keys),
            'inactive_zsks': len(inactive_keys),
            'rollover_in_progress': len(published_keys) > 0,
            'warnings': [],
            'keys': zsks
        }

        # Check for potential issues
        if len(active_keys) == 0:
            status['warnings'].append('CRITICAL: No active ZSK found!')

        if len(active_keys) > 1:
            status['warnings'].append(
                'WARNING: Multiple active ZSKs (expected during rollover)'
            )

        for key in active_keys:
            if key['timing']['inactive']:
                days_until_inactive = (
                    key['timing']['inactive'] - datetime.now()
                ).days
                if days_until_inactive < 7:
                    status['warnings'].append(
                        f'WARNING: Key {key["key_id"]} will become '
                        f'inactive in {days_until_inactive} days'
                    )

        return status

    def print_status(self):
        """Print a formatted status report."""
        status = self.check_rollover_status()

        print(f"DNSSEC ZSK Status for {status['zone']}")
        print(f"Timestamp: {status['timestamp']}")
        print("-" * 50)
        print(f"Active ZSKs: {status['active_zsks']}")
        print(f"Published ZSKs: {status['published_zsks']}")
        print(f"Inactive ZSKs: {status['inactive_zsks']}")
        print(f"Rollover in Progress: {status['rollover_in_progress']}")
        print("-" * 50)

        if status['warnings']:
            print("WARNINGS:")
            for warning in status['warnings']:
                print(f"  - {warning}")
        else:
            print("No warnings - all systems nominal")

        print("-" * 50)
        print("Key Details:")
        for key in status['keys']:
            print(f"\n  Key ID: {key['key_id']}")
            print(f"  State: {key['state']}")
            print(f"  Timing:")
            for field, value in key['timing'].items():
                if value:
                    print(f"    {field}: {value}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <zone> <key_directory>")
        sys.exit(1)

    monitor = DNSSECKeyMonitor(sys.argv[1], sys.argv[2])
    monitor.print_status()
```

### Ansible Playbook for ZSK Rollover

```yaml
---
# ansible-playbook zsk-rollover.yml -e "zone=example.com"

- name: DNSSEC ZSK Rollover
  hosts: dns_servers
  become: yes
  vars:
    key_directory: /var/named/keys
    algorithm: ECDSAP256SHA256
    propagation_wait: 7200  # 2 hours

  tasks:
    - name: Get current ZSK information
      command: >
        dnssec-settime -p all
        {{ key_directory }}/K{{ zone }}.+*.key
      register: current_keys
      changed_when: false

    - name: Generate new ZSK
      command: >
        dnssec-keygen -K {{ key_directory }}
        -a {{ algorithm }} -n ZONE {{ zone }}
      register: new_key

    - name: Set new key timing (publish now, activate later)
      command: >
        dnssec-settime -P now -A +{{ propagation_wait }}
        {{ key_directory }}/{{ new_key.stdout }}

    - name: Reload zone to publish new key
      command: rndc reload {{ zone }}

    - name: Wait for propagation
      pause:
        seconds: "{{ propagation_wait }}"
        prompt: "Waiting for key propagation..."

    - name: Verify new key is published
      command: dig {{ zone }} DNSKEY +short
      register: dnskey_check
      failed_when: new_key.stdout.split('+')[-1] not in dnskey_check.stdout

    - name: Find old ZSK files
      find:
        paths: "{{ key_directory }}"
        patterns: "K{{ zone }}.+*.key"
      register: all_keys

    - name: Schedule old key removal
      command: >
        dnssec-settime -I +86400 -D +172800
        {{ item.path | regex_replace('.key$', '') }}
      loop: "{{ all_keys.files }}"
      when:
        - new_key.stdout not in item.path
        - "'ZSK' in lookup('file', item.path)"

    - name: Final zone reload
      command: rndc reload {{ zone }}

    - name: Verify DNSSEC validation
      command: dig +dnssec +trace {{ zone }} A
      register: validation
      failed_when: "'SERVFAIL' in validation.stdout"
```

---

## Troubleshooting Common Issues

### Issue 1: Validation Failures During Rollover

**Symptoms:**
- DNS queries return SERVFAIL
- Resolvers report validation errors

**Causes:**
- TTL not expired before key removal
- Incorrect timing parameters
- Propagation delays

**Solution:**

```bash
# Check current signatures
dig example.com DNSKEY +dnssec

# Verify signature validity
dnssec-verify -o example.com db.example.com

# Check for timing issues
dnssec-settime -p all /var/named/keys/K example.com.*

# Force re-signing if needed
rndc sign example.com
```

### Issue 2: Zone Size Growth

**Symptoms:**
- DNS responses exceed UDP size limits
- Increased TCP fallback

**Solution:**

```bash
# Use ECDSA instead of RSA for smaller signatures
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com

# Or reduce signature validity to decrease zone size
# In named.conf:
dnssec-policy "compact" {
    signatures-validity 7d;
    signatures-validity-dnskey 7d;
};
```

### Issue 3: Timing Calculation Errors

**Symptoms:**
- Keys activated before propagation complete
- Old keys removed while signatures still valid

**Solution:**

```bash
# Calculate correct timing:
# Publication time = max(DNSKEY TTL, zone propagation delay)
# Activation delay = Publication time + safety margin
# Removal delay = Activation time + max signature validity

# Example for TTL=3600, propagation=1800, signature=2592000:
# Publish: now
# Activate: now + 7200 (2 hours)
# Inactive: now + 2599200 (30 days + 2 hours)
# Delete: now + 2606400 (30 days + 4 hours)

dnssec-settime -P now \
               -A +7200 \
               -I +2599200 \
               -D +2606400 \
               Kexample.com.+013+12345
```

### Issue 4: Algorithm Mismatch

**Symptoms:**
- New signatures not matching key algorithm
- Resolver validation failures

**Solution:**

```bash
# Verify algorithm consistency
for key in /var/named/keys/K example.com.+*.key; do
    echo "Key: $key"
    grep -E "DNSKEY\s+256|257" "$key" | awk '{print "Algorithm:", $6}'
done

# Ensure all ZSKs use the same algorithm
# or perform an algorithm rollover instead
```

---

## Security Considerations

### Key Storage

- Store private keys with restricted permissions (600 or 640)
- Use encrypted filesystems for key storage
- Consider Hardware Security Modules (HSMs) for high-security deployments

```bash
# Verify key permissions
ls -la /var/named/keys/
# Should show: -rw------- for .private files

# Fix permissions if needed
chmod 600 /var/named/keys/*.private
chown named:named /var/named/keys/*
```

### Key Backup

Always maintain secure backups of your keys:

```bash
# Create encrypted backup
tar czf - /var/named/keys/ | \
    gpg --symmetric --cipher-algo AES256 > keys-backup.tar.gz.gpg

# Verify backup
gpg -d keys-backup.tar.gz.gpg | tar tzf -
```

### Audit Logging

Enable logging for key operations:

```conf
# In named.conf
logging {
    channel dnssec_log {
        file "/var/log/named/dnssec.log" versions 10 size 10m;
        severity info;
        print-time yes;
        print-category yes;
    };

    category dnssec { dnssec_log; };
};
```

---

## Best Practices

### 1. Plan Your Rollover Schedule

Create a calendar-based schedule for regular rollovers:

| Key Type | Rollover Frequency | Lead Time |
|----------|-------------------|-----------|
| ZSK | Every 90 days | 2 weeks |
| KSK | Every 1-2 years | 1 month |

### 2. Test in Staging First

Always test rollover procedures in a staging environment:

```bash
# Set up a test zone
cp /var/named/example.com.zone /var/named/test.example.com.zone

# Perform rollover in test zone first
# Verify with: dnssec-verify, dig +dnssec, external validators
```

### 3. Monitor Continuously

Set up monitoring for:
- Key expiration dates
- Signature validity periods
- DNSSEC validation status
- Response sizes

### 4. Document Everything

Maintain documentation for:
- Current key inventory
- Rollover history
- Emergency procedures
- Contact information for escalation

### 5. Use Strong Algorithms

Recommended algorithms (as of 2024):
- **Preferred:** ECDSAP256SHA256 (Algorithm 13)
- **Alternative:** ECDSAP384SHA384 (Algorithm 14)
- **Legacy:** RSASHA256 (Algorithm 8) with 2048+ bits

---

## Summary Table: ZSK Rollover Methods Comparison

| Aspect | Pre-Publication | Double-Signature | Double-RRSIG |
|--------|----------------|------------------|--------------|
| **Complexity** | Medium | Low | High |
| **Zone Size Impact** | Minimal | 2x during transition | Moderate |
| **Timing Precision** | Critical | Less critical | Very critical |
| **Best For** | Most deployments | Short TTL zones | Algorithm rollovers |
| **Risk Level** | Low | Low | Medium |
| **Automation Support** | Excellent | Good | Limited |
| **Rollback Difficulty** | Easy | Easy | Moderate |

### Timeline Comparison

| Phase | Pre-Publication | Double-Signature |
|-------|----------------|------------------|
| Key Generation | Immediate | Immediate |
| Key Publication | Immediate | Immediate |
| Dual Operation Period | DNSKEY TTL x 2 | Max zone TTL |
| Signing Transition | Immediate | N/A (always dual) |
| Old Key Removal | After sig expiry | After TTL expiry |
| **Total Duration** | ~30-35 days | ~2-7 days |

### Recommended Timing Parameters

| Parameter | Recommended Value | Notes |
|-----------|-------------------|-------|
| DNSKEY TTL | 1-24 hours | Balance between security and flexibility |
| Signature Validity | 14-30 days | Longer = more resilient to issues |
| Publish-to-Active Delay | 2x DNSKEY TTL | Ensures propagation complete |
| Inactive-to-Delete Delay | 2x Signature Validity | Ensures all signatures expired |
| Safety Margin | 1-2 hours | Buffer for unexpected delays |

---

## Conclusion

Performing a DNSSEC ZSK rollover is a critical maintenance task that ensures the ongoing security of your DNS infrastructure. While the process may seem complex, understanding the underlying principles and following a systematic approach makes it manageable.

Key takeaways:

1. **Choose the right method** for your environment - Pre-Publication for most cases, Double-Signature for rapid transitions
2. **Automate when possible** using built-in DNS server features or custom scripts
3. **Monitor continuously** to catch issues early
4. **Test thoroughly** in staging before production rollovers
5. **Document everything** for reproducibility and incident response

By following the guidelines and best practices outlined in this guide, you can maintain a robust DNSSEC implementation that protects your users from DNS-based attacks while ensuring uninterrupted service availability.

---

## Additional Resources

- [RFC 6781: DNSSEC Operational Practices](https://tools.ietf.org/html/rfc6781)
- [RFC 7583: DNSSEC Key Rollover Timing Considerations](https://tools.ietf.org/html/rfc7583)
- [BIND 9 Administrator Reference Manual](https://bind9.readthedocs.io/)
- [PowerDNS Documentation](https://doc.powerdns.com/)
- [Knot DNS Documentation](https://www.knot-dns.cz/docs/)
- [DNSSEC Deployment Guide by NIST](https://csrc.nist.gov/publications/detail/sp/800-81/2/final)

---

## About OneUptime

OneUptime is a comprehensive observability platform that helps you monitor your entire infrastructure, including DNS and DNSSEC health. With OneUptime, you can:

- Monitor DNSSEC validation status across your domains
- Set up alerts for key expiration and rollover events
- Track DNS response times and availability
- Integrate DNS monitoring with your overall infrastructure observability

Learn more at [oneuptime.com](https://oneuptime.com)
