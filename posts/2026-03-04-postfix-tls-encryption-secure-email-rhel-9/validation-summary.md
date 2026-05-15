# Validation Summary: How to Configure Postfix TLS Encryption for Secure Email on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix SMTP server
- SMTP STARTTLS and implicit TLS
- Let's Encrypt / Certbot
- OpenSSL client testing
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Postfix TLS_README: https://www.postfix.org/TLS_README.html
- Postfix postconf(5) configuration parameter reference: https://www.postfix.org/postconf.5.html
- Certbot official installation instructions: https://certbot.eff.org/instructions
- Snapcraft Certbot on Red Hat Enterprise Linux instructions: https://snapcraft.io/install/certbot/rhel
- RFC 8314, Cleartext Considered Obsolete: Use of TLS for Email Submission and Access: https://www.rfc-editor.org/rfc/rfc8314

## Issues Found
- The post used Postfix 3.6+ protocol-bound syntax such as `>=TLSv1.2`, but RHEL 9 Postfix is in the 3.5.x series. I changed the protocol examples to the legacy exclusion syntax (`!SSLv2, !SSLv3, !TLSv1, !TLSv1.1`) that works on RHEL 9.
- The inbound and outbound examples set only `*_tls_mandatory_*` cipher/protocol controls while using opportunistic `may` security levels. Those mandatory settings apply to mandatory TLS modes, not opportunistic TLS. I added the corresponding `smtpd_tls_ciphers`, `smtpd_tls_protocols`, `smtp_tls_ciphers`, and `smtp_tls_protocols` settings so the examples affect the advertised `may` configuration as described.
- The outbound CA bundle comment implied that `smtp_tls_security_level = may` verifies remote certificates by default. Postfix opportunistic TLS does not require trusted certificates or matching names. I changed the comment to clarify that the CA bundle is used when stricter per-destination verification policies require it.
- The SMTPS section described port 465 only as something for older clients. RFC 8314 standardizes implicit TLS submission on port 465, so I updated the wording.
- The private-key permission troubleshooting command suggested `chmod 640`, which grants group read access. Postfix documentation recommends private-key access for root only and no access for others, so I changed the example to `chown root:root` and `chmod 600`.

## Review Notes
- RHEL 9 enables basic Postfix TLS by default with self-signed inbound certificates and opportunistic outbound TLS, but replacing the default certificate with a trusted CA certificate is still a valid improvement.
- Certbot's official recommended installation path is currently the snap package; `dnf install certbot` may depend on repository availability such as EPEL. The post's command can work in environments where that package is available, but a future update could mention the official snap-based path.
