# Validation Summary: How to Set Up Postfix Submission Service (Port 587) on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP submission
- TLS / STARTTLS
- SASL authentication
- Dovecot SASL
- UFW
- firewalld
- OpenSSL `s_client`
- Swaks
- `ss`

## Sources Consulted
- Postfix `master(5)` manual: https://www.postfix.org/master.5.html
- Postfix `postconf(5)` configuration reference: https://www.postfix.org/postconf.5.html
- Postfix SASL HOWTO: https://www.postfix.org/SASL_README.html
- Postfix TLS HOWTO: https://www.postfix.org/TLS_README.html
- Postfix SMTP access control docs: https://www.postfix.org/SMTPD_ACCESS_README.html
- RFC 6409, Message Submission for Mail: https://www.rfc-editor.org/rfc/rfc6409.html
- RFC 8314, Use of TLS for Email Submission and Access: https://www.rfc-editor.org/rfc/rfc8314.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld port-opening how-to: https://firewalld.org/documentation/howto/open-a-port-or-service
- Swaks documentation: https://jetmore.org/john/code/swaks/ and https://jetmore.org/john/code/swaks/files/swaks-20240103.0/doc/ref.txt
- Local CLI help used to verify command syntax: `openssl s_client -help`, `ss --help`, `ufw --help`

## Issues Found
- The port table described port 465 as legacy `SMTPS`. I updated it to `submissions` over implicit TLS, because RFC 8314 standardizes port 465 for message submission over implicit TLS.
- The intro and port descriptions stated submission authentication too absolutely. I corrected the wording to match RFC 6409, which requires authentication by default on submission services but also allows other authorization methods such as protected subnetworks.
- The `master.cf` snippet used inline `#` comments on `-o` parameter lines. In Postfix, comments are only comments when `#` is the first non-whitespace character on a line, so those inline comments were invalid config. I moved them onto separate lines.
- The `master.cf` snippet used `submission inet ... y ...`, which makes the service chrooted. For a generic guide that points TLS files at `/etc/letsencrypt/...`, that can break unless the chroot is prepared for those files. I changed it to `n` so the example works without undocumented chroot setup.
- The submission-service example used `smtpd_recipient_restrictions=permit_sasl_authenticated,reject` for relay policy. I changed this to `smtpd_relay_restrictions=permit_sasl_authenticated,reject`, which is the current Postfix-recommended place for relay control on Postfix 2.10+ and better matches the guide's intent.
- The guide did not mention that `smtpd_sasl_path = private/auth` depends on Dovecot exposing `/var/spool/postfix/private/auth`. I added a one-sentence clarification so the SASL configuration can work as written.
- The final testing guidance implied `openssl s_client` verifies authentication. I corrected that to distinguish TLS handshake verification with `openssl` from TLS-plus-authentication testing with `swaks`.
- The IPv4 listening check used `ss -tlnp | grep :587`, which did not specifically limit output to IPv4. I updated it to `ss -4 -tlnp | grep :587`.

## Review Notes
- The TLS protocol exclusion syntax in the post remains valid, but newer Postfix releases also support preferred minimum/maximum version syntax such as `>=TLSv1.2`.
- The firewalld example assumes the default zone. On hosts that use non-default zones, an explicit `--zone` may be needed.
