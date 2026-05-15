# Validation Summary: How to Verify FIPS Mode Is Active on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode
- System-wide cryptographic policies
- OpenSSL 3 providers and TLS commands
- OpenSSH client and server configuration
- Linux kernel crypto interfaces
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9.5 Release Notes, "Deprecated functionalities": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- OpenSSL documentation, openssl-list command: https://docs.openssl.org/3.6/man1/openssl-list/
- OpenSSL documentation, OSSL_PROVIDER-FIPS: https://docs.openssl.org/3.0/man7/OSSL_PROVIDER-FIPS/

## Issues Found
- The TLS cipher listing used `openssl ciphers -v 'ALL'`, while the surrounding text said it should only show FIPS-approved ciphers. Because `ALL` is an explicit cipher-list expression, it is not the right diagnostic for the effective default policy-filtered list. Changed it to `openssl ciphers -v` and adjusted the comment to say it lists the default enabled TLS ciphers after system crypto policy is applied.
- The non-FIPS TLS test used `-cipher RC4-SHA` without constraining the protocol version. Since `-cipher` applies to TLS 1.2 and below, changed the command to include `-tls1_2`.
- The verification script checked only for the string `fips` in `openssl list -providers` while reporting "FIPS provider active." Changed it to verify that the `fips` provider block includes `status: active`.

## Review Notes
Red Hat documents `fips-mode-setup --check` as valid for checking FIPS mode in RHEL 9, even though the tool for switching systems to FIPS mode is deprecated in RHEL 9 and planned for removal in the next major release. Red Hat also notes that `fips-mode-setup` cannot be used to check FIPS mode inside containers.
