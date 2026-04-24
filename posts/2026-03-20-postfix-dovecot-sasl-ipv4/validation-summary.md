# Validation Summary: How to Configure Postfix with Dovecot SASL Authentication Over IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Postfix
- Dovecot
- SASL / SMTP AUTH
- SMTP submission on port 587
- TLS / STARTTLS
- IPv4
- swaks

## Sources Consulted
- Dovecot CE: Postfix and Dovecot SASL — https://doc.dovecot.org/2.4.1/howto/sasl/postfix.html
- Postfix SASL Howto (`SASL_README`) — https://www.postfix.org/SASL_README.html
- Postfix configuration reference (`postconf(5)`) — https://www.postfix.org/postconf.5.html
- Postfix `master.cf` reference (`master(5)`) — https://www.postfix.org/master.5.html
- Swaks official documentation — https://www.jetmore.org/john/code/swaks/
- Debian `swaks(1)` man page — https://manpages.debian.org/testing/swaks/swaks.1

## Issues Found
- The `main.cf` snippet claimed TLS was required for SMTP AUTH while it only set `smtpd_tls_security_level = may`. I added `smtpd_tls_auth_only = yes` and updated the comment so AUTH is not advertised or accepted on unencrypted sessions when TLS is optional.
- The post moved directly from configuration to testing without restarting Postfix. I added a `sudo systemctl restart postfix` step so the changed `main.cf` and `master.cf` settings are applied; this is especially important because `inet_protocols` and `inet_interfaces` changes require restarting Postfix.
- The troubleshooting section suggested `chown` on `/var/spool/postfix/private/auth`. I replaced that with fixing the Dovecot `unix_listener` ownership and mode in `10-master.conf` and restarting Dovecot, because Dovecot creates that socket and manual ownership changes are not the persistent fix.
- The expected log output for authentication testing was too specific to a particular log format. I changed it to a generic instruction to look for SASL authentication success or failure entries.

## Review Notes
- No additional technical issues were found after these corrections.
- The certificate settings `smtpd_tls_cert_file` and `smtpd_tls_key_file` are still valid, though newer Postfix releases prefer `smtpd_tls_chain_files` for certificate-chain configuration.
- The tutorial is implicitly Debian/Ubuntu-oriented because it uses `apt`, `systemctl`, and `/var/log/mail.log`.
- The `submission` service keeps a chrooted `y` setting, which is common on Debian/Ubuntu package defaults; other distributions may ship `submission` with chroot disabled.
