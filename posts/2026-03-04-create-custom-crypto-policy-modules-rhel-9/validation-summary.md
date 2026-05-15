# Validation Summary: How to Create Custom Crypto Policy Modules on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- Custom crypto policy modules (`.pmod`)
- Custom crypto policy files (`.pol`)
- `update-crypto-policies`
- OpenSSL and OpenSSH crypto policy back ends
- TLS, DTLS, SSH, hashes, MACs, ciphers, signatures, and key exchange policy directives

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, Chapter 4, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Upstream `crypto-policies(7)` manual source from Red Hat crypto-policies project: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/crypto-policies.7.txt
- Upstream `update-crypto-policies(8)` manual source from Red Hat crypto-policies project: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/update-crypto-policies.8.txt
- Upstream RHEL 9 crypto-policies algorithm list: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/raw/rhel9/python/cryptopolicies/alg_lists.py
- Upstream RHEL 9 `DEFAULT.pol` and `NO-SHA1.pmod` examples: https://gitlab.com/redhat-crypto/fedora-crypto-policies/-/tree/rhel9/policies

## Issues Found
- The diagram said the combined policy is applied to "all crypto libraries". Red Hat documents specific supported back ends and notable exceptions, so this was changed to "supported crypto back ends".
- The signature examples removed only selected SHA-1 signature names. Red Hat's documented `NO-SHA1.pmod` pattern uses wildcard removal for SHA-1 signatures, so the examples now use `sign = -*-SHA1`.
- The SHA-1 examples omitted `sha1_in_certs = 0`, which is relevant for GnuTLS certificate-signature handling. This was added where SHA-1 is disabled.
- The SSH example used `key@SSH`, which is not a valid crypto-policies directive. It was replaced with `sign@SSH = -RSA-*` and the comment was adjusted to describe disabling RSA-based SSH signature algorithms.
- The custom standalone policy used `protocol = TLS1.2+ DTLS1.2+`. In crypto-policies syntax, the `+` suffix appends values; it does not mean "and newer". This was changed to an explicit protocol list: `TLS1.3 TLS1.2 DTLS1.2`.
- The validation section showed `update-crypto-policies --set DEFAULT:ENTERPRISE --show` as a dry run. `--set` and `--show` are separate commands, and the tool does not document that combination as a dry-run mode. The example now uses `update-crypto-policies --show`.
- The revert example restarted only `sshd`. Red Hat recommends rebooting or restarting affected applications after policy changes, so the example now uses `sudo reboot`.
- The TLS 1.3 example comment implied all DTLS handling could be disabled uniformly. The comment was narrowed to "TLS" because the crypto-policies documentation notes back-end-specific protocol-version limitations.

## Review Notes
The post is technically relevant and useful. Future improvements could mention that changes generally take effect after affected applications restart, and that not every application or language runtime follows system-wide crypto policies.
