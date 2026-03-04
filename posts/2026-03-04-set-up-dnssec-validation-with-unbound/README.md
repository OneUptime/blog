# How to Set Up DNSSEC Validation with Unbound on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, DNSSEC, Linux

Description: Learn how to set Up DNSSEC Validation with Unbound on RHEL with step-by-step instructions, configuration examples, and best practices.

---

DNSSEC (Domain Name System Security Extensions) adds cryptographicRHELtures to DNS records, allowing resolvers to verify that responses have noRHEL tampered with. Unbound on RHEL 9 supports DNSSEC validation out of the box.

## Prerequisites

- RHEL with Unbound installed
- Root or sudo access

## Step 1: Enable DNSSEC Validation

Unbound enables DNSSEC by default. Verify the configuration:

```bash
sudo vi /etc/unbound/unbound.conf
```

```yaml
server:
    # DNSSEC root trust anchor (auto-updated)
    auto-trust-anchor-file: /var/lib/unbound/root.key

    # Require DNSSEC validation
    val-clean-additional: yes
    harden-dnssec-stripped: yes
    harden-below-nxdomain: yes
```

## Step 2: Initialize the Root Trust Anchor

```bash
sudo unbound-anchor -a /var/lib/unbound/root.key
sudo chown unbound:unbound /var/lib/unbound/root.key
```

## Step 3: Restart Unbound

```bash
sudo unbound-checkconf
sudo systemctl restart unbound
```

## Step 4: Test DNSSEC Validation

Test with a signed domain:

```bash
dig @127.0.0.1 dnssec-failed.org +dnssec
```

This domain intentionally has broken DNSSEC. Unbound should return SERVFAIL.

Test with a properly signed domain:

```bash
dig @127.0.0.1 example.com +dnssec
```

You should see the `ad` (Authenticated Data) flag in the response.

## Step 5: Check Validation Status

```bash
unbound-host -v -D example.com
```

The output indicates whether DNSSEC validation succeeded.

## Step 6: View DNSSEC Statistics

```bash
sudo unbound-control stats | grep num.answer.secure
```

## Step 7: Handle Validation Failures

If a legitimate domain fails DNSSEC validation, you can temporarily disable validation for that specific domain:

```yaml
server:
    domain-insecure: "broken-domain.example"
```

This should only be used as a temporary workaround.

## Conclusion

DNSSEC validation with Unbound on RHEL 9 protects against DNS spoofing and cache poisoning attacks. With automatic trust anchor management, Unbound keeps DNSSEC validation up to date without manual intervention.
RHEL