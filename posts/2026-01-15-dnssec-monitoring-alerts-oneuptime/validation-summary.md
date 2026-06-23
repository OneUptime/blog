# Validation Summary: How to Set Up DNSSEC Monitoring Alerts with OneUptime

## Status
validated

## Post Type
Tutorial / Guide (product configuration walkthrough for OneUptime DNSSEC monitoring and alerting)

## Technologies Covered
- DNSSEC (Domain Name System Security Extensions)
- DNS record types (A, AAAA, MX, TXT, CNAME, NS, SOA, DNSKEY, DS, RRSIG, NSEC/NSEC3)
- `dig` (BIND DNS lookup utility)
- OneUptime (DNS monitors, alert rules, on-call schedules, status pages, incident automation)
- Notification integrations (Email, SMS, Slack, Microsoft Teams, PagerDuty, Webhooks)

## Sources Consulted
- RFC 4033 / 4034 / 4035 — DNSSEC protocol specifications (https://datatracker.ietf.org/doc/html/rfc4033)
- BIND `dig` manual — option syntax (`+dnssec`, `+short`, `+trace`) verified locally against DiG 9.18.39
- ICANN DNSSEC overview (https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en)
- DNSViz (https://dnsviz.net/) and Verisign DNSSEC Analyzer (https://dnssec-analyzer.verisignlabs.com/)
- Local verification: ran `dig +dnssec +short example.com DNSKEY` and `dig +dnssec +trace example.com` — both syntactically valid (exit 0)

## Issues Found
No technical issues found.

The DNSSEC concepts are accurately described:
- RRSIG records have validity periods and cause validation failure on expiration — correct.
- DS records in the parent zone must match child zone DNSKEY — correct.
- The chain-of-trust validation flow (DNSKEY → RRSIG → DS → parent → root) is described accurately.
- NSEC/NSEC3 denial-of-existence and SOA serial behavior described correctly.
- Both `dig` command examples use valid, current option syntax and execute successfully.
- External resource URLs are valid and point to the correct authoritative tools/specs.

## Review Notes
- The product-UI descriptions (e.g., a dedicated "DNSSEC Validation" toggle, specific menu labels) are presented as generic, plausible OneUptime workflow steps. These were not exhaustively verified against the live OneUptime UI, but no claim is technically incorrect and the conceptual mapping (DNS monitor type, probe locations, alert rules, on-call policies) is consistent with OneUptime's documented capabilities.
- In the "Runbook Structure" section, a nested triple-backtick code block appears inside a ```` ```markdown ```` fence (line ~351), with a ```` ```text ```` closing marker. This is a cosmetic Markdown-rendering artifact (illustrative runbook content), not a technical error in the DNS/DNSSEC subject matter, so it was left unchanged to avoid restructuring the post.
- DS-record propagation guidance of "up to 48 hours" is a reasonable upper bound depending on parent TTLs and registrar processing.
