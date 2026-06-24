# How to Manage DNSSEC DS Records for IPv6 Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, DS Records, Delegation Signer, DNS, IPv6, Key Management

Description: Generate, publish, and manage DNSSEC DS (Delegation Signer) records for IPv6 DNS zones to establish a complete chain of trust from root to authoritative zone.

## What Are DS Records?

DS (Delegation Signer) records live in the parent zone and create the chain of trust to the child zone:

```text
Root zone         → DS for .com
.com zone         → DS for example.com
example.com zone  → Contains AAAA, MX, etc. (DNSSEC-signed)
```

The DS record typically contains a hash of the child zone's KSK (DNSKEY with flags 257). When a resolver validates `example.com`, it:
1. Fetches DS record from `.com`
2. Fetches DNSKEY from `example.com`
3. Hashes the KSK and compares to DS

## DS Record Format

```text
; DS record format:
; <name> <ttl> IN DS <key-tag> <algorithm> <digest-type> <digest>

example.com.  3600 IN DS  12345  13  2  a1b2c3d4e5f6...

; Fields:
; 12345 = Key Tag (identifies which KSK)
; 13    = Algorithm (13 = ECDSAP256SHA256)
; 2     = Digest Type (1=SHA-1, 2=SHA-256, 4=SHA-384)
; a1b2c3d4... = Hash of the KSK DNSKEY record
```

## Generating DS Records from KSK

```bash
# Method 1: dnssec-dsfromkey (from .key file)

dnssec-dsfromkey Kexample.com.+013+YYYYY.key

# Output (default: SHA-256, digest type 2):
# example.com. IN DS 12345 13 2 <SHA-256 hash>

# Generate multiple digest types if needed
dnssec-dsfromkey -a SHA-256 -a SHA-384 Kexample.com.+013+YYYYY.key

# Generate only SHA-256 (recommended, digest type 2)
dnssec-dsfromkey -2 Kexample.com.+013+YYYYY.key

# Method 2: From signed zone (extracts from DNSKEY record)
dnssec-dsfromkey -2 -f example.com.zone.signed example.com

# Method 3: From live DNSKEY query
dig DNSKEY example.com @localhost | dnssec-dsfromkey -f - example.com
```

## Submitting DS Records to Registrar

```bash
# Step 1: Export DS record
DS_RECORD=$(dnssec-dsfromkey -2 Kexample.com.+013+YYYYY.key)
echo "DS record to submit:"
echo "${DS_RECORD}"

# Step 2: Parse fields for registrar portal
# dnssec-dsfromkey omits TTL unless you add -T
KEY_TAG=$(echo "${DS_RECORD}" | awk '{print $4}')
ALGORITHM=$(echo "${DS_RECORD}" | awk '{print $5}')
DIGEST_TYPE=$(echo "${DS_RECORD}" | awk '{print $6}')
DIGEST=$(echo "${DS_RECORD}" | awk '{print $7}')

echo ""
echo "Registrar form fields:"
echo "  Key Tag:     ${KEY_TAG}"
echo "  Algorithm:   ${ALGORITHM}"
echo "  Digest Type: ${DIGEST_TYPE} (2=SHA-256)"
echo "  Digest:      ${DIGEST}"

# Step 3: Submit via your registrar's web portal or API
# Registrar APIs vary; if you automate this step, send the four DS
# fields above using the format your registrar expects.
```

## Verifying DS Record Publication

```bash
# Check DS record at parent nameserver
dig DS example.com @a.gtld-servers.net

# Verify the hash matches your KSK
PARENT_NS="a.gtld-servers.net"
LOCAL_HASH=$(dnssec-dsfromkey -2 Kexample.com.+013+YYYYY.key | awk '{print $7}')
PUBLISHED_HASHES=$(dig +short DS example.com @"${PARENT_NS}" | awk '{print $4}')

if echo "${PUBLISHED_HASHES}" | grep -qx "${LOCAL_HASH}"; then
    echo "PASS: DS record matches KSK"
else
    echo "FAIL: DS record mismatch!"
    echo "  Local:     ${LOCAL_HASH}"
    echo "  Published: ${PUBLISHED_HASHES}"
fi

# Full chain validation test
dig +dnssec A www.example.com | grep -E "flags:|RRSIG|NSEC"
# When querying a validating recursive resolver, look for 'ad' in the response flags
```

## Managing DS During Key Rollover

```text
KSK Rollover process with DS records:

Phase 1: Prepare
  - Generate new KSK (new-KSK)
  - Publish new-KSK in zone alongside old-KSK (both in DNSKEY RRset)
  - Wait for TTL propagation

Phase 2: DS Transition
  - Submit new DS record to registrar (for new-KSK)
  - Wait for the parent DS TTL to age out in caches
  - Verify new DS is published

Phase 3: Cleanup
  - Remove old KSK from zone
  - Verify DNSSEC validation still works
```

```bash
#!/bin/bash
# ksk-rollover-add-new.sh - Phase 1: Add new KSK

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"

# Generate new KSK
NEW_KSK=$(dnssec-keygen -K "${KEY_DIR}" -a ECDSAP256SHA256 -n ZONE -f KSK "${ZONE}" | tail -1)

echo "New KSK generated: ${NEW_KSK}"
echo "New DS records:"
dnssec-dsfromkey -2 "${KEY_DIR}/${NEW_KSK}.key"
echo ""
echo "ACTION REQUIRED:"
echo "  1. Submit the above DS record to your registrar"
echo "  2. Wait for the parent DS TTL to age out in caches"
echo "     (check: dig +noall +answer DS ${ZONE} @<parent-ns>)"
echo "  3. Then run ksk-rollover-remove-old.sh"

# If named manages DNSSEC for the zone, load the new key and sign with it
rndc sign "${ZONE}"
```

## DS Record Monitoring

```bash
#!/bin/bash
# monitor-ds.sh - Alert if DS records are missing or mismatched

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"
PARENT_NS="a.gtld-servers.net"

# Get DS from parent
PARENT_DS=$(dig +short DS "${ZONE}" @"${PARENT_NS}" 2>/dev/null)

if [ -z "${PARENT_DS}" ]; then
    echo "CRITICAL: No DS record found at parent for ${ZONE}"
    exit 2
fi

echo "Published DS records:"
echo "${PARENT_DS}"

# Get current KSK hashes
for keyfile in "${KEY_DIR}"/K"${ZONE}".+*.key; do
    [ -e "${keyfile}" ] || continue

    local_hash=$(dnssec-dsfromkey -2 "${keyfile}" 2>/dev/null | awk '{print $7}')
    [ -n "${local_hash}" ] || continue

    if echo "${PARENT_DS}" | awk '{print $4}' | grep -qx "${local_hash}"; then
        echo "OK: KSK hash ${local_hash:0:16}... found in parent DS"
    else
        echo "WARNING: KSK hash ${local_hash:0:16}... NOT in parent DS"
    fi
done
```

## Conclusion

DS records are the glue that connects a signed child zone to its parent in the DNSSEC chain of trust. Generate DS records from the KSK `.key` file using `dnssec-dsfromkey -2` (SHA-256, digest type 2 - avoid SHA-1). Submit the DS record to your registrar via their web portal or API. During KSK rollover, the DS transition is the critical step - add the new DS before removing the old KSK, and wait for the parent DS TTL to age out in caches before completing the rollover. Monitor DS publication with `dig DS @parent-ns` and alert if the published DS hash doesn't match any active KSK.
