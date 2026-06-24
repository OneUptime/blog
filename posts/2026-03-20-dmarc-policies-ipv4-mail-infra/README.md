# How to Configure DMARC Policies Referencing IPv4 Mail Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DMARC, IPv4, Email Security, DNS, SPF, DKIM, Anti-Spoofing

Description: Configure DMARC DNS records to define policies for email from your IPv4 mail infrastructure, specifying what to do with unauthenticated messages and where to send reports.

## Introduction

DMARC (Domain-based Message Authentication, Reporting and Conformance) builds on SPF and DKIM. It tells receiving mail servers what to do when mail fails DMARC checks, and where to send reports. DMARC depends on SPF or DKIM being properly configured and aligned for the domains that send on your behalf. If your outbound mail uses IPv4 addresses, that usually means publishing the correct SPF `ip4` mechanisms and/or DKIM selectors first.

## Prerequisites

Verify SPF and DKIM are configured:

```bash
# Check SPF record

dig +short TXT example.com | grep spf1
# Expected: "v=spf1 ip4:203.0.113.10 ~all"

# Check DKIM record
dig +short TXT mail._domainkey.example.com | grep DKIM1
# Expected: "v=DKIM1; k=rsa; p=..."
```

## Basic DMARC Record

```dns
; DNS TXT record: _dmarc.example.com
; Start with monitoring mode (p=none) to collect reports without affecting delivery

_dmarc.example.com. IN TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@example.com; ruf=mailto:dmarc-failures@example.com; fo=1"
```

## DMARC Policy Values

| Policy | Action | Use When |
|---|---|---|
| `p=none` | Monitor only, take no action | Initial deployment |
| `p=quarantine` | Treat as suspicious, often spam/junk | Ready to enforce |
| `p=reject` | Reject the message | Full enforcement |

## Progressive DMARC Rollout

```dns
; Phase 1: Monitor (first 2 weeks)
_dmarc.example.com. IN TXT "v=DMARC1; p=none; pct=100; rua=mailto:dmarc@example.com"

; Phase 2: Quarantine 10% of failing mail
_dmarc.example.com. IN TXT "v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc@example.com"

; Phase 3: Quarantine all failing mail
_dmarc.example.com. IN TXT "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@example.com"

; Phase 4: Reject all failing mail (full enforcement)
_dmarc.example.com. IN TXT "v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@example.com"
```

## Full DMARC Record with All Options

```dns
_dmarc.example.com. IN TXT (
    "v=DMARC1; p=quarantine; pct=100; "
    "rua=mailto:dmarc-agg@example.com; "
    "ruf=mailto:dmarc-fail@example.com; "
    "fo=1; adkim=r; aspf=r; sp=none; ri=86400"
)
```

| Field | Meaning |
|---|---|
| `p=quarantine` | Policy for domain |
| `pct=100` | Apply to 100% of failing mail |
| `rua=` | Aggregate report email |
| `ruf=` | Forensic (failure) report email |
| `fo=1` | Request failure reports if any underlying mechanism does not produce an aligned pass |
| `adkim=r` | DKIM alignment: relaxed |
| `aspf=r` | SPF alignment: relaxed |
| `sp=none` | Policy for subdomains |
| `ri=86400` | Requested aggregate report interval: 24 hours |

## Receiving and Analyzing DMARC Reports

```bash
# Set up a mailbox for dmarc reports
# rua: aggregate XML reports (often compressed)
# ruf: individual failure reports (if the receiver sends them)

# Parse DMARC XML reports
pip install parsedmarc
parsedmarc -o /tmp --aggregate-json-filename report.json /path/to/dmarc-report.xml.gz

# Or use an online tool:
# https://dmarc.postmarkapp.com/
# https://mxtoolbox.com/DMARCReportAnalyzer.aspx
```

## Verifying DMARC

```bash
# Check DMARC record is published
dig +short TXT _dmarc.example.com

# Test DMARC alignment by sending a message through your real outbound path
# (for example, from an @example.com mailbox to Gmail or Outlook)

# Check received email headers for DMARC result:
# Authentication-Results: mx.google.com;
#   dmarc=pass (p=QUARANTINE sp=NONE dis=NONE) header.from=example.com
```

## Conclusion

DMARC adds policy enforcement to SPF and DKIM. Start with `p=none` to collect reports without impacting delivery, analyze aggregate reports to find unauthorized senders using your domain, add them to SPF/DKIM, then graduate to `p=quarantine` and finally `p=reject`. Reports help reveal the systems sending mail as your domain across receivers that send DMARC reports, including marketing tools, CRMs, and shadow IT.
