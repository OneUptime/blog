# Validation Summary: How to Configure the System-Wide Crypto Policy for TLS on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide cryptographic policies
- TLS
- OpenSSL
- GnuTLS
- NSS
- OpenSSH
- Apache HTTP Server
- FIPS mode

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Securing networks: Planning and implementing TLS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Enterprise Linux 9 Security hardening: Switching RHEL to FIPS mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- update-crypto-policies(8) manual page: https://www.mankier.com/8/update-crypto-policies
- crypto-policies(7) manual page: https://www.mankier.com/7/crypto-policies

## Issues Found
- The introduction said everything on the system follows the selected policy. Updated it to say supported applications follow it by default unless explicitly overridden, matching Red Hat's documented scope.
- The built-in policy table used older LEGACY values: TLS 1.0 and 1024-bit RSA. Updated the RHEL 9 values to TLS 1.2 minimum and 2048-bit RSA.
- The FIPS table entry implied that setting the FIPS crypto policy alone provides FIPS compliance. Updated it to say the policy helps meet FIPS 140 requirements when the system is running in FIPS mode.
- The `update-crypto-policies --show --show-modules` command used a non-existent `--show-modules` option. Replaced it with `cat /etc/crypto-policies/state/CURRENT.pol` for viewing the expanded current policy.
- The policy switching section said changes take effect immediately for new connections. Clarified that generated policy files update immediately, but running services must restart to load the changed backend configuration.
- The LEGACY section described TLS 1.0-only interoperability. Updated it because RHEL 9's predefined LEGACY policy still allows only TLS 1.2 and newer.
- The CBC subpolicy listed only a few CBC cipher names. Replaced it with the documented wildcard omission syntax, `cipher = -*-CBC`, so the example actually disables CBC-mode ciphers broadly.
- The TLS 1.3-only subpolicy used the historical `min_tls_version` option. Replaced it with `protocol@TLS`, the recommended custom policy syntax.
- The OpenSSH override example used `/etc/ssh/sshd_config` directly. Updated it to use a RHEL 9 drop-in file with a prefix lower than `50`, matching Red Hat's documented crypto policy include ordering.
- The audit command checked only `/etc/ssh/sshd_config`. Expanded it to include `/etc/ssh/sshd_config.d/`, where RHEL 9 OpenSSH overrides are commonly placed.

## Review Notes
The examples are RHEL 9-specific. Some crypto policy details can change during the RHEL lifecycle as Red Hat updates the policy package, so readers should still inspect `/etc/crypto-policies/state/CURRENT.pol` on the exact target system.
