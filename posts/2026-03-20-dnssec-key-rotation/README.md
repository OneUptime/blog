# How to Automate DNSSEC Key Rotation for IPv6 Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, Key Rotation, ZSK, KSK, Automation, BIND, DNS Security

Description: Automate DNSSEC Zone Signing Key (ZSK) and Key Signing Key (KSK) rotation with pre-publication, DS transitions, and monitoring to maintain continuous DNSSEC validation.

## Key Rotation Overview

| Key | Frequency | Method | Critical Step |
|---|---|---|---|
| ZSK | Every 90 days | Pre-publication | Pre-publish the new DNSKEY, then wait one DNSKEY TTL before switching |
| KSK | Every 1-2 years | Double-KSK | Update DS at parent, then wait for the old DS TTL to expire |

Key rotation must be done carefully - a mistake can break DNSSEC validation for your zone, causing SERVFAIL for validating resolvers.

## ZSK Rotation: Pre-Publication Method

```text
Timeline:
Day 0:    Generate new ZSK and publish it in the DNSKEY RRset
Day 0-7:  Wait at least one DNSKEY TTL
Day 7:    Start signing with new ZSK (old ZSK still published)
Day 7-14: Wait at least one maximum zone TTL
Day 14:   Remove old ZSK from zone
```

For manual signing, `named` must be configured to load the `.signed` output file produced by `dnssec-signzone`, not the unsigned source zone file.

```bash
#!/bin/bash
# zsk-rotation.sh - Start a manual ZSK pre-publication rollover

set -euo pipefail

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"
ZONE_FILE="/var/named/${ZONE}.zone"
SIGNED_ZONE_FILE="${ZONE_FILE}.signed"
PREPUB_INTERVAL="7d"   # Example: must be at least the DNSKEY TTL

# Find the current active ZSK
old_zsk=$(basename "$(grep -l "DNSKEY 256 3" "${KEY_DIR}"/K"${ZONE}".+*.key | head -1)" .key)

# Retire the current ZSK after the prepublication interval, and delete it
# one example max-zone-TTL later.
dnssec-settime -K "${KEY_DIR}" -I "+${PREPUB_INTERVAL}" -D "+14d" "${old_zsk}"

# Generate a successor ZSK with the same parameters and timing metadata.
new_zsk=$(dnssec-keygen -K "${KEY_DIR}" -S "${old_zsk}" -i "${PREPUB_INTERVAL}" "${ZONE}")

# Smart signing publishes the new ZSK immediately, but keeps signing with
# the old ZSK until the activation date is reached.
dnssec-signzone \
    -S -K "${KEY_DIR}" -N increment \
    -o "${ZONE}" \
    "${ZONE_FILE}"

dnssec-verify "${SIGNED_ZONE_FILE}"
rndc reload "${ZONE}"

echo "Phase 1 complete: old ZSK still signs the zone, new ZSK is published"
echo "Old ZSK: ${old_zsk}"
echo "New ZSK: ${new_zsk}"
echo "WAIT: At least one DNSKEY TTL before the follow-up re-sign"
```

## ZSK Rotation: Follow-Up Re-Sign

```bash
#!/bin/bash
# zsk-rotation-followup.sh - Re-sign after the prepublication and delete dates

set -euo pipefail

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"
ZONE_FILE="/var/named/${ZONE}.zone"
SIGNED_ZONE_FILE="${ZONE_FILE}.signed"

# After the old ZSK's inactive date, this switches signatures to the new ZSK.
# After the old ZSK's delete date, this also removes the old DNSKEY.
dnssec-signzone \
    -S -Q -K "${KEY_DIR}" -N increment \
    -o "${ZONE}" \
    "${ZONE_FILE}"

dnssec-verify "${SIGNED_ZONE_FILE}"
rndc reload "${ZONE}"

echo "Follow-up signing complete"
echo "Run this once after the DNSKEY TTL to activate the new ZSK,"
echo "and again after the old key's delete date to remove the old DNSKEY."
dig +dnssec DNSKEY "${ZONE}" @localhost
```

## KSK Rotation: Double-KSK Method

```bash
#!/bin/bash
# ksk-rotation.sh - KSK rotation (requires DS update at registrar)

set -euo pipefail

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"
ZONE_FILE="/var/named/${ZONE}.zone"
SIGNED_ZONE_FILE="${ZONE_FILE}.signed"
PREPUB_INTERVAL="30d"  # Example: size this to your DNSKEY and parent/DS TTLs
PARENT_SERVER="a.gtld-servers.net"

# Phase 1: Generate new KSK
echo "=== Phase 1: Generate new KSK ==="
old_ksk=$(basename "$(grep -l "DNSKEY 257 3" "${KEY_DIR}"/K"${ZONE}".+*.key | head -1)" .key)

# Keep the current KSK published long enough for the new DS to appear and
# for the old DS to age out of caches.
dnssec-settime -K "${KEY_DIR}" -I "+${PREPUB_INTERVAL}" -D "+60d" "${old_ksk}"

new_ksk=$(dnssec-keygen -K "${KEY_DIR}" -S "${old_ksk}" -i "${PREPUB_INTERVAL}" "${ZONE}")
echo "New KSK: ${new_ksk}"
echo ""

# Generate DS record for new KSK
echo "New DS record (submit to registrar):"
dnssec-dsfromkey -2 -K "${KEY_DIR}" "${new_ksk}"
echo ""

echo "=== Phase 2: Sign with BOTH KSKs ==="
# Smart signing publishes the new KSK immediately, but keeps signing the
# DNSKEY RRset with the old KSK until the activation date is reached.
dnssec-signzone \
    -S -K "${KEY_DIR}" -N increment \
    -o "${ZONE}" \
    "${ZONE_FILE}"

dnssec-verify "${SIGNED_ZONE_FILE}"
rndc reload "${ZONE}"
echo "Both KSKs in zone - submit new DS record to registrar NOW"
echo "WAIT: At least one DNSKEY TTL before changing the DS at the parent"
echo "CHECK: dig +short DS ${ZONE} @${PARENT_SERVER}"
```

```bash
#!/bin/bash
# ksk-rotation-followup.sh - Re-sign after the DS transition

set -euo pipefail

ZONE="example.com"
KEY_DIR="/var/named/keys/${ZONE}"
ZONE_FILE="/var/named/${ZONE}.zone"
SIGNED_ZONE_FILE="${ZONE_FILE}.signed"
PARENT_SERVER="a.gtld-servers.net"

# Verify the DS RRset at the parent before and after removing the old KSK
echo "Checking DS RRset at the parent..."
dig +short DS "${ZONE}" @"${PARENT_SERVER}"

# After the old KSK's inactive date, this switches DNSKEY signatures to
# the new KSK. After the old KSK's delete date, this removes the old KSK.
dnssec-signzone \
    -S -Q -K "${KEY_DIR}" -N increment \
    -o "${ZONE}" \
    "${ZONE_FILE}"

dnssec-verify "${SIGNED_ZONE_FILE}"
rndc reload "${ZONE}"

echo "Follow-up signing complete"
echo "Only remove or archive the old KSK after its DS record is no longer"
echo "published by the parent and the signed zone verifies cleanly."
dig +dnssec DNSKEY "${ZONE}" @localhost
```

## BIND: Automated Key Rollover

```text
// BIND 9.16+ supports dnssec-policy; NSEC3 in dnssec-policy requires 9.16.9+
// /etc/named.conf

dnssec-policy "standard" {
    keys {
        ksk key-directory lifetime 1y algorithm ecdsap256sha256;
        zsk key-directory lifetime 90d algorithm ecdsap256sha256;
    };
    // NSEC3 configuration
    nsec3param iterations 0 optout no salt-length 0;

    // Signature validity
    signatures-validity 14d;
    signatures-refresh 5d;
};

zone "example.com" {
    type master;
    file "/var/named/example.com.zone";
    key-directory "/var/named/keys/example.com";
    dnssec-policy "standard";
    inline-signing yes;
};
```

```bash
# After editing named.conf
rndc reconfig

# BIND manages ZSK rollovers automatically and pauses KSK completion until
# DS publication at the parent has been confirmed.

# Check key rollover status
rndc dnssec -status example.com

# Roll a key early, if needed
rndc dnssec -rollover -key 12345 example.com

# After the new DS is visible at the parent
rndc dnssec -checkds -key 12345 published example.com

# After the old DS has been removed from the parent
rndc dnssec -checkds -key 54321 withdrawn example.com
```

## Monitoring Key Rollover Schedule

```bash
#!/bin/bash
# monitor-key-schedule.sh - Show key timing metadata for upcoming rotations

set -euo pipefail

ZONES=("example.com" "8.b.d.0.1.0.0.2.ip6.arpa")

for ZONE in "${ZONES[@]}"; do
    echo "=== ${ZONE} ==="
    KEY_DIR="/var/named/keys/${ZONE}"

    for keyfile in "${KEY_DIR}"/K"${ZONE}".+*.key; do
        [ -e "${keyfile}" ] || continue

        KEY_BASE=$(basename "${keyfile}" .key)
        FLAGS=$(awk '{print $4}' "${keyfile}")
        case "${FLAGS}" in
            256) TYPE="ZSK" ;;
            257) TYPE="KSK" ;;
            *) TYPE="UNKNOWN" ;;
        esac

        echo "  ${TYPE} ${KEY_BASE}:"
        dnssec-settime -K "${KEY_DIR}" "${KEY_BASE}" | \
            sed -n 's/^/    /; /Publish:/p; /Activate:/p; /Inactive:/p; /Delete:/p'
    done
    echo ""
done
```

## Conclusion

DNSSEC key rotation follows the pre-publication model for ZSKs: publish the new ZSK, wait at least one DNSKEY TTL, start signing with the new ZSK while the old ZSK remains published, wait at least one maximum zone TTL, then remove the old ZSK. KSK rotation is commonly done with double-KSK: publish both KSKs, wait for the old DNSKEY RRset to expire from caches, update the DS at the parent, wait for the old DS RRset to expire, then remove the old KSK. BIND 9.16+ `dnssec-policy` automates ZSK rotation and manages KSK rollover state, but you must still confirm DS publication or configure `parental-agents`. Monitor key timing metadata with `dnssec-settime`, and if you check for the `ad` flag, query a validating resolver rather than an authoritative server.
