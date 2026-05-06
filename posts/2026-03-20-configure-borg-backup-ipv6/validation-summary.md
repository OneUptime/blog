# Validation Summary: How to Configure Borg Backup over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- BorgBackup
- OpenSSH
- IPv6
- Linux shell scripting
- cron

## Sources Consulted
- Borg 1.4.4 command synopsis and repository URL formats: https://borgbackup.readthedocs.io/en/stable/man_intro.html
- Borg 1.4.4 `borg init` reference: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- Borg 1.4.4 `borg create` reference: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- Borg 1.4.4 `borg prune` reference: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- Borg 1.4.4 pattern and placeholder help: https://borgbackup.readthedocs.io/en/stable/usage/help.html
- Borg 1.4.4 quick start and automation examples: https://borgbackup.readthedocs.io/en/stable/quickstart.html
- OpenSSH `ssh_config(5)` reference for `AddressFamily`, `HostName`, and `IdentityFile`: https://man.openbsd.org/OpenBSD-7.4/ssh_config
- OpenSSH `sftp(1)` reference for bracketed IPv6 host syntax in host:path-style destinations: https://man.openbsd.org/OpenBSD-7.5/sftp.1
- Debian package listing for `borgbackup`: https://packages.debian.org/borgbackup
- Fedora/EPEL package listing for `borgbackup`: https://packages.fedoraproject.org/pkgs/borgbackup/borgbackup/index.html

## Issues Found
- The sample IPv6 literal `2001:db8::backup` was invalid because `backup` is not a hexadecimal IPv6 hextet. I replaced it with the valid documentation prefix example `2001:db8::1`.
- Multiple Borg repository examples used SCP-style repository syntax such as `user@host:/path`, which the current Borg 1.4 documentation marks as deprecated. I updated those examples to the current `ssh://user@host/path` form throughout the post.
- One direct IPv6 example used malformed quoting around a bracketed address. I replaced it with valid `ssh://...@[2001:db8::1]...` examples.
- The RHEL/CentOS installation note implied the package is directly available without qualification. I clarified that the `borgbackup` package example assumes EPEL is enabled on RHEL-compatible systems.
- The automation script used `borg prune --prefix`, which current Borg documentation marks as deprecated. I replaced it with `--glob-archives`.

## Review Notes
- The corrected examples match the current stable Borg 1.4.4 documentation as of 2026-05-06.
- Borg 2.0 uses different SSH URL semantics for absolute repository paths than Borg 1.4.x, so readers using 2.0 prereleases should verify repository URL examples against the 2.0 docs.
- The script prunes archives correctly, but Borg documentation notes that reclaimed repository disk space is only made available after running `borg compact`.
