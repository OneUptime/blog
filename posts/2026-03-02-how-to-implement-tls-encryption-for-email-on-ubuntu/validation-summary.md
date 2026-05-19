# Validation Summary: How to Implement TLS Encryption for Email on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Postfix
- SMTP STARTTLS
- SMTP submissions / implicit TLS
- TLS certificates
- Let's Encrypt / Certbot
- OpenSSL
- DANE and DNSSEC

## Sources Consulted
- Postfix TLS_README: https://www.postfix.org/TLS_README.html
- Postfix postconf(5): https://www.postfix.org/postconf.5.html
- Postfix master(5): https://www.postfix.org/master.5.html
- Certbot documentation: https://eff-certbot.readthedocs.io/
- OpenSSL `req -help` and `verify -help` output from the local OpenSSL installation
- RFC 3207, SMTP STARTTLS: https://www.rfc-editor.org/rfc/rfc3207
- RFC 7672, SMTP DANE TLS: https://www.rfc-editor.org/rfc/rfc7672
- RFC 8314, implicit TLS for email submission and access: https://www.rfc-editor.org/rfc/rfc8314

## Issues Found
- The self-signed certificate example used the deprecated OpenSSL `req -nodes` option and did not include a subjectAltName. Changed it to `-noenc` and added `subjectAltName = DNS:mail.example.com`.
- The guide recommended configuring Postfix TLS session cache databases as a current performance setting. Postfix 2.11 and later normally use TLS session tickets, so the cache database examples were made optional comments.
- The protocol examples used legacy negation syntax for disabling old TLS versions. Updated them to the current `>=TLSv1.2` Postfix syntax.
- The port 465 `master.cf` example used the older `smtps` service name. Updated the example to `submissions`, while keeping the grep check aware of both names.
- The cipher section changed Postfix's global `tls_high_cipherlist`, which Postfix documentation strongly discourages. Replaced that with `smtpd_tls_exclude_ciphers` and `smtpd_tls_mandatory_exclude_ciphers`.
- The TLS policy table described `secure` as including DANE. Corrected the policy comments so `secure` means verified TLS against the nexthop name, and `dane` is the DANE/TLSA policy.
- The DANE section did not mention the need for a validating DNSSEC resolver. Updated the note to include both a validating resolver and signed remote zones with TLSA records.
- The troubleshooting section advised making the Let's Encrypt private key readable by the `postfix` user/group. Postfix documentation says private keys should remain root-only, so the permissions commands now keep the resolved private key owned by `root:root` with mode `600`.
- The certificate verification command checked `fullchain.pem` directly. Updated it to verify `cert.pem` with `chain.pem` as the untrusted intermediate chain and `-purpose sslserver`.

## Review Notes
The remaining examples are broadly correct for modern Postfix on current Ubuntu releases. The submission examples assume Dovecot SASL is already configured and exposes `private/auth`; that is a valid common setup, but it is outside the scope of this TLS-focused guide.
