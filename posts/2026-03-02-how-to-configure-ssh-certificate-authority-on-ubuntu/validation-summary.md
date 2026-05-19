# Validation Summary: How to Configure SSH Certificate Authority on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenSSH
- SSH certificates
- SSH certificate authorities
- SSH daemon configuration
- SSH known_hosts trust configuration

## Sources Consulted
- Ubuntu manpage for `ssh-keygen(1)`: https://manpages.ubuntu.com/manpages/noble/man1/ssh-keygen.1.html
- Ubuntu manpage for `sshd_config(5)`: https://manpages.ubuntu.com/manpages/noble/man5/sshd_config.5.html
- Ubuntu manpage for `sshd(8)`: https://manpages.ubuntu.com/manpages/noble/man8/sshd.8.html
- OpenBSD `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- OpenBSD `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenBSD `sshd(8)` manual: https://man.openbsd.org/sshd
- Local Ubuntu/OpenSSH man pages for `ssh-keygen`, `ssh`, `sshd`, and `sshd_config`

## Issues Found
- The post described revocation as "just stop issuing new certificates." That only prevents future certificates and does not revoke already-issued certificates before expiry. Updated the wording to state that short-lived certificates reduce stale access and active revocation uses `RevokedKeys` or a Key Revocation List.
- The password-disabling snippet only set `PasswordAuthentication no`. On Ubuntu/OpenSSH with PAM, keyboard-interactive authentication can serve an equivalent password-based role. Added `KbdInteractiveAuthentication no` to match the intended "disable password authentication" guidance.
- The post told the CA operator to send the certificate back to the developer "along with their original key," which could be misread as sending private key material. Changed it to send only the certificate file back; the developer keeps their private key.
- The post used `systemctl reload sshd` in Ubuntu examples. Current Ubuntu systems provide `ssh.service` and may expose `sshd.service` as an alias, but `ssh` is the canonical Ubuntu service unit. Updated reload commands to `sudo systemctl reload ssh`.
- The principals explanation implied certificate principals only map directly to usernames. Clarified that this is the default behavior and that `AuthorizedPrincipalsFile` can also authorize role-style principal names.

## Review Notes
The main `ssh-keygen` certificate signing commands, certificate options (`force-command`, `source-address`, forwarding restrictions), `TrustedUserCAKeys`, `AuthorizedPrincipalsFile`, `HostCertificate`, and `@cert-authority` known_hosts examples are consistent with OpenSSH documentation.
