# Validation Summary: How to Configure Secure Boot Verification on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- UEFI Secure Boot
- shim and MokManager
- Machine Owner Keys (MOK)
- DKMS kernel module signing
- Linux kernel module signature enforcement
- GRUB
- LUKS full disk encryption

## Sources Consulted
- Ubuntu Security Documentation: UEFI Secure Boot - https://documentation.ubuntu.com/security/security-features/platform-protections/secure-boot/
- Ubuntu Wiki: UEFI SecureBoot - https://wiki.ubuntu.com/UEFI/SecureBoot
- Ubuntu Wiki: UEFI SecureBoot Signing - https://wiki.ubuntu.com/UEFI/SecureBoot/Signing
- Ubuntu Manpage: dkms(8), Ubuntu 24.04 - https://manpages.ubuntu.com/manpages/noble/man8/dkms.8.html
- Ubuntu Manpage: mokutil(1), Ubuntu 22.04 - https://manpages.ubuntu.com/manpages/jammy/man1/mokutil.1.html
- Linux Kernel Documentation: Kernel module signing facility - https://kernel.org/doc/html/next/admin-guide/module-signing.html
- Local command help/output checked for `mokutil`, `sbverify`, `modinfo`, `sign-file`, and `extract-module-sig.pl`.

## Issues Found
- The Secure Boot chain description implied all MOK keys can validate GRUB. Updated it to say shim can use Canonical's embedded key or a suitable enrolled MOK for custom boot components, matching Ubuntu's documentation and the module-only MOK limitation in recent shim versions.
- The post said any broken trust-chain link prevents booting, including modules. Clarified that pre-kernel failures stop boot, while unsigned or untrusted modules fail to load after boot.
- The EFI variable check used the older `/sys/firmware/efi/vars/.../data` path. Updated it to the modern `efivars` path.
- The MOK test command used a `.pem` file. `mokutil --test-key` expects DER input, so the example now uses `.der`.
- The module signing example passed the PEM certificate to `sign-file`. Updated it to use the DER certificate, consistent with the generated enrollment certificate and Ubuntu module-signing examples.
- The `extract-module-sig.pl` example used an invalid `-i` option. Replaced it with `-d`, which extracts signature descriptor values according to the script usage.
- The DKMS signing configuration used `sign_tool` and a non-standard helper path. Current DKMS framework configuration uses `sign_file`, `mok_signing_key`, and `mok_certificate`, so the snippet now points `sign_file` at the kernel headers' `scripts/sign-file`.
- The DKMS certificate path used the PEM certificate. Updated it to the DER certificate, matching DKMS and MOK enrollment expectations.
- The `sbverify` examples referenced `/usr/share/shim-signed/shim.pem`, which is not the Canonical UEFI certificate path used on current Ubuntu systems. Updated the examples to `/usr/share/grub/canonical-uefi-ca.crt`.
- The module enforcement comments used `0` and `1` as the sysfs output. Current Ubuntu exposes `N` and `Y`, so the comments and temporary enable command were updated.
- The `mokutil --disable-validation` explanation implied firmware Secure Boot could be disabled from the OS. Clarified that it disables validation at the shim level; full firmware Secure Boot disable still happens in UEFI setup.
- The LUKS section claimed Secure Boot ensures the passphrase is requested only by a trusted, unmodified bootloader. Ubuntu documentation states standard GRUB does not validate initrd images, so the note now says Secure Boot verifies the bootloader and kernel and that `/boot` and the ESP also need protection.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Future improvements could discuss Ubuntu's module-signing-only MOK OID behavior in more depth and distinguish firmware Secure Boot, shim validation, kernel lockdown, and `module.sig_enforce` more explicitly.
