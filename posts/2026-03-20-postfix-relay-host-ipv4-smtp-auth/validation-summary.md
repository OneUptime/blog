# Validation Summary: How to Set Up Postfix Relay Host Over IPv4 with SMTP Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP relay / smarthost configuration
- SMTP AUTH / SASL
- STARTTLS / SMTP client TLS
- IPv4 mail routing
- SendGrid SMTP relay
- Amazon SES SMTP interface

## Sources Consulted
- Postfix SASL Howto: https://www.postfix.com/SASL_README.html
- Postfix TLS Support: https://www.postfix.com/TLS_README.html
- Postfix Configuration Parameters (`postconf(5)`): https://www.postfix.com/postconf.5.html
- Postfix Basic Configuration: https://www.postfix.com/BASIC_CONFIGURATION_README.html
- Postfix transport(5) manual: https://www.postfix.org/transport.5.html
- Postfix sendmail(1) manual: https://www.postfix.org/sendmail.1.html
- Postfix Debugging Howto: https://www.postfix.org/DEBUG_README.html
- Twilio SendGrid SMTP integration docs: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api
- Amazon SES SMTP credentials: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- Amazon SES endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/ses.html
- RFC 7208 (SPF): https://www.rfc-editor.org/rfc/rfc7208

## Issues Found
1. The introduction implied SaaS relays are typically targeted by IPv4 address. I changed it to allow either a bracketed IPv4 literal or a hostname that resolves over IPv4, because provider documentation such as SendGrid recommends using the hostname rather than hardcoding provider IPs.
2. The SASL configuration used `smtp_sasl_security_options = noanonymous`. I changed this to `smtp_sasl_tls_security_options = noanonymous` to match the Postfix SMTP client guidance for permitting common AUTH mechanisms over TLS without broadening non-TLS behavior.
3. The section titled "Relay with Specific Source IP for SPF" was technically incorrect. `smtp_bind_address` controls the local source IP of the Postfix SMTP client; it does not need to match a relay's SPF record. I corrected the heading and explanation to describe source-IP allowlisting instead.
4. The test mail example used `mail -s`, which is not a Postfix-provided interface and may not be installed. I replaced it with `/usr/sbin/sendmail -v`, which is documented by Postfix, and I replaced the unreliable `AUTH: Login success` log example with a standard successful `status=sent` relay log pattern.
5. The CA bundle path and mail log path were presented as universal. I kept them but marked them as Debian/Ubuntu examples because those paths vary across distributions.
6. The conclusion said the setup required four elements, but the post's own working example also depended on the SASL-over-TLS mechanism setting. I corrected the conclusion to include that fifth core setting.

## Review Notes
- The `relayhost` bracket syntax is correct and does suppress MX lookups, both in `main.cf` and in `transport_maps` nexthops.
- The `sasl_passwd` keys correctly include `:587`, which Postfix requires when the `relayhost` or transport nexthop also specifies a non-default port.
- `inet_protocols = ipv4` is valid, but it affects Postfix network protocol use more broadly than just one relay destination.
