# Validation Summary: How to Disable Weak TLS Versions and Ciphers with Crypto Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux system-wide crypto policies
- TLS protocol versions and cipher suites
- OpenSSL command-line tools
- OpenSSH cipher policy
- Nmap ssl-enum-ciphers NSE script

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Customer Portal, System-wide cryptographic policies in RHEL: https://access.redhat.com/articles/3666211
- crypto-policies(7) upstream RHEL 9 man page source: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/crypto-policies.7.txt
- update-crypto-policies(8) upstream RHEL 9 man page source: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/update-crypto-policies.8.txt
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL ciphers documentation: https://docs.openssl.org/3.0/man1/openssl-ciphers/
- Nmap ssl-enum-ciphers NSE documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html

## Issues Found
- The custom `.pmod` example assigned `cipher` twice. The crypto-policies format treats a follow-up reassignment of the same multiple-choice option as a reset, so the later `cipher = -RC4` directive could discard the previous CBC removals. I changed the module to use a single scoped `cipher@TLS` directive for the TLS cipher removals and added `cipher@SSH = -*-CBC` for SSH CBC ciphers, matching Red Hat's documented scoped policy syntax.
- The DEFAULT policy comment said it disables weak ciphers. RHEL DEFAULT allows TLS AES-CBC ciphers, so that was too broad in a post that identifies CBC-mode ciphers as weak. I changed the comment to say DEFAULT disables many legacy ciphers.
- The verification section only mentioned restarting services. Red Hat recommends rebooting for policy changes to fully take effect, while restarting affected services is sufficient for those specific daemons. I updated the comment to mention rebooting for full system-wide coverage.

## Review Notes
The commands and flags for `update-crypto-policies --show`, `update-crypto-policies --set`, `openssl ciphers -v`, `openssl s_client -tls1/-tls1_1/-tls1_2`, `sshd -T`, and `nmap --script ssl-enum-ciphers -p 443` are valid. RHEL crypto policies apply to supported back ends and default application behavior; applications that explicitly override crypto settings may need service-specific review.
