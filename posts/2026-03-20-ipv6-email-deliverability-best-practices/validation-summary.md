# Validation Summary: How to Understand IPv6 Email Deliverability Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SMTP and email deliverability
- DNS PTR, AAAA, and forward-confirmed reverse DNS (FCrDNS)
- SPF
- DKIM
- DMARC
- Postfix
- Linux IPv6 sysctl configuration
- DNSBL / Spamhaus DQS
- Google Postmaster Tools, Microsoft SNDS, and Yahoo sender tools

## Sources Consulted
- Google Email sender guidelines: https://support.google.com/a/answer/81126?hl=en
- Google Postmaster Tools setup: https://support.google.com/a/answer/9981691?hl=en
- Microsoft 365 mail flow over IPv6 requirements: https://learn.microsoft.com/et-ee/defender-office-365/mail-flow-about
- Microsoft DMARC configuration guidance: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure?view=o365-worldwide
- Yahoo Sender Best Practices: https://senders.yahooinc.com/best-practices/?is_listing=false
- Yahoo SMTP error codes / sender requirements: https://senders.yahooinc.com/error-codes
- Postfix configuration parameters: https://www.postfix.org/postconf.5.html
- Postfix IPv6 support notes: https://www.postfix.org/IPV6_README.html
- Linux kernel `use_tempaddr` sysctl documentation: https://www.kernel.org/doc/html/v5.14/networking/ip-sysctl.html
- Spamhaus DQS query format: https://docs.spamhaus.com/datasets/docs/source/70-access-methods/data-query-service/040-dqs-queries.html
- Spamhaus public-mirror to DQS migration guidance: https://docs.spamhaus.com/datasets/docs/source/70-access-methods/data-query-service/015-migrating-to-dqs.html
- RFC 7208 (SPF): https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376 (DKIM): https://www.rfc-editor.org/rfc/rfc6376
- RFC 7489 (DMARC): https://datatracker.ietf.org/doc/rfc7489/

## Issues Found
- The original decision flow overstated provider behavior, implied the SPF `ip6:` mechanism itself was required, required both SPF and DKIM individually, and implied DMARC pass guarantees inbox delivery. I rewrote the Mermaid flow so it reflects provider guidance and DMARC alignment semantics more accurately.
- The authentication section said all three authentication methods were mandatory in all cases. I narrowed that statement to bulk or commercial sending to match current Google and Yahoo requirements and Microsoft’s documented IPv6 acceptance rules.
- The warm-up section gave fixed weekly volume numbers that were not supported by the provider documentation consulted. I replaced them with provider-backed guidance to start low, increase gradually, avoid spikes, and monitor errors and reputation.
- The dedicated mail range example used `2001:db8:mail::1`, which is not a valid IPv6 literal because IPv6 hextets are hexadecimal. I replaced it with a valid documentation address.
- The DNSBL example hard-coded provider zones that were not validated as current IPv6 lookup endpoints and omitted current Spamhaus DQS requirements. I replaced it with a provider-documented IPv6 lookup example using Spamhaus DQS query format and a placeholder key.
- The Postfix example used `smtp_address_preference = ipv6`, which Postfix documents as unsafe. I changed it to `smtp_address_preference = any`.
- The delivery-rate status pipeline extracted the last log field before searching for `status=...`, which would miss normal Postfix log lines. I replaced it with a direct status extraction and tightened the relay regex used for IPv4 versus IPv6 classification.
- The summary checklist incorrectly required an explicit SPF `ip6:` mechanism and a DMARC policy of at least `p=quarantine`. I corrected this to require that SPF authorize the IPv6 sender and that a DMARC record be published, with `p=none` acceptable initially.
- The provider-tools section treated Yahoo Sender Hub like a postmaster metrics dashboard and said the listed tools expose IPv6-address-specific metrics. I updated the section to refer to the relevant Google, Microsoft, and Yahoo tools more accurately and describe their roles correctly.

## Review Notes
- The remaining DNS, Postfix, and sysctl examples are technically sound as illustrative examples.
- The post continues to use documentation-prefix IPv6 addresses from `2001:db8::/32`, which is appropriate for example content.
- The DMARC example record uses `p=reject`, which is valid, but the operationally safer rollout path is usually `p=none` first, then `quarantine`, then `reject` after alignment is verified.
