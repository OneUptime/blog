# Validation Summary: How to Clean Up Old Kernels to Free Disk Space on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu Linux
- Linux kernel packages
- APT and dpkg
- Byobu `purge-old-kernels`
- unattended-upgrades
- initramfs-tools
- GRUB
- Shell scripting

## Sources Consulted
- Ubuntu `apt` manpage: https://manpages.ubuntu.com/manpages/noble/man8/apt.8.html
- Ubuntu `apt-get` manpage: https://manpages.ubuntu.com/manpages/noble/man8/apt-get.8.html
- Ubuntu `update-initramfs` manpage: https://manpages.ubuntu.com/manpages/resolute/man8/update-initramfs.8.html
- Ubuntu `grub-install` manpage: https://manpages.ubuntu.com/manpages/noble/man8/grub-install.8.html
- Ubuntu `grub-script-check` manpage: https://manpages.ubuntu.com/manpages/noble/man1/grub-script-check.1.html
- Ubuntu community documentation for removing old kernels: https://help.ubuntu.com/community/RemoveOldKernels
- Local Ubuntu package metadata and installed configuration for `byobu`, `apt`, `unattended-upgrades`, `initramfs-tools`, and `grub2-common`

## Issues Found
- The post claimed `purge-old-kernels --keep 1` and `purge-old-kernels --keep 2` were valid current commands. Current Ubuntu's `byobu` package ships `purge-old-kernels` as a deprecated wrapper around `apt-get autoremove`, so it does not implement `--keep`. Removed the invalid examples and updated the explanation.
- The manual purge example omitted the common Ubuntu header package name, such as `linux-headers-5.15.0-91`, which normally exists alongside the flavor-specific package, such as `linux-headers-5.15.0-91-generic`. Added the missing package and clarified that users should remove matching package types that exist.
- The automation script had the same header package gap. Added `base_version` extraction and included `linux-headers-${base_version}` in the purge list.
- The GRUB verification example used `grub-install --dry-run`, but Ubuntu's `grub-install` does not provide a `--dry-run` option. Replaced it with `grub-script-check /boot/grub/grub.cfg` and a grep for the running kernel in the generated GRUB configuration.

## Review Notes
The `apt autoremove --purge`, unattended-upgrades options, `update-initramfs -u -k all`, and general guidance to avoid removing the running kernel are technically correct. The custom cleanup script remains a simplified example; in production, relying on APT's autoremove policy is preferable when it works.
