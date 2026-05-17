# Validation Summary: How to Configure Postfix with SendGrid on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postfix (mail transfer agent)
- SendGrid (SMTP relay / transactional email API)
- Ubuntu (apt package management, systemd)
- SASL authentication (libsasl2-modules)
- TLS / STARTTLS / SMTPS (port 587 vs. 465)
- SPF, DKIM, DMARC (email authentication)
- mailutils (`mail` command)

## Sources Consulted
- Twilio SendGrid SMTP integration docs — https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api (verified hostname `smtp.sendgrid.net`, ports 587/465, `apikey` username)
- Postfix TLS_README — https://www.postfix.org/TLS_README.html (verified `smtp_tls_protocols` legacy exclusion syntax `!SSLv2, !SSLv3, !TLSv1, !TLSv1.1` is still valid alongside the newer `>=TLSv1.2` form)
- Postfix postconf(5) manual — https://www.postfix.org/postconf.5.html (verified `relayhost`, `smtp_sasl_*`, `smtp_tls_*`, `sender_canonical_maps`, `smtp_tls_wrappermode`)
- SendGrid Stats API — https://www.twilio.com/docs/sendgrid/api-reference/stats/retrieve-global-email-statistics (verified `GET /v3/stats` with `start_date` and `aggregated_by` parameters)
- SendGrid Bounces API — https://www.twilio.com/docs/sendgrid/api-reference/bounces-api/retrieve-all-bounces and `.../delete-bounces` (verified path is `/v3/suppression/bounces` singular, and `DELETE` accepts `{"emails": [...]}` body)

## Issues Found
- **SendGrid suppression API path was incorrect.** The post used `https://api.sendgrid.com/v3/suppressions/bounces` (plural "suppressions") in the curl example for removing a bounced address. The official SendGrid API path is singular: `/v3/suppression/bounces`. Fixed by changing the URL in the "Handling Bounces and Suppressions" section. Note that the UI section in SendGrid is labeled "Suppressions" (plural), which is unchanged in the post text — only the API path was wrong.

## Review Notes
- The `smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1` exclusion syntax is the legacy form. On Postfix ≥ 3.6, the preferred modern syntax is `smtp_tls_protocols = >=TLSv1.2`, which is equivalent. The post's syntax still works on current Postfix versions, so no change was required.
- `smtp_tls_ciphers = high` is valid and documented (accepts `export | low | medium | high | null`).
- The example SendGrid API key `SG.abcdefghijklmnop.qrstuvwxyz1234567890` is shorter than real keys (which are typically `SG.<22 chars>.<43 chars>`), but it's clearly a placeholder and not load-bearing.
- The SendGrid UI menu paths (Settings > API Keys, Settings > Sender Authentication, Activity) match the current Twilio SendGrid console as of review date.
- The `mailq | grep -c "^[0-9A-F]"` pattern is a reasonable heuristic since Postfix queue IDs are uppercase hex; long-form `postqueue -p` parsing would be more robust but the post's approach is fine for quick monitoring.
