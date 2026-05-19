# Validation Summary: How to Configure PAM for Hardware Token Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux-PAM
- OpenSSH server PAM authentication
- pam_u2f and pamu2fcfg
- libpam-google-authenticator
- pam_pkcs11 and OpenSC
- pamtester

## Sources Consulted
- Ubuntu manpage for pam.d / PAM configuration syntax: https://manpages.ubuntu.com/manpages/stonking/man5/pam.d.5.html
- Ubuntu manpage for pam_u2f options and examples: https://manpages.ubuntu.com/manpages/resolute/en/man8/pam_u2f.8.html
- Ubuntu manpage for pamu2fcfg options: https://manpages.ubuntu.com/manpages/jammy/man1/pamu2fcfg.1.html
- Ubuntu manpage for pam_google_authenticator options: https://manpages.ubuntu.com/manpages/jammy/man8/pam_google_authenticator.8.html
- Ubuntu manpage for pam_pkcs11: https://manpages.ubuntu.com/manpages/noble/en/man8/pam_pkcs11.8.html
- OpenSC pam_pkcs11 user manual / mapper documentation: https://opensc.github.io/pam_pkcs11/doc/pam_pkcs11.html
- Ubuntu manpage for sshd_config: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu manpage for pamtester: https://manpages.ubuntu.com/manpages/noble/man1/pamtester.1.html
- Local Ubuntu 24.04 package metadata and package contents for libpam-u2f, pamu2fcfg, libpam-google-authenticator, libpam-pkcs11, opensc, and pamtester.

## Issues Found
- Replaced `ChallengeResponseAuthentication yes` with `KbdInteractiveAuthentication yes` for SSH. OpenSSH documents `ChallengeResponseAuthentication` as a deprecated alias, while `KbdInteractiveAuthentication` is the current keyword.
- Changed the Ubuntu service restart command from `sudo systemctl restart sshd` to `sudo systemctl restart ssh`, which is the canonical Ubuntu OpenSSH server unit name.
- Clarified that SSH public key plus TOTP requires commenting out `@include common-auth` in `/etc/pam.d/sshd`; otherwise the default PAM stack commonly prompts for the account password as well as the TOTP code.
- Fixed the `pam_pkcs11.conf` example by adding the required `pam_pkcs11 { ... }` block and using the `subject` mapper with `mapfile = file:///etc/pam_pkcs11/subject_mapping;`. The original example used `use_mappers = cn` while instructing readers to create a subject mapping file, so the mapping would not be used as described.
- Replaced the non-standard `sudo pam_list sudo` command with a portable command that prints the relevant PAM configuration files, and added installation of `pamtester` before using it.
- Updated SSH log inspection from `journalctl -u sshd` to `journalctl -u ssh` for Ubuntu.
- Replaced the outdated `nullok_secure` option in the simplified `common-auth` examples with `nullok`, and clarified that exact default modules and jump counts vary by Ubuntu release and enabled PAM profiles.

## Review Notes
The post is technically relevant and contains practical implementation details. The examples are still intentionally simplified; production PKCS#11 deployments usually need certificate authority and revocation policy configuration, and system-wide `common-auth` changes should be managed carefully because Ubuntu commonly uses `pam-auth-update`.
