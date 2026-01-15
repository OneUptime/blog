# How to Validate DNSSEC Signatures with dig and delv

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Security, Troubleshooting, Linux, Validation

Description: A comprehensive guide to validating DNSSEC signatures using dig and delv command-line tools, covering validation techniques, troubleshooting broken chains of trust, and interpreting cryptographic signatures.

---

DNSSEC (Domain Name System Security Extensions) protects DNS queries from tampering and spoofing by adding cryptographic signatures to DNS records. But how do you verify that DNSSEC is actually working? The `dig` and `delv` command-line tools are your best friends for validating DNSSEC signatures, diagnosing chain of trust issues, and troubleshooting DNS security problems.

---

## What Is DNSSEC?

Traditional DNS has no authentication mechanism. When you query for `example.com`, you trust that the response hasn't been modified in transit and no attacker has injected fake records (DNS spoofing/cache poisoning).

DNSSEC adds cryptographic signatures to DNS records:

- **RRSIG (Resource Record Signature)**: Digital signature for a DNS record set
- **DNSKEY**: Public keys used to verify signatures
- **DS (Delegation Signer)**: Hash of a child zone's key, stored in parent zone
- **NSEC/NSEC3**: Authenticated denial of existence

The chain of trust starts from the DNS root zone (`.`) and extends to individual domains.

---

## Prerequisites

### Installing dig and delv

Both tools come from BIND utilities:

```bash
# Debian/Ubuntu
sudo apt-get install dnsutils

# RHEL/CentOS/Fedora
sudo dnf install bind-utils

# macOS (via Homebrew)
brew install bind

# Alpine Linux
apk add bind-tools
```

Verify installation:

```bash
dig -v
delv -v
```

---

## Understanding dig for DNSSEC

The `dig` command is the standard DNS lookup utility. For DNSSEC validation, you'll use specific flags to retrieve and display signature information.

### Essential dig Flags for DNSSEC

```bash
# +dnssec - Request DNSSEC records
dig +dnssec example.com

# +cd - Disable DNSSEC validation (checking disabled)
dig +cd example.com

# +multi - Multi-line output for readability
dig +dnssec +multi example.com DNSKEY

# +trace - Trace delegation path from root
dig +trace +dnssec example.com
```

---

## Querying DNSSEC Record Types

### Retrieve DNSKEY Records

DNSKEY records contain the public keys for a zone:

```bash
dig +multi example.com DNSKEY
```

Example output:

```
example.com.        3600    IN      DNSKEY  256 3 13 (
                                oJMRESz5E4gYzS/q6XDrvU1qMPYIjCWzJaOau8XN
                                EZeqCYKD5ar0IRd8KqXXFJkqmVfRvMGPmM1x8fGX
                                NHsQ==
                                ) ; ZSK; alg = ECDSAP256SHA256 ; key id = 45620

example.com.        3600    IN      DNSKEY  257 3 13 (
                                mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopK
                                l+GqJxpVXckHAeF+KkxLbxILfDLUT0rAK9iUzy1L
                                53eKGQ==
                                ) ; KSK; alg = ECDSAP256SHA256 ; key id = 31406
```

Key fields explained:
- **256**: Zone Signing Key (ZSK) - signs zone data
- **257**: Key Signing Key (KSK) - signs other keys
- **3**: DNSSEC protocol version (always 3)
- **13**: Algorithm number (13 = ECDSAP256SHA256)

### Retrieve RRSIG Records

RRSIG records contain the actual signatures:

```bash
dig +dnssec example.com A
```

Example RRSIG output:

```
example.com.        3600    IN      RRSIG   A 13 2 3600 (
                                20260215000000 20260115000000 45620 example.com.
                                KQP9dHjzJbV7i3pAzJSfSfG8gR0hIUF/MBqMQrk/
                                N8K9xO9nR4KpvFplPf0YzKjqGRL/PaQZ8rJoqqG9
                                Pw== )
```

RRSIG fields:
- **A**: Record type being signed
- **13**: Algorithm
- **2**: Number of labels in the name
- **3600**: Original TTL
- **20260215000000**: Signature expiration
- **20260115000000**: Signature inception
- **45620**: Key tag (matches DNSKEY)

### Retrieve DS Records

DS records link parent and child zones:

```bash
dig example.com DS

# Query the parent zone directly
dig @a.gtld-servers.net example.com DS
```

DS fields:
- **Key tag**: Matches KSK DNSKEY
- **Algorithm**: Signing algorithm
- **Digest type**: Hash algorithm (2 = SHA-256)
- **Digest**: Hash of the DNSKEY

### Retrieve NSEC/NSEC3 Records

NSEC records prove that a name doesn't exist:

```bash
# Query for a non-existent name
dig +dnssec nonexistent.example.com

# Get NSEC3 parameters
dig example.com NSEC3PARAM
```

---

## Using delv for DNSSEC Validation

While `dig` retrieves DNSSEC records, `delv` (Domain Entity Lookup & Validation) actually validates them. It's the modern replacement for `dig +sigchase`.

### Basic delv Usage

```bash
# Validate DNSSEC for a domain
delv example.com A

# Verbose output
delv -v example.com
```

### Understanding delv Output

Successful validation:

```bash
$ delv cloudflare.com A
; fully validated
cloudflare.com.     300     IN      A       104.16.132.229
cloudflare.com.     300     IN      A       104.16.133.229
```

The `; fully validated` comment indicates the entire chain of trust was verified.

Failed validation:

```bash
$ delv broken-dnssec.example.com A
;; resolution failed: SERVFAIL
;; validating broken-dnssec.example.com/A: no valid signature found
```

### delv Options Reference

```bash
# Disable DNSSEC validation (for debugging)
delv +cd example.com

# Query specific nameserver
delv @8.8.8.8 example.com

# Show RRSIG records
delv +rrsig example.com

# Trace the validation process
delv +vtrace example.com

# Verbose chain of trust
delv +rtrace example.com
```

---

## Step-by-Step DNSSEC Validation

### Step 1: Check if Domain Uses DNSSEC

```bash
dig +short example.com DNSKEY
# If empty, domain doesn't have DNSSEC
# If returns keys, DNSSEC is configured
```

### Step 2: Verify DS Record Exists in Parent Zone

```bash
dig +short example.com DS
# Should return DS record if DNSSEC is properly delegated
```

### Step 3: Validate with delv

```bash
delv example.com A
# Look for "; fully validated"
```

### Step 4: Trace the Chain of Trust

```bash
dig +trace +dnssec example.com

# This shows:
# 1. Root zone (.) keys
# 2. TLD zone (.com) delegation
# 3. Domain (example.com) records
```

---

## Practical DNSSEC Validation Examples

### Example 1: Validating a Well-Configured Domain

```bash
$ dig +dnssec cloudflare.com A

;; flags: qr rd ra ad; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1
```

The `ad` flag (Authenticated Data) indicates successful validation by the resolver.

```bash
$ delv cloudflare.com A
; fully validated
cloudflare.com.     201     IN      A       104.16.132.229
```

### Example 2: Checking Multiple Domains

```bash
for domain in google.com amazon.com github.com; do
    echo "=== $domain ==="
    delv $domain A 2>&1 | head -2
done
```

### Example 3: Validating Mail Server Records

```bash
delv example.com MX
delv example.com TXT
delv _dmarc.example.com TXT
```

---

## Troubleshooting DNSSEC Issues

### Issue 1: Missing DS Record

```bash
$ dig example.com DS
; no answer

# DNSSEC isn't delegated from parent
# Domain owner needs to add DS record at registrar
```

### Issue 2: Expired Signatures

```bash
$ dig +dnssec example.com A | grep RRSIG

# Look at expiration date (first timestamp)
# example.com. 300 IN RRSIG A 13 2 300 20260101000000 20251201000000 ...
#                                      ^^^^^^^^^^^^^^ check this date
```

Fix: Zone owner must re-sign the zone.

### Issue 3: Wrong DS Record

```bash
# Get the DNSKEY
dig +multi example.com DNSKEY | grep "key id"

# Get the DS from parent
dig +short example.com DS

# Key IDs should match (DS key tag = KSK key id)
```

Generate correct DS from DNSKEY:

```bash
dig example.com DNSKEY | dnssec-dsfromkey -2 -f - example.com
```

### Issue 4: Algorithm Mismatch

```bash
# Check algorithms in use
dig +short example.com DNSKEY | awk '{print $3}'

# Check DS algorithm
dig +short example.com DS | awk '{print $2}'

# These should be compatible
```

### Issue 5: Chain of Trust Broken

```bash
# Trace the full chain
dig +trace +dnssec example.com

# Verbose validation trace with delv
delv +vtrace example.com A 2>&1 | less
```

---

## Advanced dig Techniques

### Query Specific Nameservers

```bash
# Query authoritative nameserver directly
dig @ns1.example.com example.com DNSKEY +dnssec

# Query root servers
dig @a.root-servers.net . DNSKEY

# Query TLD servers
dig @a.gtld-servers.net example.com DS
```

### Check DNSSEC at Each Level

```bash
# Root zone DNSKEY
dig . DNSKEY +dnssec +multi

# TLD DS and DNSKEY
dig com DS +dnssec
dig com DNSKEY +dnssec +multi

# Domain DS and DNSKEY
dig example.com DS +dnssec
dig example.com DNSKEY +dnssec +multi
```

---

## Advanced delv Techniques

### Debugging Validation Failures

```bash
# Maximum verbosity
delv +vtrace +rtrace +mtrace example.com A

# Output shows:
# - Which keys are being checked
# - Which signatures are being validated
# - Where validation fails
```

### Testing with Different Resolvers

```bash
delv @8.8.8.8 example.com A   # Google DNS
delv @1.1.1.1 example.com A   # Cloudflare DNS
delv @9.9.9.9 example.com A   # Quad9
```

---

## DNSSEC Validation Script

Here's a script to validate DNSSEC for any domain:

```bash
#!/bin/bash
# dnssec-check.sh - DNSSEC validation

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi

echo "=== DNSSEC Validation: $DOMAIN ==="

# Check DNSKEY
echo -n "DNSKEY: "
DNSKEY=$(dig +short $DOMAIN DNSKEY)
[ -z "$DNSKEY" ] && echo "FAIL - No keys" && exit 1 || echo "OK"

# Check DS
echo -n "DS Record: "
DS=$(dig +short $DOMAIN DS)
[ -z "$DS" ] && echo "FAIL - Missing" || echo "OK"

# Validate
echo -n "Validation: "
VALIDATION=$(delv $DOMAIN A 2>&1)
echo "$VALIDATION" | grep -q "fully validated" && echo "PASS" || echo "FAIL"

# Check expiration
echo -n "Signature: "
RRSIG=$(dig +dnssec $DOMAIN A | grep RRSIG)
[ -n "$RRSIG" ] && echo "Present" || echo "Missing"
```

Usage:

```bash
chmod +x dnssec-check.sh
./dnssec-check.sh cloudflare.com
```

---

## Interpreting Response Flags

```bash
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
```

Flag meanings:
- **qr**: Query Response
- **rd**: Recursion Desired
- **ra**: Recursion Available
- **ad**: Authenticated Data (DNSSEC validation passed)
- **cd**: Checking Disabled (validation was skipped)
- **aa**: Authoritative Answer

### Flag Combinations

| Flags | Meaning |
|-------|---------|
| `qr rd ra ad` | Normal response, DNSSEC validated |
| `qr rd ra` | Normal response, not DNSSEC or validation failed |
| `qr rd ra cd` | Response returned without validation |
| `qr aa` | Authoritative response |

---

## DNSSEC Record Type Reference

| Record | Purpose | Example Query |
|--------|---------|---------------|
| DNSKEY | Zone public keys | `dig example.com DNSKEY` |
| RRSIG | Signature for record set | `dig +dnssec example.com A` |
| DS | Delegation signer (parent-child link) | `dig example.com DS` |
| NSEC | Authenticated denial (ordered names) | `dig nonexistent.example.com` |
| NSEC3 | Authenticated denial (hashed names) | `dig example.com NSEC3PARAM` |
| CDNSKEY | Child copy of DNSKEY | `dig example.com CDNSKEY` |
| CDS | Child copy of DS | `dig example.com CDS` |

---

## Algorithm Reference

| Number | Algorithm | Security | Recommendation |
|--------|-----------|----------|----------------|
| 5 | RSA/SHA-1 | Weak | Avoid |
| 7 | RSASHA1-NSEC3 | Weak | Avoid |
| 8 | RSA/SHA-256 | Good | Acceptable |
| 10 | RSA/SHA-512 | Good | Acceptable |
| 13 | ECDSA P-256/SHA-256 | Strong | Recommended |
| 14 | ECDSA P-384/SHA-384 | Strong | Good |
| 15 | Ed25519 | Strong | Recommended |
| 16 | Ed448 | Very Strong | Good |

---

## dig vs delv: When to Use Each

| Task | dig | delv |
|------|-----|------|
| Retrieve DNS records | Yes | Yes |
| View raw DNSSEC records | Yes | Limited |
| Validate DNSSEC signatures | No | Yes |
| Debug validation failures | Limited | Yes |
| Trace delegation | Yes (+trace) | Yes (+rtrace) |
| Check signature details | Yes | Limited |
| Production validation | No | Yes |

---

## Best Practices

### For Operators

1. **Monitor signature expiration**: Set up alerts before RRSIG expires
2. **Use strong algorithms**: Prefer ECDSA (13, 14) or Ed25519 (15)
3. **Test after changes**: Always validate with `delv` after DNS modifications
4. **Document rollover procedures**: Key rollovers are error-prone
5. **Use multiple validation sources**: Test from different resolvers

### For Security Teams

1. **Audit DNSSEC coverage**: Ensure all critical domains have DNSSEC
2. **Check algorithm strength**: Identify domains using weak algorithms
3. **Monitor for broken chains**: Alert on validation failures
4. **Verify DS records**: Ensure proper delegation at registrars

---

## Summary

DNSSEC validation is essential for verifying DNS security. Here's what to remember:

**Use dig for**:
- Retrieving raw DNSSEC records (DNSKEY, DS, RRSIG)
- Tracing delegation paths
- Checking record details and expiration

**Use delv for**:
- Actual cryptographic validation
- Debugging validation failures
- Confirming chain of trust integrity

**Key commands to remember**:

```bash
# Quick DNSSEC check
dig +short example.com DNSKEY

# Full validation
delv example.com A

# Trace delegation
dig +trace +dnssec example.com

# Debug validation
delv +vtrace example.com A
```

DNSSEC protects against DNS spoofing and cache poisoning attacks. Regularly validating your domains' DNSSEC configuration ensures this protection remains effective. With `dig` and `delv` in your toolkit, you have everything needed to verify, troubleshoot, and maintain DNSSEC across your infrastructure.

---

## Additional Resources

- **RFC 4033-4035**: DNSSEC protocol specifications
- **RFC 6781**: DNSSEC operational practices
- **DNSSEC Analyzer**: https://dnssec-analyzer.verisignlabs.com/
- **DNSViz**: https://dnsviz.net/
- **BIND Documentation**: https://bind9.readthedocs.io/
