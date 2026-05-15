# Validation Summary: How to Install and Configure Stratis Storage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- stratisd
- stratis-cli
- XFS
- systemd and /etc/fstab
- Linux block devices

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems, Chapter 25: Setting up Stratis file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Managing storage devices, Setting up Stratis file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_storage_devices/setting-up-stratis-file-systems
- stratis-cli man page: https://www.mankier.com/8/stratis
- Stratis upstream how-to: https://stratis-storage.github.io/howto/

## Issues Found
- The post used `sudo stratis pool describe mypool`, but current `stratis-cli` documents detailed pool information through `stratis pool list --name mypool`, not a `describe` subcommand. Changed the command accordingly.
- The persistent mount example used a filesystem UUID with `x-systemd.requires=stratisd.service`. Current RHEL 9 documentation shows non-root Stratis filesystems in `/etc/fstab` using `/dev/stratis/<pool>/<filesystem>` with `x-systemd.requires=stratis-fstab-setup@pool-uuid.service` and `x-systemd.after=stratis-fstab-setup@pool-uuid.service`. Updated the text and example to match.

## Review Notes
- The core installation, service management, pool creation, filesystem creation, mounting, thin provisioning, XFS, snapshots, encryption, and cache descriptions align with Red Hat and Stratis documentation.
- Current Red Hat documentation often demonstrates filesystem creation with `--size`, while the `stratis-cli` man page still documents `--size` as optional and accepts the daemon default when omitted.
