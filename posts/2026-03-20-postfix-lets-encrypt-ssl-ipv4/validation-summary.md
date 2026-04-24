# Validation Summary: How to Set Up Postfix with Let's Encrypt SSL on an IPv4 Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- Let's Encrypt
- Certbot
- TLS / STARTTLS
- OpenSSL
- SMTP
- IPv4

## Sources Consulted
- Postfix TLS README: https://www.postfix.org/TLS_README.html
- Postfix `postconf(5)` manual: https://www.postfix.org/postconf.5.html
- Postfix DEPRECATION_README: https://www.postfix.org/DEPRECATION_README.html
- Certbot user guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot manual: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- OpenSSL `s_client` manual: https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- The original `smtpd_tls_protocols` and `smtp_tls_protocols` values used Postfix's legacy exclusion syntax incorrectly. In Postfix, excluding `!TLSv1.1` also excludes higher protocol versions, so the example did not enforce TLS 1.2+ as intended. I replaced both lines with the current bounded syntax `>=TLSv1.2, <=TLSv1.3`.
- The configuration mixed `smtpd_use_tls = yes` with `smtpd_tls_security_level = may`. Postfix documents `smtpd_use_tls` as obsolete when `smtpd_tls_security_level` is set, so I removed the obsolete parameter.
- The post used `smtpd_tls_CAfile = .../chain.pem` as if it were part of presenting the server certificate. Postfix uses `smtpd_tls_CAfile` for trusted client CAs, not to publish the server certificate chain, so I removed it.
- The post said `smtp_tls_cert_file` and `smtp_tls_key_file` configure TLS for outgoing mail in general. In Postfix, outbound opportunistic TLS is enabled by `smtp_tls_security_level`; the client certificate settings are only needed when presenting a client certificate to a remote server. I removed those lines and corrected the explanation in the takeaways.
- The permissions section suggested adding the `postfix` user to a group and making copied key material group-readable. Postfix documents that the private key should remain readable only by root. I replaced that advice with a deploy hook that copies the certificate and key into a fixed Postfix path using root-owned files, and I added the initial copy step so the configured paths exist immediately.
- The test section reloaded Postfix after setting `inet_protocols = ipv4`. Postfix documents that changing `inet_protocols` requires a full stop/start, so I changed the command to `systemctl restart postfix`.
- The renewal section implied the deploy hook would run during `certbot renew --dry-run`. Certbot documents that deploy hooks do not run on dry-run unless `--run-deploy-hooks` is specified, so I clarified that behavior.
- The final note about requiring TLS on port 587 was phrased as a global setting. I adjusted it to refer to the submission service so it does not imply that `smtpd_tls_security_level = encrypt` should be set globally on port 25.

## Review Notes
- The corrected protocol syntax `>=TLSv1.2, <=TLSv1.3` is the preferred form on Postfix 3.6 and later. Older Postfix releases use legacy protocol-list syntax.
- Postfix 3.4 and later prefer `smtpd_tls_chain_files` for server key/certificate chains, but `smtpd_tls_cert_file` and `smtpd_tls_key_file` remain valid and documented, so the article is still acceptable with the corrected settings.
