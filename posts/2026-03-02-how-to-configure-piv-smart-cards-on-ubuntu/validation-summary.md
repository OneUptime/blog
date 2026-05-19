# Validation Summary: How to Configure PIV Smart Cards on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management and systemd
- PC/SC and pcscd
- OpenSC and PKCS#11
- YubiKey Manager CLI PIV commands
- PIV smart-card slots and certificates
- pam_pkcs11 and Linux PAM configuration
- OpenSSH PKCS#11 authentication

## Sources Consulted
- YubiKey Manager CLI PIV commands: https://docs.yubico.com/software/yubikey/tools/ykman/PIV_Commands.html
- Yubico PIV certificate slots: https://developers.yubico.com/PIV/Introduction/Certificate_slots.html
- OpenSC pam_pkcs11 user manual: https://opensc.github.io/pam_pkcs11/doc/pam_pkcs11.html
- Debian pam_pkcs11 example configuration source: https://sources.debian.org/src/pam-pkcs11/0.6.8-4/etc/pam_pkcs11.conf.example.in
- Debian pkcs11-tool man page: https://manpages.debian.org/testing/opensc/pkcs11-tool.1.en.html
- Debian pkcs11_inspect man page: https://manpages.debian.org/unstable/libpam-pkcs11/pkcs11_inspect.1.en.html
- Ubuntu pkcs11_eventmgr man page: https://manpages.ubuntu.com/manpages/noble/en/man1/pkcs11_eventmgr.1.html
- OpenSSH manual pages: https://www.openssh.org/manual.html
- Local Ubuntu package metadata for `opensc-pkcs11`, `libpam-pkcs11`, `pcscd`, `pcsc-tools`, and `yubikey-manager`

## Issues Found
- Corrected the introductory claim that smart-card readers speak PIV. Readers expose cards through interfaces such as CCID/PCSC; the YubiKey or physical card is the PIV-capable device.
- Replaced invalid `ykman piv certificates list` usage with `ykman piv certificates export 9a - | openssl x509 -noout -subject -issuer`, because current ykman PIV certificate commands do not include a `list` subcommand.
- Fixed the pam_pkcs11 mapper configuration. The post created `/etc/pam_pkcs11/subject_mapping` but configured `use_mappers = cn`; the corrected snippet uses the `subject` mapper and its `mapfile`.
- Corrected the subject mapping format comment from colon syntax to `Certificate Subject -> login`, matching pam_pkcs11 documentation.
- Replaced invalid `pkcs11_inspect -c ...` with `pkcs11_inspect config_file=...`, matching the documented command syntax.
- Adjusted PAM snippets so `pam_pkcs11.so` is added before the existing password stack instead of adding duplicate `pam_unix` fallback lines. The previous sudo example used `use_first_pass`, which would not prompt for a password after smart-card failure.
- Replaced nonexistent `pam_pkcs11_eventmgr` with `pkcs11_eventmgr debug nodaemon`, the command shipped by Ubuntu's `libpam-pkcs11` package.

## Review Notes
The post is now technically consistent with current Ubuntu package contents and official CLI/man-page documentation. A production deployment should still validate CA trust, certificate revocation policy, mapper choice, and PAM stack ordering for the specific Ubuntu release and identity environment.
