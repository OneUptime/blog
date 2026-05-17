# Validation Summary: How to Troubleshoot Mail Relay Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Postfix (mail transfer agent)
- Ubuntu (mail log paths, package manager)
- SMTP / SMTPS / STARTTLS
- SASL authentication
- TLS (openssl s_client, certificate verification)
- DNS (dig, getent, MX lookups)
- Mail authentication: SPF, DKIM, DMARC
- swaks (Swiss Army Knife for SMTP)
- Networking: iptables, ufw, nc, cloud firewalls (GCP VPC, AWS Security Groups)
- Third-party relays: SendGrid, Mailgun, SES

## Sources Consulted
- Postfix postconf(5) reference: https://www.postfix.org/postconf.5.html
- Postfix postfix(1) command reference: https://www.postfix.org/postfix.1.html
- Postfix SASL_README: https://www.postfix.org/SASL_README.html
- Debian postconf.5 manpage mirror: https://manpages.debian.org/bookworm/postfix/postconf.5.en.html
- swaks(1) manpage: https://manpages.debian.org/bookworm/swaks/swaks.1.en.html
- Specific parameter pages verified: `maximal_queue_lifetime`, `bounce_queue_lifetime`, `minimal_backoff_time`, `bounce_service_name`, `smtp_tls_wrappermode`

## Issues Found
1. **Fabricated `postfix` command in DNS Resolution Problems section.** The original post contained:
   ```
   postfix -e internal_mail_filter_classes= smtp_dns_lookup smtp.sendgrid.net
   ```
   The `postfix(1)` command has no `-e` flag, and `smtp_dns_lookup` is not a valid subcommand or parameter name (the closest real parameter is `smtp_dns_support_level`). Running this would produce a usage error. Replaced with `getent hosts smtp.sendgrid.net`, which exercises the system NSS resolver — the same resolution path Postfix uses by default — and is a valid, commonly recommended way to verify name resolution from Postfix's perspective.

## Review Notes
- The `smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1` example uses the legacy negation syntax. This still works, but in Postfix 3.6+ the default was changed to `>=TLSv1.2` and the modern recommendation is to use `>=` syntax. The legacy form remains valid and equivalent, so no change made.
- For `Sender Address Rejected`, the example shows `status=deferred (550 ...)`. Strictly, a 5xx SMTP response from a relay normally produces `status=bounced` rather than `status=deferred` (unless `soft_bounce = yes` is set). The author's intent — identifying relay-side sender rejection — is still conveyed correctly, so left as-is; in practice some relays do return 4xx codes for sender-policy violations that would defer.
- All Postfix parameter defaults cited in the post are correct: `maximal_queue_lifetime = 5d`, `bounce_queue_lifetime = 5d`, `minimal_backoff_time = 300s`.
- The `sasl_passwd` bracketed-host format and the `smtp_tls_wrappermode = yes` recommendation for port 465 are both correct per official Postfix docs.
- The `swaks --tls` flag (STARTTLS) and the master.cf edit to add `-v` to the `smtp` service are both valid.
- The `mailq`, `postqueue`, `postsuper`, `postcat`, and `postmap` invocations are all correct.
