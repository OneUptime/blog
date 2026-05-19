# Validation Summary: How to Build and Install a Custom Kernel on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel build system
- Kconfig
- Debian package builds
- GRUB
- APT/dpkg

## Sources Consulted
- Linux Kernel Archives: https://www.kernel.org/
- Linux kernel Kconfig documentation: https://docs.kernel.org/kbuild/kconfig.html
- Linux kernel Kbuild documentation: https://docs.kernel.org/kbuild/kbuild.html
- Linux kernel admin guide README: https://docs.kernel.org/admin-guide/README.html
- Ubuntu grub-reboot manpage: https://manpages.ubuntu.com/manpages/noble/man8/grub-reboot.8.html
- Ubuntu grub-set-default manpage: https://manpages.ubuntu.com/manpages/noble/man8/grub-set-default.8.html
- Ubuntu update-grub manpage: https://manpages.ubuntu.com/manpages/noble/man8/update-grub.8.html
- Local Ubuntu package metadata and command help for apt, dpkg, dpkg-buildpackage, installkernel, and kernel scripts/config.

## Issues Found
- The upstream kernel example used `6.8.1` as the "latest stable" kernel and hard-coded the `v6.x` download path. Updated the example to `7.0.9`, the stable release listed by kernel.org on 2026-05-19, and made the major-version path derive from `KERNEL_VERSION`.
- The vanilla kernel source example extracted under `/usr/src` with `sudo`, which leaves a root-owned source tree and can break the later non-root build. Added a `chown` step after extraction.
- The prerequisite package list omitted tools used later in the tutorial or by Debian package building. Added `fakeroot`, `git`, `wget`, and `patch`.
- The `apt source` example used `sudo` and did not mention source repositories. Updated it to run as the user and noted that source repositories (`deb-src`) must be enabled.
- The debug-info configuration example used `scripts/config --set-str CONFIG_DEBUG_INFO_NONE y` for a boolean Kconfig symbol. Changed it to `scripts/config --enable CONFIG_DEBUG_INFO_NONE`.
- The Ubuntu trusted-key example disabled string Kconfig options. Changed it to set `SYSTEM_TRUSTED_KEYS` and `SYSTEM_REVOCATION_KEYS` to empty strings, matching their Kconfig type and the intended build behavior.
- The `.deb` install command omitted the `linux-libc-dev` package that `make deb-pkg` commonly produces. Updated the command to install it with the generated image and headers.
- The direct install section implied `make install` itself installs the initrd. Clarified that Ubuntu's kernel post-install hooks normally create the initrd and update GRUB.
- The GRUB default section used `grub-set-default` without noting that it requires `GRUB_DEFAULT=saved`. Updated the `/etc/default/grub` example accordingly.
- Hard-coded follow-up paths, GRUB entries, expected `uname -r` output, patch directory, and removal commands still referenced the old `6.8.1` example. Updated them to `7.0.9`.

## Review Notes
- The direct-install workflow depends on Ubuntu's installed `installkernel` and `/etc/kernel/postinst.d` hooks. This is normal on Ubuntu, but package-based installation remains the cleaner path.
- Kernel versions change frequently; future reviews should refresh the kernel.org example version or convert the example to a placeholder if the blog should avoid time-sensitive version numbers.
