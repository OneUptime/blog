# Validation Summary: How to Switch RHEL 9 to the FUTURE Crypto Policy for Stronger Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- System-wide crypto policies
- FUTURE crypto policy
- OpenSSH
- OpenSSL
- TLS
- Linux systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, Chapter 4: Using system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Customer Portal, System-wide cryptographic policies in RHEL: https://access.redhat.com/articles/3666211
- Red Hat Enterprise Linux 9.1 Release Notes, OpenSSH `RequiredRSASize` support and crypto-policy enforcement: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.1_release_notes/new-features
- OpenSSH `ssh(1)` manual for `-Q` and `-G`: https://man.openbsd.org/ssh.1
- OpenSSL `openssl-ciphers(1)` manual: https://docs.openssl.org/3.0/man1/openssl-ciphers/
- OpenSSL `openssl-s_client(1)` manual: https://docs.openssl.org/3.4/man1/openssl-s_client/

## Issues Found
- The post stated that FUTURE means "No SHA-1 anywhere" and that SHA-1 is "completely disabled." Updated this to match Red Hat documentation: FUTURE disables SHA-1 for digital signatures, certificates, DNSSEC, and HMAC.
- The post stated that FUTURE disables all CBC mode ciphers. Updated this because Red Hat documents CBC as disabled except in Kerberos for FUTURE.
- The post stated that FUTURE disables SSH RSA keys and allows only ECDSA/Ed25519. Updated this because RHEL 9 FUTURE accepts RSA keys when they are at least 3072 bits and use SHA-2 signatures.
- The DEFAULT policy comparison said CBC mode was generally allowed. Updated it to clarify that CBC is disabled for SSH in DEFAULT.
- The command `diff <(update-crypto-policies --show --no-reload) <(echo "FUTURE")` did not accurately show policy differences. Replaced it with inspection of `/usr/share/crypto-policies/policies/FUTURE.pol`.
- The SSH verification section used `ssh -Q`, which lists algorithms supported by the OpenSSH binary rather than the effective client/server configuration after crypto-policy processing. Replaced it with `ssh -G localhost` and `sshd -T` checks.
- The SSH compatibility section implied all RSA-only servers needed `ssh-rsa` overrides. Updated it to target the older `ssh-rsa` SHA-1 signature algorithm and added a caveat for RSA keys smaller than 3072 bits.

## Review Notes
Red Hat recommends rebooting after changing the system-wide crypto policy so all running services reload the generated backend configuration. The post still includes selective service restarts as a practical option, but now notes the reboot recommendation.
