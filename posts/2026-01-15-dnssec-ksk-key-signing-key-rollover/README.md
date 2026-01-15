# How to Perform a DNSSEC KSK (Key Signing Key) Rollover

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: DNSSEC, DNS, Security, Key Management, Infrastructure, DevOps

Description: A comprehensive guide to performing DNSSEC KSK rollovers safely, covering the double-signature and double-DS methods, timing considerations, automation strategies, and common pitfalls to avoid.

---

DNSSEC protects DNS queries from spoofing and cache poisoning by cryptographically signing zone data. At the heart of this trust chain sits the Key Signing Key (KSK), which signs the Zone Signing Key (ZSK) and anchors your domain in the global DNSSEC hierarchy. Unlike ZSK rollovers, which happen frequently and stay within your zone, KSK rollovers require coordination with your parent zone (registrar or registry) and carry higher risk if mishandled.

This guide walks through the complete KSK rollover process, from understanding why and when to roll, through the two primary rollover methods, to monitoring and validation steps that prevent outages.

## Why KSK Rollovers Matter

The KSK is the trust anchor for your zone. The parent zone (for example, `.com` for `example.com`) holds a Delegation Signer (DS) record that points to your KSK. Resolvers worldwide validate your zone's signatures by tracing this chain from the root zone down through your DS record to your KSK.

### Reasons to Roll Your KSK

1. **Key compromise or suspected compromise:** If your KSK private key may have been exposed, immediate rollover is required.
2. **Cryptographic algorithm upgrade:** Moving from RSA to ECDSA, or increasing key size, requires a new KSK.
3. **Scheduled rotation policy:** Many organizations mandate key rotation every one to five years.
4. **Hardware Security Module (HSM) migration:** Moving keys to a new HSM often requires generating fresh keys.
5. **Compliance requirements:** Standards like PCI-DSS or SOC 2 may require periodic key rotation.

## Understanding the DNSSEC Key Hierarchy

Before diving into rollover procedures, understand the key relationships:

```
Root Zone (.)
    |
    v
TLD Zone (.com)
    |
    +-- DS Record (hash of your KSK)
    |
    v
Your Zone (example.com)
    |
    +-- DNSKEY (KSK) -- signs the ZSK
    |
    +-- DNSKEY (ZSK) -- signs all other records
    |
    +-- RRSIG records (signatures)
```

### Key Types Explained

| Key Type | Purpose | Typical Lifetime | Rollover Frequency |
| --- | --- | --- | --- |
| **KSK** | Signs the DNSKEY RRset; referenced by parent DS | 1-5 years | Annually or on policy/algorithm change |
| **ZSK** | Signs all zone records except DNSKEY | 1-3 months | Monthly or quarterly |

The KSK appears in two places: as a DNSKEY record in your zone and as a DS record in the parent zone (a hash of your KSK). This dual presence makes KSK rollover more complex than ZSK rollover.

## KSK Rollover Methods

There are two primary methods for KSK rollover:

### Method 1: Double-Signature (Double-KSK)

Both the old and new KSK are published simultaneously in your zone, and both sign the DNSKEY RRset.

**Advantages:** Simpler coordination with parent zone, both keys remain valid throughout, easier to abort if problems arise.

**Disadvantages:** Larger DNSKEY response size during rollover, longer rollover window.

### Method 2: Double-DS

You first add the new DS record to the parent, then swap the KSK in your zone, then remove the old DS.

**Advantages:** Smaller DNSKEY response size, faster overall rollover time possible.

**Disadvantages:** Requires precise timing, more coordination with parent zone, harder to abort mid-rollover.

## Method 1: Double-Signature Rollover (Recommended)

This is the safer and more commonly used method.

### Phase 1: Generate the New KSK

```bash
# Using BIND's dnssec-keygen
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE example.com

# For RSA (if required)
dnssec-keygen -a RSASHA256 -b 2048 -f KSK -n ZONE example.com
```

This creates two files: `Kexample.com.+013+12345.key` (public key) and `Kexample.com.+013+12345.private` (private key). Store the private key securely, ideally in an HSM.

### Phase 2: Publish the New KSK (Both Keys Active)

Add the new KSK to your zone file:

```zone
; Zone file excerpt - both KSKs present
example.com. 86400 IN DNSKEY 257 3 13 (
    old_ksk_public_key_data
) ; KSK - OLD

example.com. 86400 IN DNSKEY 257 3 13 (
    new_ksk_public_key_data
) ; KSK - NEW

example.com. 86400 IN DNSKEY 256 3 13 (
    zsk_public_key_data
) ; ZSK
```

Sign the zone with both KSKs:

```bash
rndc sign example.com
```

### Phase 3: Wait for Propagation

**Critical timing:** Wait for the new DNSKEY RRset to propagate and for cached copies of the old RRset to expire.

```
Wait = MAX(TTL of DNSKEY RRset, TTL of DS record) + propagation buffer
```

For a DNSKEY TTL of 86400 seconds (1 day), wait at least 48 hours before proceeding.

### Phase 4: Update the DS Record at Parent

Generate the DS record for the new KSK:

```bash
dnssec-dsfromkey Kexample.com.+013+NEW_KEY_ID.key
```

Submit this DS record to your registrar. **Keep the old DS record in place.** You now have two DS records at the parent.

### Phase 5: Wait for DS Propagation

Wait for the new DS record to propagate:

```
Wait = TTL of parent DS record + propagation buffer
```

For `.com` domains, the DS TTL is typically 86400 seconds. Wait at least 48 hours.

### Phase 6: Validate the New Chain

```bash
# Using delv (BIND's DNS lookup and validation utility)
delv @8.8.8.8 example.com DNSKEY +vtrace

# Check from multiple resolvers
for resolver in 8.8.8.8 1.1.1.1 9.9.9.9; do
  delv @$resolver example.com SOA +vtrace
done

# Verify DS records at parent
dig example.com DS @a.gtld-servers.net
```

### Phase 7: Remove the Old DS Record

Once validation confirms the new chain works, remove the old DS record from the parent zone through your registrar.

### Phase 8: Wait Again

Wait for the old DS record to expire from caches (TTL of parent DS record + propagation buffer).

### Phase 9: Remove the Old KSK

Remove the old KSK from your zone, re-sign, and verify one final time.

### Phase 10: Archive and Secure

1. Archive the old KSK private key securely
2. Update documentation with new key identifiers
3. Schedule the next KSK rollover

## Method 2: Double-DS Rollover

This method minimizes the time both keys exist in your zone.

### Steps

1. **Generate New KSK** (same as Method 1)
2. **Submit New DS to Parent** before publishing the new KSK
3. **Wait for DS Propagation** (TTL of parent DS + buffer)
4. **Swap KSKs in Your Zone** in a single operation
5. **Wait for DNSKEY Propagation** (TTL of DNSKEY + buffer)
6. **Remove Old DS from Parent**
7. **Final Validation**

## Timing Considerations Summary

| Phase | Minimum Wait | Recommended Wait |
| --- | --- | --- |
| DNSKEY propagation | 1x DNSKEY TTL | 2x DNSKEY TTL |
| DS propagation | 1x DS TTL | 2x DS TTL |
| Safety buffer | 1 hour | 24 hours |
| Total rollover time | 2-3 days (ideal TTLs) | 1-2 weeks (conservative) |

## Automation with Common DNS Software

### BIND 9 with dnssec-policy

```named.conf
dnssec-policy "standard" {
    keys {
        ksk lifetime P1Y algorithm ecdsap256sha256;
        zsk lifetime P3M algorithm ecdsap256sha256;
    };
    dnskey-ttl 3600;
    publish-safety PT1H;
    retire-safety P2D;
    parent-ds-ttl P1D;
};

zone "example.com" {
    type primary;
    file "example.com.zone";
    dnssec-policy "standard";
    inline-signing yes;
};
```

### PowerDNS with pdnsutil

```bash
pdnsutil add-zone-key example.com ksk active ecdsa256
pdnsutil show-zone example.com
pdnsutil export-zone-ds example.com
pdnsutil remove-zone-key example.com OLD_KEY_ID
```

### Knot DNS

```bash
keymgr example.com generate algorithm=ECDSAP256SHA256 ksk=yes
keymgr example.com list
keymgr example.com ds
keymgr example.com set OLD_KEY_ID retire=+0
```

## Monitoring and Validation Tools

### Pre-Rollover Checks

```bash
dig +dnssec example.com SOA
dig example.com DNSKEY +multi
dig example.com DS @a.gtld-servers.net
delv example.com SOA +vtrace
```

### During Rollover Monitoring

```bash
#!/bin/bash
DOMAIN="example.com"
RESOLVERS="8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222"

for resolver in $RESOLVERS; do
    echo "=== Checking $resolver ==="
    dig @$resolver $DOMAIN DNSKEY +short | wc -l
    delv @$resolver $DOMAIN SOA 2>&1 | grep -E "(fully validated|validation)"
done
```

### External Validation Services

1. **DNSViz** (https://dnsviz.net): Visual DNSSEC chain analysis
2. **Verisign DNSSEC Debugger** (https://dnssec-debugger.verisignlabs.com)
3. **Zonemaster** (https://zonemaster.net): Comprehensive DNS testing

### Alerting Integration with OneUptime

```yaml
- name: DNSSEC Validation Failure
  type: dns_monitor
  target: example.com
  record_type: SOA
  dnssec_validation: required
  alert_on: validation_failure
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Insufficient Wait Times

**Problem:** Removing the old key or DS before caches expire causes validation failures.

**Solution:** Always wait at least 2x the TTL plus a safety buffer.

### Pitfall 2: Forgetting the DS Update

**Problem:** New KSK is published but DS at parent still points to old KSK.

**Solution:** Make the DS update a mandatory checklist item.

### Pitfall 3: Algorithm Rollover Without Proper Sequencing

**Problem:** Changing from RSA to ECDSA while also rolling the KSK.

**Solution:** Perform algorithm rollovers separately from regular key rollovers.

### Pitfall 4: Clock Skew

**Problem:** Servers with incorrect time cause signature validation to fail.

**Solution:** Ensure all servers use NTP. Set signature inception times slightly in the past.

### Pitfall 5: Secondary Server Sync Issues

**Problem:** Secondary servers do not receive the new signed zone in time.

**Solution:** Monitor zone transfer completion across all secondaries:

```bash
for ns in $(dig example.com NS +short); do
    echo "$ns: $(dig @$ns example.com SOA +short | awk '{print $3}')"
done
```

## Emergency Rollover Procedure

When a key is compromised, speed matters but so does not breaking resolution:

### Immediate Actions (Hour 1)

```bash
# Generate new KSK immediately
dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE example.com

# Publish new KSK alongside old, sign with both
rndc sign example.com

# Generate and submit new DS to parent
dnssec-dsfromkey Kexample.com.+013+NEW.key
```

### Accelerated Timeline (Hours 2-24)

1. Lower DNSKEY TTL if possible
2. Monitor DS propagation aggressively
3. Request parent zone TTL reduction if critical

### Completion (Hours 24-48)

1. Remove old DS after confirmation of new chain
2. Remove old KSK after DS TTL expiration
3. Revoke compromised key (optional, RFC 5011)

## KSK Rollover Summary Table

| Step | Double-Signature Method | Double-DS Method | Timing |
| --- | --- | --- | --- |
| 1 | Generate new KSK | Generate new KSK | Immediate |
| 2 | Publish both KSKs, sign with both | Submit new DS to parent | Immediate |
| 3 | Wait for DNSKEY propagation | Wait for DS propagation | 1-2x TTL |
| 4 | Submit new DS to parent | Swap KSK in zone | After wait |
| 5 | Wait for DS propagation | Wait for DNSKEY propagation | 1-2x TTL |
| 6 | Remove old DS from parent | Remove old DS from parent | After wait |
| 7 | Wait for old DS expiration | Final validation | 1-2x TTL |
| 8 | Remove old KSK from zone | (Complete) | After wait |
| 9 | Final validation | - | After wait |
| **Total** | **4-7 days typical** | **3-5 days typical** | - |

## Rollover Checklist

### Pre-Rollover

- [ ] Document current key IDs and DS records
- [ ] Verify current DNSSEC chain validates correctly
- [ ] Confirm registrar API/portal access works
- [ ] Note TTLs: DNSKEY TTL = ___, Parent DS TTL = ___
- [ ] Calculate minimum wait times
- [ ] Set up monitoring/alerting for validation failures

### During Rollover (Double-Signature)

- [ ] Generate new KSK
- [ ] Securely store new private key
- [ ] Add new KSK to zone and sign with both KSKs
- [ ] Verify both DNSKEYs visible from external resolvers
- [ ] Wait for DNSKEY propagation
- [ ] Generate and submit new DS to registrar
- [ ] Verify both DS records at parent
- [ ] Wait for DS propagation
- [ ] Validate new chain from multiple resolvers
- [ ] Remove old DS from parent
- [ ] Wait for old DS expiration
- [ ] Remove old KSK from zone and re-sign
- [ ] Final validation

### Post-Rollover

- [ ] Update documentation with new key IDs
- [ ] Archive old key material securely
- [ ] Schedule next rollover date

## Infrastructure as Code Integration

### Terraform Example

```hcl
resource "dns_dnssec_key" "ksk" {
  zone      = "example.com"
  algorithm = "ECDSAP256SHA256"
  key_type  = "KSK"
}

resource "registrar_ds_record" "example" {
  domain      = "example.com"
  key_tag     = dns_dnssec_key.ksk.key_tag
  algorithm   = dns_dnssec_key.ksk.algorithm_id
  digest_type = 2
  digest      = dns_dnssec_key.ksk.ds_digest_sha256
}
```

### Ansible Playbook Snippet

```yaml
- name: KSK Rollover Playbook
  hosts: dns_primary
  vars:
    domain: example.com
    wait_hours: 48

  tasks:
    - name: Generate new KSK
      command: dnssec-keygen -a ECDSAP256SHA256 -f KSK -n ZONE {{ domain }}
      register: new_key

    - name: Sign zone with new key
      command: rndc sign {{ domain }}

    - name: Wait for propagation
      pause:
        hours: "{{ wait_hours }}"

    - name: Generate DS record
      command: dnssec-dsfromkey {{ new_key.stdout }}.key
      register: ds_record
```

## Conclusion

KSK rollovers are infrequent but critical operations that require careful planning and execution. The key principles are:

1. **Plan ahead:** Know your TTLs, have automation ready, and document procedures.
2. **Be patient:** The most common cause of DNSSEC outages during rollover is insufficient wait times.
3. **Validate continuously:** Check from multiple resolvers and external validation services throughout the process.
4. **Have a rollback plan:** Keep the old key material accessible until you are certain the new chain is stable.
5. **Monitor after completion:** Some caches may hold stale data longer than expected.

DNSSEC provides essential protection against DNS spoofing attacks, but that protection depends on proper key management. By following structured rollover procedures and maintaining vigilant monitoring with tools like OneUptime, you can rotate your KSK without disrupting the trust chain that protects your domain.

## Further Reading

- RFC 6781: DNSSEC Operational Practices, Version 2
- RFC 7583: DNSSEC Key Rollover Timing Considerations
- RFC 8901: Multi-Signer DNSSEC Models
- RFC 5011: Automated Updates of DNS Security (DNSSEC) Trust Anchors
- ICANN DNSSEC Practice Statements
