# Validation Summary: How to Handle SHA-1 Deprecation When Upgrading to RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL system-wide cryptographic policies
- SHA-1 signature deprecation
- OpenSSL
- OpenSSH
- RPM package signatures
- IPsec/VPN cryptography

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Re-enabling SHA-1": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Upgrading from RHEL 8 to RHEL 9, "Reviewing security policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/troubleshooting_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, OpenSSH and cryptographic policy notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/
- OpenSSH release notes for RSA/SHA-1 `ssh-rsa` deprecation behavior: https://www.openssh.org/releasenotes.html
- Local CLI help output for `ssh-keygen`, `openssl req`, and `openssl x509`.

## Issues Found
- The post described "SSH keys using SHA-1 signatures" and showed `ssh-keygen -l` against local host public keys. That command prints key fingerprints; it does not determine whether an SSH connection requires the SHA-1 `ssh-rsa` signature algorithm. Updated the wording to refer to SSH connections that negotiate `ssh-rsa` and replaced the check with the OpenSSH-documented `ssh -oHostKeyAlgorithms=-ssh-rsa user@server.example.com` compatibility test.
- The `update-crypto-policies --set DEFAULT:SHA1` and `update-crypto-policies --set DEFAULT` examples did not mention that system-wide crypto policy changes are applied on application startup and Red Hat recommends rebooting for the change to fully take effect. Added `sudo reboot` to both examples.
- The SSH host key regeneration example used direct `ssh-keygen -t ... -f ...` commands for files that commonly already exist, which can prompt for overwrite and is not required for RSA/SHA-1 signature deprecation. Replaced those commands with `sudo ssh-keygen -A` to generate any missing default host keys after removing deprecated DSA keys.

## Review Notes
The core RHEL 9 claim is correct: the DEFAULT crypto policy restricts SHA-1 signatures, and Red Hat documents `DEFAULT:SHA1` as a temporary compatibility subpolicy. The SHA-1 certificate scan is a reasonable basic check, but future improvements could add `-type f` and explicit parentheses to the `find` command for clarity.
