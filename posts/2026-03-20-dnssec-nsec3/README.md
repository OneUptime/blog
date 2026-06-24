# How to Configure DNSSEC NSEC3 for IPv6 Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, NSEC3, DNS, IPv6, Zone Enumeration Prevention, Security

Description: Configure DNSSEC NSEC3 authenticated denial of existence to prevent zone enumeration of IPv6 DNS zones, with correct parameter selection and operational considerations.

## NSEC vs NSEC3

| Feature | NSEC | NSEC3 |
|---|---|---|
| Zone enumeration | Yes (walks chain) | Not direct, but hashed names can still be brute-forced |
| Performance | Slightly faster | More CPU and signing overhead |
| Response size | Smaller | Slightly larger |
| Recommendation | Good default for most zones | Use when obscuring owner names or Opt-Out is needed |

NSEC creates a linked chain of all names, enabling "zone walking" to enumerate every hostname. NSEC3 hashes domain names before linking, which prevents trivial plaintext zone walking while still allowing authenticated denial. It does not stop offline guessing of predictable names.

## NSEC3 Parameters

```text
NSEC3PARAM record format:
  <zone> IN NSEC3PARAM <hash-alg> <flags> <iterations> <salt>

Example:
  example.com. IN NSEC3PARAM 1 0 0 -

Parameters:
  hash-alg:   1 = SHA-1 (only option currently)
  flags:      Must be 0 in NSEC3PARAM; Opt-Out is signaled on NSEC3 records
  iterations: Number of extra SHA-1 hash iterations (0 recommended)
  salt:       Hex salt value (- = empty, recommended per RFC 9276)
```

## RFC 9276 Security Considerations

RFC 9276 (2022) updated NSEC3 recommendations:

```text
Older deployments often used non-zero iterations and random salts
Current recommendation (RFC 9276):
  - iterations = 0 (higher iterations don't significantly improve security)
  - salt = empty (-) (salts complicate key rollover without security benefit)

Reasoning: extra iterations increase CPU cost for authoritative servers and validators,
but do little to protect guessable names from determined offline attacks.
```

## Signing a Zone with NSEC3

```bash
# Sign with NSEC3 - RFC 9276 recommended parameters
# -3 - enables NSEC3 with an empty salt
# -H 0 uses zero additional iterations

dnssec-signzone \
    -3 - \
    -H 0 \
    -N INCREMENT \
    -o example.com \
    -k Kexample.com.+013+KSK_ID \
    /var/named/example.com.zone \
    Kexample.com.+013+ZSK_ID

# Verify NSEC3PARAM record exists
grep "NSEC3PARAM" example.com.zone.signed
# example.com. 3600 IN NSEC3PARAM 1 0 0 -

# Check NSEC3 records exist (hashed names)
grep " NSEC3 " example.com.zone.signed | head -3
# <hash>.example.com. 3600 IN NSEC3 1 0 0 - <next_hash> AAAA A NS SOA
```

## BIND: Configure NSEC3 for Auto-Signed Zones

```text
// /etc/named.conf - Configure NSEC3 for an auto-signed zone

dnssec-policy "nsec3-rfc9276" {
    nsec3param iterations 0 optout no salt-length 0;
};

zone "example.com" {
    type master;
    file "/var/named/example.com.zone";
    key-directory "/var/named/keys/example.com";
    dnssec-policy "nsec3-rfc9276";
    inline-signing yes;
};
```

```bash
# Reload BIND after adding the policy
rndc reconfig

# Verify the apex publishes NSEC3PARAM
dig NSEC3PARAM example.com @localhost
# example.com. 3600 IN NSEC3PARAM 1 0 0 -

# Test: query for non-existent name - should get NSEC3 denial
dig +dnssec +multiline A nonexistent.example.com @localhost
# Should return NXDOMAIN + NSEC3 records proving it doesn't exist
```

## NSEC3 Opt-Out for Large Zones

```bash
# Opt-Out omits NSEC3 records for insecure delegations
# Useful for zones with many insecure delegations (e.g., TLD zones)

# Sign with Opt-Out
dnssec-signzone \
    -3 - \
    -H 0 \
    -A \
    -N INCREMENT \
    -o example.com \
    -k Kexample.com.+013+KSK_ID \
    /var/named/example.com.zone \
    Kexample.com.+013+ZSK_ID

# The apex NSEC3PARAM RR still uses flags=0:
# example.com. IN NSEC3PARAM 1 0 0 -
#
# Opt-Out is visible on the NSEC3 RRs themselves:
# <hash>.example.com. IN NSEC3 1 1 0 - <next_hash> NS SOA RRSIG
#                                ^ flag=1 = Opt-Out enabled
```

## Verifying NSEC3 Authenticated Denial

```bash
# Test NXDOMAIN response has NSEC3 proof
dig +dnssec +multiline AAAA doesnotexist.example.com @localhost

# Expected NSEC3-based NXDOMAIN response:
# ;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN
# ;; flags: qr aa rd; QUERY: 1, ANSWER: 0, AUTHORITY: 4, ADDITIONAL: 1
#
# ;; AUTHORITY SECTION:
# example.com. 3600 IN SOA ns1.example.com. ...
# <hash>.example.com. 3600 IN NSEC3 1 0 0 - <nexthash> A NS SOA ...
# <hash>.example.com. 3600 IN RRSIG NSEC3 ...
# <hash>.example.com. 3600 IN NSEC3 1 0 0 - <nexthash> AAAA MX ...

# In this kind of response, the NSEC3 records prove:
# 1. The queried name doesn't exist (no hash between two adjacent hashes)
# 2. The wildcard doesn't exist

# Compute hashes correctly when troubleshooting
# NSEC3 makes direct plaintext zone walking harder, but predictable names
# can still be guessed offline.
nsec3hash - 1 0 www.example.com.
nsec3hash - 1 0 doesnotexist.example.com.
```

## Migrating from NSEC to NSEC3

```bash
#!/bin/bash
# migrate-nsec-to-nsec3.sh

ZONE="example.com"

# Current state: zone uses NSEC
# Target: migrate to NSEC3
# If the zone is signed with RSASHA1 (algorithm 5), roll to
# RSASHA1-NSEC3-SHA1 (algorithm 7) before enabling NSEC3.

# Step 1: Update the zone's dnssec-policy to include:
# nsec3param iterations 0 optout no salt-length 0;
rndc reconfig

# Step 2: Verify migration
sleep 5  # Allow BIND to re-sign
dig NSEC3PARAM "${ZONE}" @localhost
# Should return the apex NSEC3PARAM record

dig +dnssec +multiline AAAA "doesnotexist.${ZONE}" @localhost
# Should return NXDOMAIN with NSEC3 records in the authority section

echo "Migration complete - zone now uses NSEC3"
```

## Conclusion

NSEC3 is not the default best choice for every public IPv6 DNS zone. For most zones, NSEC is simpler and cheaper; use NSEC3 when you specifically want to make trivial plaintext zone walking harder or need Opt-Out for extremely large zones with many unsigned delegations. When you do use NSEC3, RFC 9276 recommends `iterations=0` and empty salt (`-`). In current BIND, configure that through `dnssec-policy` with `nsec3param iterations 0 optout no salt-length 0;`. Verify with `dig +dnssec AAAA nonexistent.zone` - the NXDOMAIN response should contain NSEC3 records rather than NSEC records. Use Opt-Out only for very large delegation-heavy zones. NSEC3 does not stop offline guessing of predictable names, but it does eliminate the trivial plaintext NSEC chain walk.
