# Validation Summary: How to Use the LEGACY Crypto Policy on RHEL for Backward Compatibility

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 8, 9, and 10
- System-wide cryptographic policies
- `update-crypto-policies`
- TLS 1.0, TLS 1.1, TLS 1.2, and TLS 1.3
- OpenSSL
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux 8 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 8 Securing networks, "Planning and implementing TLS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Enterprise Linux 9 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Securing networks, "Planning and implementing TLS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Enterprise Linux 10 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 10 Considerations in adopting RHEL 10, "Security": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/considerations_in_adopting_rhel_10/security
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL `ciphers` documentation: https://docs.openssl.org/1.1.1/man1/ciphers/

## Issues Found
- The post said to restart selected services after changing the system-wide crypto policy. Red Hat documents that crypto policies apply when applications start and recommends rebooting for policy changes to fully take effect. I changed the section to recommend `sudo reboot` first, while retaining service restarts as a narrower fallback when a full reboot is not possible.
- The return-to-DEFAULT example also restarted only selected services. I added `sudo reboot` there and kept the service restart fallback.

## Review Notes
The version-specific LEGACY behavior is accurate: RHEL 8 LEGACY permits TLS 1.0 and 1.1, DSA, 3DES, RC4, and smaller RSA/DH keys; RHEL 9 LEGACY keeps TLS at 1.2 or newer and uses 2048-bit minimum RSA/DH keys; RHEL 10 further disallows SHA-1 signatures in TLS contexts. The `DEFAULT:SHA1` subpolicy example is valid for RHEL 9, but Red Hat documents that the `SHA1` subpolicy is removed in RHEL 10.
