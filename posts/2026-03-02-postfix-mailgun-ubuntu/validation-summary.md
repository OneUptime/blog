# Validation Summary: How to Configure Postfix with Mailgun on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Postfix (SMTP server)
- Mailgun (transactional email service: SMTP relay, HTTP API, webhooks, address validation)
- Ubuntu (apt, systemctl)
- SASL authentication (libsasl2-modules)
- TLS / STARTTLS
- Bash, `mail`, `mailutils`, `swaks`, `mailq`, `postmap`, `postconf`
- Python 3 with `requests` (Mailgun HTTP API client)
- Python 3 with Flask (webhook receiver)

## Sources Consulted
- Postfix `postconf(5)` documentation — https://www.postfix.org/postconf.5.html
- Postfix TLS_README — https://www.postfix.org/TLS_README.html
- Mailgun User Manual — Webhooks — https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhooks
- Mailgun securing webhooks — https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks
- Mailgun API Overview — https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview
- Mailgun Address Validation API — https://documentation.mailgun.com/docs/validate/api-overview
- Mailgun SMTP Relay / Send via SMTP — https://documentation.mailgun.com/docs/mailgun/user-manual/smtp-protocol/smtp-relay
- Mailgun Pricing — https://www.mailgun.com/pricing/ (Free plan: 100/day still current)

## Issues Found

1. **Wrong Postfix parameter for restricting TLS protocols (line 92).** The config used `smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1`, but per Postfix `TLS_README`, when `smtp_tls_security_level = encrypt` (mandatory TLS) it is `smtp_tls_mandatory_protocols` that governs the handshake — `smtp_tls_protocols` only applies to opportunistic TLS. As written, the protocol restriction had no effect. Changed to `smtp_tls_mandatory_protocols` and adjusted the comment.

2. **Outdated webhook receiver — used legacy form-encoded payload.** The Flask example called `request.form.to_dict()` and read top-level keys `event`, `recipient`, `description`. Modern Mailgun HTTP Webhooks (v3+) POST a JSON body shaped `{"signature": {...}, "event-data": {...}}`, where event-level fields live under `event-data`. The handler would silently see empty data against current Mailgun. Rewrote it to parse JSON via `request.get_json()`, read fields from `event-data`, and switched the bounce branch to event name `failed` (the actual v3 event name; "bounced" is not emitted as such — permanent bounces arrive as `failed` with a permanent severity).

3. **Webhook event-type list updated** to match Mailgun's current dashboard categories (delivered, permanent failure, temporary failure, opens, clicks, complained, unsubscribed) instead of mixing UI labels and event names.

## Review Notes

- Mailgun's Free plan still includes 100 messages/day as of May 2026, so the rate-limit claim is current. Plan-tier names and limits above Free have changed several times historically — readers should consult Mailgun's pricing page for current figures.
- The webhook receiver, even after the fix, does not verify Mailgun's HMAC-SHA256 signature (`signature.timestamp + signature.token` signed with the HTTP webhook signing key). For production, signature verification is strongly recommended to prevent forged callbacks; this was left out to keep the snippet small but is worth a follow-up note.
- The Mailgun HTTP API base URL in the Python and `curl` examples assumes the US region (`api.mailgun.net`). EU-region accounts must use `api.eu.mailgun.net` for both the messages and address-validate endpoints, mirroring the SMTP region note already present in the post.
- The Postfix `smtp_tls_mandatory_protocols` default in current Postfix releases already excludes SSLv2/SSLv3 and TLSv1/TLSv1.1, so the explicit list is essentially a belt-and-braces statement on modern systems. Left in for clarity.
- `mydestination = localhost` is intentionally minimal because `inet_interfaces = loopback-only` is set; this is correct for a send-only relay host.
- `smtp_tls_protocols` with the `!` exclusion syntax is still valid; the modern `>=TLSv1.2` form is an equivalent alternative.
