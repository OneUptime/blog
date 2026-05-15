# Validation Summary: How to Enroll Custom Secure Boot Keys on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- UEFI Secure Boot
- Machine Owner Key (MOK) enrollment
- mokutil and MokManager
- OpenSSL X.509 certificate generation
- Linux kernel module signing with sign-file
- UEFI Secure Boot db/dbx key databases
- Kickstart post-install scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Signing a kernel and modules for Secure Boot": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_assembly_managing-kernel-command-line-parameters-with-uki
- Local `mokutil(1)` manual page and `mokutil --help`
- Local `openssl req -help` and `openssl x509 -help`
- Local `modinfo --help`

## Issues Found
- The OpenSSL key-generation example used `-nodes`, which current OpenSSL help marks as deprecated. Changed it to `-noenc`, the current equivalent for generating an unencrypted private key.
- The Kickstart `%post` example copied the certificate into `/root/secureboot-keys` without creating that directory. Added `mkdir -p /root/secureboot-keys` before the copy command.
- The certificate-expiration note implied that an expired signing certificate directly causes disruption. RHEL 9 documentation states that `sign-file` does not warn about validity dates and that modules should be signed within the certificate validity period. Updated the wording to reflect that behavior.

## Review Notes
The main MOK enrollment flow, `mokutil --import`, `mokutil --list-new`, `mokutil --list-enrolled`, `mokutil --delete`, `mokutil --reset`, `mokutil --import-hash`, `--root-pw`, module signing with `/usr/src/kernels/$(uname -r)/scripts/sign-file`, and signature verification with `modinfo` are consistent with Red Hat documentation and local command documentation. Future improvements could mention installing required packages such as `mokutil`, `kernel-devel`, `openssl`, `pesign`, and `keyutils`, but the existing commands are technically valid.
