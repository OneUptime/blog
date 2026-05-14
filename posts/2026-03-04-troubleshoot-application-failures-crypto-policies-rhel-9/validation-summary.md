# Validation Summary: How to Troubleshoot Application Failures Caused by Crypto Policies on RHEL 9

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- OpenSSL and TLS
- OpenSSH
- curl
- Python ssl
- Java/OpenJDK crypto policy integration
- PostgreSQL STARTTLS
- LDAPS

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Customer Portal: System-wide cryptographic policies in RHEL: https://access.redhat.com/articles/3666211
- OpenSSL 3.0 `s_client` and `ciphers` command help from the local OpenSSL installation.
- OpenSSL `openssl-ciphers` documentation: https://docs.openssl.org/3.0/man1/openssl-ciphers/
- OpenSSH `ssh_config(5)` and `ssh -Q` help from the local OpenSSH installation.
- curl command-line documentation: https://curl.se/docs/manpage.html
- Python 3.11 `ssl` module documentation: https://docs.python.org/3.11/library/ssl.html
- RFC 8996, Deprecating TLS 1.0 and TLS 1.1: https://www.rfc-editor.org/rfc/rfc8996.html

## Issues Found
- The quick LEGACY-policy test implied that LEGACY could diagnose all legacy TLS and key-size failures. RHEL 9 documentation states that LEGACY still allows only TLS 1.2/1.3 and still requires at least 2048-bit RSA/DH keys, so I narrowed the claim to LEGACY-covered failures such as SHA-1 and SSH CBC compatibility.
- The policy-change examples only restarted the affected service. Red Hat documents that policy changes apply on application startup and recommends rebooting for changes to fully take effect, so I added the reboot/complete restart caveat.
- The OpenSSL cipher-list diagnostic used `openssl ciphers -v`, which can list ciphers without filtering by current security level and protocol bounds. I changed it to `openssl ciphers -s -v`.
- The curl example used `DEFAULT@SECLEVEL=0`; OpenSSL cipher-list syntax uses `DEFAULT:@SECLEVEL=0`. I corrected the cipher string and added `--tlsv1.0` with `--tls-max 1.0` so the command's protocol intent is explicit.
- The Python example enabled `ssl.TLSVersion.TLSv1`, which is deprecated in current Python documentation. Because the section is explicitly about temporary legacy compatibility, I left the functional example but added a warning comment.
- The custom crypto policy module used an unscoped `protocol = TLS1.0+` example. I changed it to `protocol@TLS = TLS1.0+` to target TLS back ends directly and clarified that the example also lowers the RSA minimum to 1024 bits.
- The summary repeated the overbroad LEGACY test guidance. I updated it to say LEGACY is useful only for failures it covers.

## Review Notes
The post is technically relevant and useful after correction. Future improvements could mention that system-wide custom modules affect more than one application unless scoped tightly, and that per-application overrides are usually preferable when only one legacy endpoint is involved.
