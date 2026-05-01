# How to Enable and Test DNSSEC Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNSSEC, Validation, BIND, Unbound, DNS Security, IPv6

Description: Configure DNSSEC validation on recursive resolvers using BIND and Unbound, verify the validation chain, and test with known signed zones and deliberately broken zones.

## DNSSEC Validation Overview

Validation happens at the recursive resolver, not the authoritative server. When enabled:
1. Resolver fetches DNS response + RRSIG records
2. Fetches DNSKEY for the signing zone
3. Verifies signature cryptographically
4. Checks DS record at parent to validate DNSKEY
5. Returns response with AD (Authenticated Data) flag when the answer validates as secure
6. Returns SERVFAIL if validation fails

## Enable Validation in BIND (named.conf)

```text
// /etc/named.conf - Enable DNSSEC validation

options {
    // Use built-in IANA root trust anchors
    dnssec-validation auto;

    // Or use manual trust anchor:
    // dnssec-validation yes;
    // (requires a trust-anchors block; managed-keys and trusted-keys are deprecated)

    // Recursive resolver settings
    recursion yes;
    allow-recursion { 2001:db8:100::/48; 192.168.0.0/16; };

    // Listen on IPv6
    listen-on-v6 { any; };
};

// With auto, BIND uses RFC 5011 automatic trust anchor management
// Validates against the root trust anchors automatically
```

## Enable Validation in Unbound

```bash
# /etc/unbound/unbound.conf

server:
    # Listen on IPv6
    interface: ::0
    interface: 0.0.0.0
    port: 53

    # Enable DNSSEC validation
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Access control (allow internal IPv6)
    access-control: 2001:db8:100::/48 allow
    access-control: 192.168.0.0/16 allow

    # Aggressive NSEC - faster negative responses
    aggressive-nsec: yes

    # Minimal responses
    minimal-responses: yes

# Initialize root trust anchor

unbound-anchor -a /var/lib/unbound/root.key

# Start Unbound
systemctl enable --now unbound

# Verify config syntax
unbound-checkconf /etc/unbound/unbound.conf
```

## Testing DNSSEC Validation

```bash
# Test 1: Valid signed zone - should return AD flag
dig +dnssec AAAA www.dnssec-deployment.org @localhost
# Expect: flags: qr rd ra ad (ad = authenticated data)

# Test 2: Well-known test zone - should work
dig +dnssec A sigok.verteiltesysteme.net @localhost
# Response should have AD flag

# Test 3: Deliberately broken zone - should return SERVFAIL
dig AAAA sigfail.verteiltesysteme.net @localhost
# Expect: status: SERVFAIL (validation failure)
# This zone has intentionally broken signatures

# Test 4: IPv6 AAAA with DNSSEC
dig +dnssec +multiline AAAA www.dnssec-deployment.org @localhost
# Expect: AAAA record + RRSIG record + AD flag

# Test 5: Non-existent name in signed zone
dig +dnssec AAAA doesnotexist.isc.org @localhost
# Expect: NXDOMAIN + NSEC/NSEC3 proof + AD flag
```

## Interpreting DNSSEC Responses

```bash
# Understanding dig +dnssec output

dig +dnssec AAAA www.example.com

# Key fields to check:
# 1. Status: NOERROR = found, NXDOMAIN = not found, SERVFAIL = validation failed
# 2. Flags: 'ad' flag = resolver marked the answer secure after validation
# 3. RRSIG record = signature present
# 4. ANSWER vs AUTHORITY section:
#    - ANSWER with RRSIG = signed positive answer
#    - AUTHORITY with NSEC/NSEC3 = signed negative answer

# Example of fully validated response:
# ;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1
#                    ^^ ad flag!

# ;; ANSWER SECTION:
# www.example.com. 3600 IN AAAA 2001:db8::10
# www.example.com. 3600 IN RRSIG AAAA 13 3 3600 20260420... (signature)

# Example of SERVFAIL (validation failure):
# ;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1
# ;; status: SERVFAIL (no 'ad' flag - validation failed)
```

## Debugging Validation Failures

```bash
# Use +cd flag to bypass validation and see raw response
dig +dnssec +cd A sigfail.verteiltesysteme.net @localhost
# +cd = checking disabled - gets answer even if invalid

# Compare with validation enabled:
dig +dnssec A sigfail.verteiltesysteme.net @localhost
# Should be SERVFAIL

# BIND: enable DNSSEC debug logging
# /etc/named.conf
logging {
    channel dnssec_log {
        file "/var/log/named/dnssec.log";
        severity debug 3;
        print-time yes;
        print-severity yes;
    };
    category dnssec { dnssec_log; };
};

# Monitor validation events
tail -f /var/log/named/dnssec.log | grep -Ei "fail|error|bogus"

# Unbound: enable validation failure logging
# /etc/unbound/unbound.conf
server:
    val-log-level: 1
    logfile: "/var/log/unbound.log"

# Monitor validation failures
tail -f /var/log/unbound.log | grep -Ei "bogus|validation"
```

## Checking Trust Anchor

```bash
# BIND: view current root trust anchors
rndc managed-keys status

# Output should show the root (".") and one or more managed trust anchors
# with a valid state and a next refresh time.

# Unbound: view trust anchor
cat /var/lib/unbound/root.key

# Verify trust anchor is current
# Compare with IANA root trust anchors:
# https://www.iana.org/dnssec/files
dig DNSKEY . @a.root-servers.net | grep "257 3 8"
# One or more KSKs should match your local trust anchor set

# Manual trust anchor for testing
# /etc/named.conf
trust-anchors {
    "example.com." static-key 257 3 13 "<KSK public key data>";
};
```

## Application-Level Validation Testing

```python
# Python: test DNSSEC validation status
import dns.flags
import dns.resolver
import dns.rdatatype

resolver = dns.resolver.Resolver(configure=False)
resolver.nameservers = ['::1', '127.0.0.1']
resolver.use_edns(edns=True, ednsflags=dns.flags.DO, payload=1232)
resolver.flags = dns.flags.RD | dns.flags.AD

def check_dnssec(name: str, rdtype: str = 'AAAA'):
    """Check if a DNS name validates with DNSSEC."""
    try:
        answer = resolver.resolve(name, rdtype)
        ad_set = bool(answer.response.flags & dns.flags.AD)
        has_rrsig = any(
            rrset.rdtype == dns.rdatatype.RRSIG
            for rrset in answer.response.answer
        )

        print(f"{name} ({rdtype}): {answer[0] if answer.rrset else 'NODATA'}")
        print(f"  AD flag set: {ad_set}")
        print(f"  RRSIG present: {has_rrsig}")

    except dns.resolver.NXDOMAIN:
        print(f"{name}: NXDOMAIN")
    except dns.resolver.NoAnswer:
        print(f"{name}: No {rdtype} record")
    except dns.resolver.NoNameservers as e:
        print(f"{name}: SERVFAIL or validation failure - {e}")
    except Exception as e:
        print(f"{name}: ERROR - {e}")

check_dnssec("www.dnssec-deployment.org")
check_dnssec("sigfail.verteiltesysteme.net", "A")
```

## Conclusion

DNSSEC validation is enabled on recursive resolvers (BIND or Unbound), not on authoritative servers. Use `dnssec-validation auto` in BIND to automatically load IANA root trust anchors and enable RFC 5011 automatic updates. Test with known good zones (`www.dnssec-deployment.org` should validate) and known broken zones (`sigfail.verteiltesysteme.net` should return SERVFAIL). The `ad` flag in dig output confirms the resolver marked the response secure. Use `+cd` (checking disabled) to retrieve responses that fail validation for debugging. Monitor BIND's dnssec category logs for validation failures in production.
