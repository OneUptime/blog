# How to Sign IPv6 Forward DNS Zones with DNSSEC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, IPv6, DNS, BIND, Zone Signing, Security

Description: Sign IPv6 forward DNS zones with DNSSEC using BIND 9, including key generation, zone signing, and maintaining signed zones with automatic re-signing.

## DNSSEC for IPv6 Forward Zones

DNSSEC signing of forward zones that contain AAAA records is identical to signing zones with A records - the signing process is record-type agnostic. The zone file contains AAAA records alongside A records, and DNSSEC signs all records including AAAA, CNAME, MX, and others.

Benefits for IPv6:
- Validates that AAAA records are authentic
- Prevents DNS hijacking that redirects IPv6 traffic
- Provides authenticated denial of existence (NSEC/NSEC3)

## Zone File with AAAA Records

```bash
; /var/named/example.com.zone
$ORIGIN example.com.
$TTL 3600

@   IN SOA ns1.example.com. admin.example.com. (
            2026032001  ; serial
            3600        ; refresh
            900         ; retry
            604800      ; expire
            300 )       ; minimum

    IN NS  ns1.example.com.
    IN NS  ns2.example.com.

; IPv4 and IPv6 for name servers
ns1 IN A    203.0.113.1
ns1 IN AAAA 2001:db8::1

ns2 IN A    203.0.113.2
ns2 IN AAAA 2001:db8::2

; Dual-stack web server
www IN A    203.0.113.10
www IN AAAA 2001:db8::10

; IPv6-only service
api IN AAAA 2001:db8::20

; AAAA for multiple addresses (load balancing)
cdn IN AAAA 2001:db8:cd0::1
cdn IN AAAA 2001:db8:cd0::2
cdn IN AAAA 2001:db8:cd0::3
```

## Step 1: Generate DNSSEC Keys

```bash
# Navigate to zone key directory

cd /var/named/keys/

# Generate Zone Signing Key (ZSK) - signs zone data
dnssec-keygen -a ECDSAP256SHA256 \
              -n ZONE \
              example.com

# Output: Kexample.com.+013+XXXXX.key and .private

# Generate Key Signing Key (KSK) - signs the DNSKEY RRset
dnssec-keygen -a ECDSAP256SHA256 \
              -n ZONE \
              -f KSK \
              example.com

# Output: Kexample.com.+013+YYYYY.key and .private

# List generated keys
ls -la Kexample.com.*
```

## Step 2: Sign the Zone

```bash
# Sign the zone with both ZSK and KSK
# NSEC3 example using current recommended parameters:
# no salt and no extra iterations
dnssec-signzone \
    -a \
    -3 - \
    -H 0 \
    -N INCREMENT \
    -o example.com \
    -f /var/named/example.com.zone.signed \
    -k /var/named/keys/Kexample.com.+013+YYYYY \
    /var/named/example.com.zone \
    /var/named/keys/Kexample.com.+013+XXXXX

# Output: /var/named/example.com.zone.signed

# Verify signed zone
dnssec-verify -o example.com /var/named/example.com.zone.signed

# Check AAAA record signatures are present
grep -A2 "AAAA" /var/named/example.com.zone.signed | grep RRSIG | head -5
```

## Step 3: BIND Configuration

```text
// /etc/named.conf - BIND zone configuration

zone "example.com" {
    type master;
    file "/var/named/example.com.zone.signed";
};

// Only needed if this server also performs recursion
options {
    dnssec-validation auto;  // Use built-in root trust anchor
};
```

## Step 4: BIND Automatic Signing (Current BIND 9)

```text
// As an alternative to manual dnssec-signzone,
// load the unsigned zone and let BIND maintain the signed copy.

zone "example.com" {
    type master;
    file "/var/named/example.com.zone";
    dnssec-policy default;
    inline-signing yes;
};
```

```bash
# Reload the configuration
rndc reconfig

# After updating the unsigned zone file, reload the zone
rndc reload example.com

# Check signing status
rndc signing -list example.com

# Verify AAAA records have signatures
dig +dnssec AAAA www.example.com @localhost | grep -E "AAAA|RRSIG"
```

## Step 5: Verify DNSSEC Signatures

```bash
# Verify AAAA record signature
dig +dnssec +multiline AAAA www.example.com @localhost

# Expected output includes RRSIG record:
# www.example.com. 3600 IN AAAA 2001:db8::10
# www.example.com. 3600 IN RRSIG AAAA 13 3 3600 (
#     20260420000000 20260320000000 XXXXX example.com.
#     <signature data> )

# Full DNSSEC chain validation
dig +dnssec +cd AAAA www.example.com
# +cd = checking disabled (shows raw answer without local validation)

# Validate via external resolver after the DS record is published
# Replace www.example.com with your real public zone name
dig @8.8.8.8 +dnssec AAAA www.example.com | grep -E "flags:.* ad[ ;]|AAAA|RRSIG"
# Look for the "ad" flag in the header: Authenticated Data
```

## Automation: Zone Signing Script

```bash
#!/bin/bash
# sign-zone.sh - Re-sign zone and reload BIND

ZONE="example.com"
ZONE_FILE="/var/named/${ZONE}.zone"
KEY_DIR="/var/named/keys"
ZSK=$(grep -l "zone-signing key" "${KEY_DIR}"/K${ZONE}.+013+*.key | head -1 | sed 's/\.key$//')
KSK=$(grep -l "key-signing key" "${KEY_DIR}"/K${ZONE}.+013+*.key | head -1 | sed 's/\.key$//')

# Increment serial
SERIAL=$(awk '/serial/ {print $1; exit}' "${ZONE_FILE}")
TODAY_BASE=$(date +%Y%m%d)00
if [ "${SERIAL}" -ge "${TODAY_BASE}" ]; then
    NEW_SERIAL=$((SERIAL + 1))
else
    NEW_SERIAL=$((TODAY_BASE + 1))
fi
sed -i "0,/${SERIAL}/s//${NEW_SERIAL}/" "${ZONE_FILE}"

# Sign with NSEC3
dnssec-signzone \
    -3 - \
    -H 0 \
    -N INCREMENT \
    -o "${ZONE}" \
    -f "${ZONE_FILE}.signed" \
    -k "${KSK}" \
    "${ZONE_FILE}" \
    "${ZSK}"

# Verify
dnssec-verify -o "${ZONE}" "${ZONE_FILE}.signed"

# Reload
rndc reload "${ZONE}"
echo "Zone ${ZONE} signed and reloaded (serial: ${NEW_SERIAL})"
```

## Conclusion

DNSSEC signing of IPv6 forward zones is straightforward - AAAA records are signed exactly like A records. Use ECDSAP256SHA256 algorithm for modern key generation (smaller, faster than RSA). In current BIND releases, use `dnssec-policy` with `inline-signing yes` if you want automatic re-signing after zone changes. NSEC3 is optional; if you use it, current guidance is no salt (`-3 -`) and zero additional iterations. After signing, verify AAAA records have RRSIG records with `dig +dnssec`, and confirm the `ad` (Authenticated Data) flag appears in validating resolver responses once the DS record is published and the zone is publicly reachable.
