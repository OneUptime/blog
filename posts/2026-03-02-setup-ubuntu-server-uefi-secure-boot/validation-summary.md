# Validation Summary: How to Set Up Ubuntu Server with UEFI Secure Boot Enabled

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS
- UEFI Secure Boot
- shim (Canonical's signed first-stage bootloader)
- GRUB / grub-install / update-grub
- Machine Owner Key (MOK) / mokutil
- openssl (key/certificate generation)
- Linux kernel module signing (sign-file)
- DKMS (Dynamic Kernel Module Support)
- NVIDIA drivers via ubuntu-drivers
- VirtualBox Guest Additions
- keyctl / kernel platform keyring
- efivar

## Sources Consulted
- Ubuntu Wiki: UEFI/SecureBoot — https://wiki.ubuntu.com/UEFI/SecureBoot
- Ubuntu Wiki: UEFI/SecureBoot/Signing — https://wiki.ubuntu.com/UEFI/SecureBoot/Signing
- Ubuntu Wiki: UEFI/SecureBoot/DKMS — https://wiki.ubuntu.com/UEFI/SecureBoot/DKMS
- mokutil(1) manpage — https://manpages.ubuntu.com/manpages/noble/man1/mokutil.1.html
- DKMS upstream documentation — https://github.com/dell/dkms
- /etc/dkms/framework.conf reference (Ubuntu noble dkms package)
- Linux kernel source: scripts/sign-file.c — https://www.kernel.org/doc/html/latest/admin-guide/module-signing.html
- openssl req(1) manpage
- keyctl(1) manpage and Linux kernel keyrings documentation
- Canonical blog posts on Secure Boot history (Ubuntu 12.10 introduction)

## Issues Found

1. **Secure Boot release history** — The post said Ubuntu supported Secure Boot "since Ubuntu 12.04". Ubuntu 12.10 (Quantal Quetzal) was the first Ubuntu release shipped with Secure Boot support; the 12.04.2 point release backported it later. Changed to "since Ubuntu 12.10" to align with the canonical reference.

2. **Incorrect claim about installer enrolling Canonical's key into MokList** — The installer summary said it would "Register Canonical's key with the UEFI MokList if needed". This is wrong: Canonical's vendor certificate is built into `shim` at compile time, not enrolled into the MOK store. MokList is reserved for additional keys the machine owner enrolls. Rewrote the bullet to accurately state that shim uses its embedded Canonical certificate to verify GRUB and the kernel, and that no MOK enrollment is required for the base system.

3. **DKMS sign_helper.sh snippet was non-functional** — The post wrote a `/etc/dkms/sign_helper.sh` script but never wired it into DKMS (no `sign_tool=` entry in `/etc/dkms/framework.conf`), so it would have done nothing. On Ubuntu 20.04+ DKMS already auto-signs built modules using `/var/lib/shim-signed/mok/MOK.priv` and `MOK.der` when those files exist. Replaced the snippet with the correct mechanism: a note that DKMS auto-signs by default, plus the proper `mok_signing_key` / `mok_certificate` overrides in `framework.conf`.

4. **Mislabeled mokutil comment** — The "Checking Which Keys Are Trusted" snippet labeled `mokutil --list-enrolled` as listing keys in the "UEFI Secure Boot database". `mokutil` only enumerates the MOK store maintained by shim, not the UEFI db variable. Corrected both comments — the mokutil line now says "List MOK keys enrolled via shim" and the keyctl line clarifies that the kernel platform keyring is populated from UEFI db/MOK at boot.

## Review Notes

- The `openssl req` invocation produces `MOK.priv` in PEM format (default) and `MOK.der` in DER format (because `-outform DER` only affects `-out`). Both work with `sign-file`, so this is correct as written; the variable naming may slightly mislead readers who expect `.priv` to also be DER-encoded, but functionally it is fine.
- `mokutil --sb-state` output is exactly `SecureBoot enabled` / `SecureBoot disabled` / `SecureBoot disabled in shim`, matching the post.
- The chroot recipe correctly performs an explicit bind-mount of `/sys/firmware/efi/efivars` because the prior `/sys` bind-mount is non-recursive and would otherwise leave efivars unavailable in the chroot. This is good practice.
- The VirtualBox guest-additions example assumes the modules were built by the VBox installer (uncompressed `.ko` in `/lib/modules/$(uname -r)/misc/`). On Ubuntu 24.04 the in-tree kernel modules are now zstd-compressed (`.ko.zst`), but VirtualBox-built modules are not, so the path remains valid for the vbox case. Worth noting for future updates if guest additions are ever distributed via the kernel tree.
- The post references the SHA-256 hashing algorithm for `sign-file`, which matches the default kernel module signing configuration used by Ubuntu's stock kernels.
- `efivar --list` requires the `efivar` package, which is not always installed by default on minimal Ubuntu Server images; readers may need `sudo apt install efivar`.
