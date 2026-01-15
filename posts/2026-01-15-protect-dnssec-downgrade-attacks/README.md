# How to Protect Against DNSSEC Downgrade Attacks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, Security, DNS, Attacks, Protection, Infrastructure

Description: A comprehensive guide to understanding, detecting, and defending against DNSSEC downgrade attacks that strip cryptographic validation from DNS queries.

---

DNS is the backbone of internet connectivity, translating human-readable domain names into IP addresses. DNSSEC (Domain Name System Security Extensions) was designed to protect this critical infrastructure by adding cryptographic signatures to DNS records. However, attackers have developed sophisticated techniques to bypass these protections through downgrade attacks that strip away DNSSEC validation, leaving organizations vulnerable to DNS spoofing and cache poisoning.

This guide provides an in-depth examination of DNSSEC downgrade attacks, their mechanics, real-world impact, and comprehensive protection strategies.

---

## Understanding DNSSEC: The Foundation

DNSSEC adds a layer of trust on top of DNS by digitally signing DNS records. When a resolver queries for a domain, it receives not only the DNS record but also a digital signature (RRSIG) that proves the record has not been tampered with.

```
Traditional DNS Query Flow:
Client -> Resolver -> Root -> TLD -> Authoritative

DNSSEC Query Flow:
Client -> Resolver -> Root (DNSKEY + DS) -> TLD (DNSKEY + DS) -> Authoritative (DNSKEY + RRSIG)
```

### Key DNSSEC Record Types

| Record Type | Purpose | Description |
|-------------|---------|-------------|
| **DNSKEY** | Public Key | Contains the public key used to verify signatures |
| **RRSIG** | Signature | Digital signature over a DNS record set |
| **DS** | Delegation Signer | Hash of child zone DNSKEY, stored in parent zone |
| **NSEC/NSEC3** | Authenticated Denial | Proves a record does not exist |

### The Chain of Trust

DNSSEC creates a chain of trust from the root zone down to individual domains. When any link in this chain is broken or bypassed, DNSSEC validation fails, potentially exposing users to spoofed DNS responses.

---

## What Are DNSSEC Downgrade Attacks?

A DNSSEC downgrade attack is a technique where an attacker manipulates DNS traffic to remove or invalidate DNSSEC signatures, causing resolvers to fall back to insecure DNS resolution. This allows the attacker to inject malicious DNS responses without detection.

### Attack Motivation

Attackers target DNSSEC because:

1. **Bypass Authentication:** Removing DNSSEC validation allows cache poisoning and DNS spoofing
2. **Man-in-the-Middle Positioning:** Redirecting traffic through attacker-controlled servers
3. **Credential Theft:** Steering users to fake login pages
4. **Malware Distribution:** Redirecting software update checks to malicious servers
5. **Certificate Issuance:** Obtaining fraudulent TLS certificates through DNS-based validation

---

## Attack Vectors in Detail

### Vector 1: Stripping DNSSEC Records (RRSIG Removal)

The most straightforward downgrade attack involves an attacker in a man-in-the-middle position stripping DNSSEC records from DNS responses.

```
Normal Response:
  example.com. 300 IN A 93.184.216.34
  example.com. 300 IN RRSIG A 13 2 300 20260201000000 20260115000000 ...

Stripped Response:
  example.com. 300 IN A 192.168.1.100  <- Attacker's IP
  [No RRSIG record]
```

**How It Works:**

1. Attacker intercepts DNS queries between resolver and authoritative server
2. Attacker removes RRSIG records from the response
3. Attacker modifies the A/AAAA records to point to malicious servers
4. If the resolver does not enforce strict DNSSEC validation, it accepts the response

### Vector 2: Forged NSEC/NSEC3 Responses

Attackers can forge NSEC or NSEC3 records to falsely claim that DNSSEC records do not exist for a domain.

```
Legitimate Query: Does example.com have DNSKEY?
Expected Response: Yes, here is the DNSKEY and RRSIG

Forged Response: NSEC record claiming example.com has no DNSKEY
                 (zone appears to be unsigned)
```

Some resolvers treat missing DNSKEY as "not a DNSSEC zone" and accept unsigned responses as valid.

### Vector 3: DS Record Manipulation

The DS record in the parent zone is critical for DNSSEC validation. Manipulating this record breaks the chain of trust.

**Attack Scenarios:**

1. **DS Record Deletion:** Attacker removes DS record from parent zone
2. **DS Record Substitution:** Attacker replaces DS with hash of attacker-controlled key
3. **DS Record Expiration:** Attacker delays queries until legitimate DS expires

### Vector 4: Algorithm Downgrade Attacks

DNSSEC supports multiple cryptographic algorithms. Attackers can force the use of weaker algorithms that are easier to compromise.

| Algorithm | ID | Security Level | Status |
|-----------|-----|----------------|--------|
| RSA/MD5 | 1 | Broken | MUST NOT use |
| DSA/SHA-1 | 3 | Weak | NOT RECOMMENDED |
| RSA/SHA-1 | 5 | Weak | NOT RECOMMENDED |
| RSA/SHA-256 | 8 | Strong | RECOMMENDED |
| ECDSA P-256 | 13 | Strong | RECOMMENDED |
| ECDSA P-384 | 14 | Very Strong | RECOMMENDED |
| Ed25519 | 15 | Very Strong | RECOMMENDED |

### Vector 5: Timing and Replay Attacks

DNSSEC signatures have validity periods. Attackers can exploit timing vulnerabilities:

1. **Clock Skew Exploitation:** Manipulate NTP to make signatures appear expired
2. **Replay Old Signatures:** Use captured valid signatures before expiration
3. **Validity Window Attacks:** Exploit gaps between signature refresh

### Vector 6: DNS-over-UDP Fragmentation Attacks

Large DNSSEC responses often require UDP fragmentation, which can be exploited. Attackers can race to inject malicious fragments with predictable IP IDs before legitimate fragments arrive.

### Vector 7: Resolver Misconfiguration Exploitation

Many resolvers are misconfigured in ways that enable downgrade attacks:

```bash
# Vulnerable configuration
server:
    ignore-cd-flag: no  # Accepts queries with CD (Checking Disabled) flag
    val-permissive-mode: yes  # Falls back to insecure on validation failure
```

---

## Real-World Attack Scenarios

### Scenario 1: BGP Hijack Combined with DNSSEC Downgrade

1. Attacker announces BGP route for target resolver's upstream
2. DNS traffic routes through attacker
3. Attacker strips RRSIG records and injects malicious A records
4. Users receive spoofed DNS at massive scale

### Scenario 2: Compromised Wi-Fi with DNSSEC Stripping

1. Attacker sets up rogue Wi-Fi access point
2. DHCP assigns attacker-controlled DNS resolver
3. Resolver proxies queries but strips DNSSEC
4. Selective spoofing of high-value domains (banking, email)

### Scenario 3: Supply Chain Attack on DNS Software

1. Attacker compromises DNS resolver software repository
2. Malicious update disables DNSSEC validation
3. Organizations deploy compromised resolver
4. All DNS queries become vulnerable to spoofing

---

## Protection Mechanisms

### Protection 1: Enforce Strict DNSSEC Validation

**BIND Configuration:**

```bash
options {
    dnssec-validation yes;
    dnssec-log-level 3;
};

logging {
    channel dnssec_log {
        file "/var/log/named/dnssec.log" versions 10 size 100m;
        severity info;
        print-time yes;
    };
    category dnssec { dnssec_log; };
};
```

**Unbound Configuration:**

```yaml
server:
    auto-trust-anchor-file: "/var/lib/unbound/root.key"
    val-permissive-mode: no
    val-bogus-ttl: 60
    ignore-cd-flag: yes
    harden-below-nxdomain: yes
    harden-referral-path: yes
    harden-algo-downgrade: yes
    aggressive-nsec: yes
```

### Protection 2: Implement DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT)

Encrypt DNS traffic to prevent man-in-the-middle attacks.

```yaml
server:
    interface: 0.0.0.0@853
    tls-service-key: "/etc/unbound/server.key"
    tls-service-pem: "/etc/unbound/server.pem"
    tls-port: 853

forward-zone:
    name: "."
    forward-tls-upstream: yes
    forward-addr: 1.1.1.1@853#cloudflare-dns.com
    forward-addr: 8.8.8.8@853#dns.google
```

### Protection 3: Deploy DANE

DANE uses DNSSEC to authenticate TLS certificates, providing defense-in-depth.

```bash
# TLSA record for HTTPS
_443._tcp.example.com. IN TLSA 3 1 1 (
    2bb183af411c7f8c6f04b6
    9428c8ab7c1e3d3aadef5c
    7f35f4b6e5d9a8c3b2f1e0 )
```

### Protection 4: Monitor for DNSSEC Anomalies

```bash
#!/bin/bash
# dnssec_monitor.sh - Monitor DNSSEC validation status

DOMAINS=("example.com" "api.example.com")
RESOLVERS=("1.1.1.1" "8.8.8.8" "9.9.9.9")

check_dnssec() {
    local domain=$1
    local resolver=$2
    ad_flag=$(dig +dnssec "$domain" A @"$resolver" | grep -c "flags:.*ad")
    if [ "$ad_flag" -eq 0 ]; then
        echo "ALERT: DNSSEC validation failed for $domain via $resolver"
        return 1
    fi
    return 0
}

for domain in "${DOMAINS[@]}"; do
    for resolver in "${RESOLVERS[@]}"; do
        check_dnssec "$domain" "$resolver"
    done
done
```

**Prometheus Alert Rules:**

```yaml
groups:
- name: dnssec
  rules:
  - alert: DNSSECValidationFailure
    expr: rate(unbound_dnssec_bogus[5m]) > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "DNSSEC validation failures detected"
```

### Protection 5: Harden Against Algorithm Downgrade

```bash
# BIND - Disable weak algorithms
options {
    disable-algorithms "." {
        RSAMD5;
        DH;
        DSA;
        RSASHA1;
    };
    disable-ds-digests "." {
        SHA-1;
    };
};
```

### Protection 6: Implement Response Rate Limiting

```bash
options {
    rate-limit {
        responses-per-second 10;
        referrals-per-second 5;
        nodata-per-second 5;
        nxdomains-per-second 5;
        errors-per-second 5;
        all-per-second 100;
        window 15;
    };
};
```

### Protection 7: Enable EDNS Client Subnet Privacy

```yaml
server:
    send-client-subnet: 0.0.0.0/0
    send-client-subnet: ::/0
    max-client-subnet-ipv4: 0
    max-client-subnet-ipv6: 0
```

---

## Incident Response for DNSSEC Attacks

### Detection Indicators

```bash
# Missing AD flag in responses for signed zones
dig +dnssec example.com | grep -v "flags:.*ad"

# RRSIG records missing from responses
dig +dnssec example.com | grep -c RRSIG  # Should be > 0

# Unexpected SERVFAIL for signed domains
dig example.com @resolver  # SERVFAIL may indicate blocked attack
```

### Response Playbook

**Immediate Actions (First 15 Minutes):**

1. Isolate affected resolvers
2. Switch client DNS to known-good resolvers (1.1.1.1, 8.8.8.8)
3. Capture network traffic for forensic analysis
4. Check for BGP anomalies affecting DNS traffic paths

**Investigation (First Hour):**

```bash
# Capture DNS traffic
tcpdump -i eth0 port 53 -w dns_capture.pcap

# Analyze for missing DNSSEC records
tshark -r dns_capture.pcap -Y "dns.flags.authenticated == 0"

# Verify DS records at registrar
dig DS example.com @a.gtld-servers.net
```

**Recovery:**

1. Verify DNS zone integrity at authoritative servers
2. Confirm DS records match expected values
3. Force resolver cache flush
4. Re-enable normal DNS resolution
5. Monitor for continued attack attempts

---

## Testing Your DNSSEC Configuration

```bash
#!/bin/bash
# test_dnssec.sh - DNSSEC validation tests

# Test 1: Verify resolver rejects invalid DNSSEC
result=$(dig +dnssec dnssec-failed.org A @127.0.0.1 2>&1)
if echo "$result" | grep -q "SERVFAIL"; then
    echo "PASS: Resolver correctly rejects invalid DNSSEC"
else
    echo "FAIL: Resolver accepted invalid DNSSEC response"
fi

# Test 2: Verify AD flag for valid DNSSEC
ad_flag=$(dig +dnssec cloudflare.com A @127.0.0.1 | grep -c "flags:.*ad")
if [ "$ad_flag" -gt 0 ]; then
    echo "PASS: AD flag present for DNSSEC-signed domain"
else
    echo "FAIL: AD flag missing for DNSSEC-signed domain"
fi

# Test 3: Verify CD flag handling
result=$(dig +cd dnssec-failed.org A @127.0.0.1 2>&1)
if echo "$result" | grep -q "SERVFAIL"; then
    echo "PASS: Resolver ignores CD flag and validates"
else
    echo "WARNING: Resolver may honor CD flag from clients"
fi
```

### External Validation Services

| Service | URL | Purpose |
|---------|-----|---------|
| DNSViz | https://dnsviz.net | Visual chain of trust analysis |
| DNSSEC Analyzer | https://dnssec-analyzer.verisignlabs.com | Detailed validation report |
| Zonemaster | https://zonemaster.net | Comprehensive DNS health check |

---

## Best Practices Summary

### For Domain Owners

1. **Sign all zones with DNSSEC** - Use strong algorithms (ECDSA P-256 or Ed25519)
2. **Automate key rotation** - Use CDS/CDNSKEY for automated DS updates
3. **Monitor DS records** - Alert on any changes to DS records at registrar
4. **Implement DANE** - Add TLSA records for TLS certificate pinning
5. **Use short signature lifetimes** - Limit replay attack window

### For Network Operators

1. **Enforce DNSSEC validation** - Configure resolvers for strict validation
2. **Deploy DoH/DoT** - Encrypt DNS to prevent MitM attacks
3. **Block CD flag** - Prevent client-side validation bypass
4. **Harden algorithms** - Disable weak cryptographic algorithms
5. **Monitor validation failures** - Alert on DNSSEC anomalies
6. **Implement BGP security** - Use RPKI to prevent BGP hijacks affecting DNS

### For Security Teams

1. **Include DNSSEC in threat models** - Assess downgrade attack risks
2. **Regular validation testing** - Verify DNSSEC is working correctly
3. **Incident response planning** - Have playbooks for DNS attacks
4. **Threat intelligence feeds** - Monitor for DNS-related threats
5. **Tabletop exercises** - Practice responding to DNSSEC attacks

---

## Comprehensive Protection Matrix

| Attack Vector | Detection Method | Prevention Measure | Recovery Action |
|---------------|------------------|-------------------|-----------------|
| **RRSIG Stripping** | Missing AD flag in responses | DoH/DoT encryption, strict validation | Flush cache, verify zone |
| **NSEC Forgery** | Unexpected denial of existence | Aggressive NSEC, monitor signed zone list | Verify DS at parent |
| **DS Manipulation** | CT logs, registrar monitoring | Registry lock, multi-factor auth | Emergency DS update |
| **Algorithm Downgrade** | Weak algorithm in responses | Disable weak algorithms in resolver | Re-sign with strong algo |
| **Timing Attacks** | Clock skew detection | NTP hardening, signature monitoring | Verify system time, re-sign |
| **Fragmentation** | Fragment reassembly anomalies | TCP fallback, smaller responses | Enable TCP for DNS |
| **Resolver Misconfiguration** | Security audit, penetration test | Hardened configuration templates | Deploy corrected config |
| **BGP Hijack + DNS** | BGP monitoring, RPKI | RPKI deployment, multiple upstreams | Route corrections, cache flush |

---

## Monitoring with OneUptime

OneUptime provides comprehensive monitoring capabilities that can help detect DNSSEC-related issues:

1. **DNS Monitor:** Configure DNS monitors to check DNSSEC validation status for critical domains
2. **Synthetic Monitoring:** Test DNSSEC resolution from multiple geographic locations
3. **Alert Integration:** Receive immediate notifications when DNSSEC validation fails
4. **Status Pages:** Communicate DNS security incidents to stakeholders
5. **Incident Management:** Track and coordinate response to DNSSEC attacks

---

## Conclusion

DNSSEC downgrade attacks represent a sophisticated threat to DNS security infrastructure. By stripping cryptographic protections, attackers can redirect traffic, steal credentials, and compromise entire networks without leaving obvious traces.

Effective protection requires a defense-in-depth approach:

- **At the zone level:** Sign all zones with strong algorithms, automate key management, and monitor for unauthorized changes
- **At the resolver level:** Enforce strict validation, encrypt DNS traffic, and disable legacy algorithms
- **At the network level:** Implement BGP security, deploy monitoring, and maintain incident response capabilities

Organizations that treat DNS security as a critical infrastructure concern and implement these protections will significantly reduce their exposure to DNSSEC downgrade attacks. Regular testing, continuous monitoring, and updated incident response procedures ensure that defenses remain effective as attack techniques evolve.

The cost of implementing proper DNSSEC protection is minimal compared to the potential impact of a successful DNS hijacking attack. Start with strict validation enforcement, add encryption with DoH or DoT, and build monitoring capabilities to detect attacks in progress.
