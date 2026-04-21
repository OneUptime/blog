# Validation Summary: How to Configure SPF Records for IPv4 Mail Server Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SPF (Sender Policy Framework)
- DNS TXT records and zone-file syntax
- IPv4 CIDR SPF mechanisms
- Google Workspace SPF include records
- Twilio SendGrid SPF include records
- Mailchimp SPF include records
- pyspf Python package
- swaks SMTP testing tool
- Postfix SMTP policy delegation
- postfix-policyd-spf-python

## Sources Consulted
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1 - https://datatracker.ietf.org/doc/html/rfc7208
- RFC 1035: Domain Names - Implementation and Specification - https://datatracker.ietf.org/doc/html/rfc1035
- Google Workspace Admin Help: Set up SPF - https://support.google.com/a/answer/33786
- Twilio SendGrid Docs: Verify sending email servers with SPF - https://www.twilio.com/docs/sendgrid/ui/sending-email/verify-sender-with-spf
- Twilio SendGrid Docs: Sender Policy Framework glossary - https://www.twilio.com/docs/sendgrid/glossary/spf
- Mailchimp Help: Set Up Email Domain Authentication - https://mailchimp.com/help/set-up-email-domain-authentication/
- pyspf package documentation - https://pypi.org/project/pyspf/
- Debian pyspf source reference for `check2()` - https://sources.debian.org/src/pyspf/
- Postfix SMTP Access Policy Delegation - https://www.postfix.org/SMTPD_POLICY_README.html
- Postfix `master.cf` manual - https://www.postfix.org/master.5.html
- Swaks official reference documentation - https://www.jetmore.org/john/code/swaks/latest/doc/ref.txt
- Ubuntu package metadata from `apt-cache show` for `postfix-policyd-spf-python`, `python3-spf`, `swaks`, and `bind9-dnsutils`
- Link checks for MXToolbox SPF lookup and spf-record.com SPF lookup

## Issues Found
1. **SPF identity and result handling were overstated**: The post described SPF as simply a DNS TXT record and mapped qualifiers directly to accept/reject actions. RFC 7208 defines SPF as authorization for the SMTP `MAIL FROM` and `HELO` identities, and final handling is receiver local policy. Updated the introduction, qualifier table, and conclusion to reflect that.
2. **Multi-line DNS TXT example used invalid shell-style continuations**: The SPF record used backslashes inside a quoted TXT string. In zone files, multi-line record data should be grouped with parentheses and TXT chunks should be separate quoted strings. Replaced the example with RFC 1035-compatible zone-file syntax.
3. **pyspf API example unpacked the wrong return value count**: `spf.check2()` returns `(result, explanation)`, not `(result, code, text)`. Updated the Python example and changed the comment/install command to refer to `pyspf` directly.
4. **swaks source/target semantics were incorrect**: `--server 203.0.113.10` makes swaks connect to that IP as the target SMTP server; it does not make the test originate from that IP. Changed the example to use `--local-interface 203.0.113.10` for a sending server with that source address.
5. **Mailchimp SPF include example used an invalid-looking domain**: Replaced `include:mailchimp-relay.com` with `include:servers.mcsv.net`, which is the include value documented in Google Workspace SPF examples for Mailchimp.
6. **Wildcard SPF wording was too broad**: A wildcard TXT record does not override existing DNS names. Updated the subdomain text and wildcard comment to make the limitation clear.

## Review Notes
- The main SPF mechanisms (`ip4`, `mx`, `a`, `include`, and `all`) and IPv4 CIDR examples are consistent with RFC 7208.
- The Postfix policy service snippet follows Postfix policy delegation and `master.cf` syntax, and the Ubuntu package name `postfix-policyd-spf-python` is available in the local apt metadata.
- Provider include records should always be checked against the current provider instructions before production use, and SPF records that use several `include`, `a`, or `mx` mechanisms must stay within RFC 7208 DNS lookup limits.
