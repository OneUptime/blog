# Validation Summary: How to Set Up Postfix with Amazon SES on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu (apt package management, systemd)
- Postfix (main.cf, SASL auth, TLS, sender_canonical, header_checks)
- Amazon SES (SMTP relay, Verified Identities, sandbox vs. production, Configuration Sets)
- AWS CLI (`aws ses send-email`, `aws ses get-send-quota`, `aws ses get-send-statistics`, `aws cloudwatch get-metric-statistics`)
- IAM (SMTP credentials, EC2 instance roles)
- Amazon SNS / CloudWatch (bounce and complaint monitoring)
- OpenSSL (TLS connection testing)

## Sources Consulted
- AWS SES Developer Guide — SMTP integration: https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html
- AWS SES SMTP endpoints / ports: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- AWS SES sending quotas: https://docs.aws.amazon.com/ses/latest/dg/quotas.html
- AWS SES pricing: https://aws.amazon.com/ses/pricing/
- AWS CLI `aws ses send-email` reference: https://docs.aws.amazon.com/cli/latest/reference/ses/send-email.html
- AWS CLI `aws sesv2 send-email` reference: https://docs.aws.amazon.com/cli/latest/reference/sesv2/send-email.html
- AWS SES Reputation Dashboard guidance (bounce/complaint thresholds)
- Postfix `main.cf` reference (postfix.org) — TLS and SASL parameters
- Public reporting on the SES EC2 free tier discontinuation (effective August 2023)

## Issues Found

1. **Outdated SES pricing claim (Cost Calculation section)** — The post claimed "First 62,000 messages per month: free (when sending from EC2)" and computed a $3.80 cost for 100,000 messages based on that free tier. AWS retired the EC2-hosted "always free" 62,000 messages/month tier effective August 1, 2023, so this is incorrect for early 2026. Updated to state $0.10 per 1,000 outbound messages with no EC2 always-free tier, mention the new 12-month free tier for new accounts, and corrected the example calculation to $10 for 100,000 messages.

2. **Overstated SES sending limits (SES Sending Limits and Quotas section)** — The post stated "Default sending limits for new accounts in production: typically 50,000 messages per day, 14 per second" as a current default. AWS no longer documents a universal default; quotas now vary by region and use case (and new production accounts often start lower with gradual increases). Softened the language to make clear these are historical/approximate values rather than guaranteed defaults.

## Review Notes

- The `aws ses send-email --from ... --to ... --subject ... --text ...` syntax is correct. These are valid CLI convenience flags in `aws ses send-email` (SES v1 CLI), even though the underlying API parameters are `Source`, `Destination`, and `Message`. Note that `aws sesv2 send-email` does NOT have these shortcuts and requires `--from-email-address`, `--destination`, and `--content` structures — worth knowing if a future revision moves to v2.
- `sudo apt install -y awscli` installs AWS CLI v1, which is on track for end-of-life. AWS recommends installing CLI v2 from the official bundle. Functionally the v1 commands shown still work, so this is not a correctness error, but a future revision could mention v2.
- Postfix configuration (`smtp_tls_security_level = encrypt`, SASL settings, sasl_passwd format with bracketed host and `:587`, `postmap`, `sender_canonical_maps`, `smtp_header_checks` with regexp table) all match official Postfix documentation.
- Bounce/complaint thresholds (<5% / <0.1%) match the practical guidance AWS publishes around the SES Reputation Dashboard; AWS escalates with warnings around these levels and pauses sending at higher rates (~10% bounce / ~0.5% complaint).
- SMTP endpoint and port 587 with STARTTLS are correct. SES also supports ports 25, 2587 (STARTTLS) and 465, 2465 (TLS wrapper) if 587 is blocked by an upstream provider.
- The `X-SES-CONFIGURATION-SET` header name used in the `header_checks` example is the correct SES-recognized header for associating outbound mail with a Configuration Set.
- The `smtp_tls_protocols` exclusion list (`!SSLv2, !SSLv3, !TLSv1, !TLSv1.1`) is valid Postfix syntax and leaves TLSv1.2+ enabled, which aligns with SES TLS requirements.
