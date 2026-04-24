# Validation Summary: How to Set Up Postfix SMTP TLS Encryption for IPv4 Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP and STARTTLS
- TLS certificates
- Certbot and Let's Encrypt
- OpenSSL
- Swaks
- IPv4 mail transport configuration

## Sources Consulted
- Postfix TLS Support: https://www.postfix.org/TLS_README.html
- Postfix Configuration Parameters (`postconf(5)`): https://www.postfix.org/postconf.5.html
- Postfix Configuration Utility (`postconf(1)`): https://www.postfix.org/postconf.1.html
- Postfix `master(5)`: https://www.postfix.org/master.5.html
- Postfix `posttls-finger(1)`: https://www.postfix.org/posttls-finger.1.html
- Postfix Basic Configuration: https://www.postfix.org/BASIC_CONFIGURATION_README.html
- Certbot instructions: https://certbot.eff.org/instructions?os=pip&ws=webproduct
- EFF mailserver Certbot guide: https://www.eff.org/deeplinks/2019/01/encrypting-web-encrypting-net-primer-using-certbot-secure-your-mailserver?language=en
- OpenSSL `s_client`: https://docs.openssl.org/master/man1/openssl-s_client/

## Issues Found
- The introduction implied that enforced TLS is only for specific destinations. I corrected that wording because Postfix can enforce TLS globally or via per-destination policy.
- The inbound TLS session cache was presented as normal performance guidance. I changed it to an optional commented example because Postfix 2.11 and later generally prefer TLS session tickets instead of a server-side cache database.
- The outbound `smtp_tls_security_level = encrypt` comment said mail would bounce if the remote server did not support TLS. I corrected this to deferred delivery, which matches Postfix behavior before queue expiry.
- The IPv4 note described `inet_protocols = ipv4` as affecting outbound mail only. I corrected it because `inet_protocols` controls the protocols Postfix uses when making and accepting network connections.
- The last verification command was mislabeled and did not show the submission service overrides. I replaced it with `postconf -Mf submission/inet` and updated the description to match what the command actually inspects.

## Review Notes
- No remaining technical issues found after the corrections above.
- The TLS protocol exclusion syntax shown in the post remains valid, but Postfix 3.6 and later prefer minimum-version syntax such as `>=TLSv1.2`.
- If readers change `inet_protocols`, Postfix documentation requires a full stop/start rather than only `postfix reload`.
- Pinning `smtp_bind_address` can cause delivery failures on multi-homed hosts if the chosen source address cannot reach all remote MX hosts.
