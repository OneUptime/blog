# How to Configure DNSSEC for IPv6 Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNSSEC, DNS Security, AAAA Records, Zone Signing

Description: A guide to signing IPv6 zones with DNSSEC to protect AAAA records from spoofing, covering key generation, zone signing, and DS record publication.

## Why DNSSEC for IPv6 Zones?

DNSSEC cryptographically signs DNS records, preventing attackers from injecting fake AAAA records and redirecting IPv6 traffic. As IPv6 adoption grows, DNSSEC becomes increasingly important for protecting AAAA records from cache poisoning.

## DNSSEC Concepts

- **ZSK (Zone Signing Key)**: Signs the zone records (AAAA, A, MX, etc.)
- **KSK (Key Signing Key)**: Signs the ZSK (used for zone trust establishment)
- **RRSIG**: Signature record attached to signed record sets
- **DNSKEY**: Public keys published in the zone
- **DS**: Delegation Signer record in the parent zone (establishes chain of trust)

## Signing a Zone with BIND DNSSEC Tools

### Step 1: Generate Keys

```bash
# Create directory for DNSSEC keys

mkdir -p /etc/named/keys/example.com
cd /etc/named/keys/example.com

# Generate Zone Signing Key (ZSK) - ECDSAP256SHA256
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com

# Generate Key Signing Key (KSK) - ECDSAP256SHA256 with -f KSK flag
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE example.com

# List generated key files
ls -la
# Kexample.com.+013+12345.key    (ZSK public key)
# Kexample.com.+013+12345.private (ZSK private key)
# Kexample.com.+013+67890.key    (KSK public key)
# Kexample.com.+013+67890.private (KSK private key)
```

### Step 2: Configure BIND for Automatic DNSSEC

Modern BIND (9.16+) supports automatic DNSSEC signing:

If you use `dnssec-policy default`, BIND can generate and manage the signing keys automatically, so the manual key-generation step above is only needed for the manual-signing workflow below.

```named
// /etc/named.conf

zone "example.com" {
    type master;
    file "/var/named/example.com.zone";

    // Enable automatic DNSSEC signing
    dnssec-policy default;

    // Keep an unsigned master file and let named maintain the signed copy
    inline-signing yes;

    // Key directory
    key-directory "/etc/named/keys/example.com";
};
```

### Step 3: Sign the Zone Manually (if not using auto-signing)

```bash
# Sign the zone file using the keys in the key directory
dnssec-signzone \
    -S \
    -K /etc/named/keys/example.com \
    -N INCREMENT \
    -o example.com \
    -t \
    /var/named/example.com.zone

# This creates: example.com.zone.signed
# Update named.conf to use the signed zone file
```

### Step 4: Verify Signed AAAA Records

```bash
# Check that AAAA records are signed (RRSIG present)
dig @127.0.0.1 example.com AAAA +dnssec

# Expected output includes:
# example.com. 3600 IN AAAA 2001:db8::1
# example.com. 3600 IN RRSIG AAAA 13 2 3600 ... (signature)

# Check DNSKEY records are present
dig @127.0.0.1 example.com DNSKEY +dnssec

# After the DS record is published, verify with a validating resolver
delv @8.8.8.8 example.com AAAA
# Should show: ; fully validated
```

### Step 5: Publish DS Record to Parent Zone

The DS (Delegation Signer) record in the parent zone creates the chain of trust:

```bash
# Generate the DS record from the KSK
dnssec-dsfromkey /etc/named/keys/example.com/Kexample.com.+013+67890.key

# Output (submit this to your domain registrar):
# example.com. IN DS 67890 13 2 <hash>

# Or use dig to view DS after publication
dig @parent-ns example.com DS
```

## DNSSEC for IPv6 Reverse DNS Zones

As with forward zones, `dnssec-policy default` can generate and manage the signing keys automatically; generate keys manually only if you are following a manual-signing workflow.

```named
// Sign the reverse zone for IPv6
zone "8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/var/named/ip6-reverse.zone";
    dnssec-policy default;
    inline-signing yes;
    key-directory "/etc/named/keys/ip6-reverse";
};
```

```bash
# Generate keys for the reverse zone
mkdir -p /etc/named/keys/ip6-reverse
cd /etc/named/keys/ip6-reverse
dnssec-keygen -a ECDSAP256SHA256 -n ZONE 8.b.d.0.1.0.0.2.ip6.arpa
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE 8.b.d.0.1.0.0.2.ip6.arpa
```

## Verifying DNSSEC Validation

```bash
# Test that a validating resolver correctly validates the signed zone
dig @8.8.8.8 example.com AAAA +dnssec

# The "ad" flag in the response means "authenticated data" (DNSSEC validated)
# ;; flags: qr rd ra ad;  ← "ad" flag confirms DNSSEC validation

# delv performs its own validation and explains failures directly
delv @8.8.8.8 example.com AAAA
```

## DNSSEC Monitoring

```bash
# Show BIND's current DNSSEC state for the zone
rndc dnssec -status example.com

# List active signing operations for the zone
rndc signing -list example.com
```

## Summary

DNSSEC for IPv6 zones protects AAAA records from spoofing by cryptographically signing them. For manual signing, generate ZSK and KSK keys with `dnssec-keygen` and sign the zone with `dnssec-signzone`. For automatic signing, configure BIND with `dnssec-policy` and `inline-signing` so BIND manages keys and signatures. Verify the resulting `RRSIG` and `DNSKEY` records, then submit the DS record to your registrar to complete the chain of trust. Sign both forward and reverse IPv6 zones for complete DNSSEC coverage.
