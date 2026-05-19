# Validation Summary: How to Restrict User SSH Access to Specific Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH (sshd) on Ubuntu
- `~/.ssh/authorized_keys` key options (`command=`, `from=`, `no-pty`, `no-agent-forwarding`, `no-port-forwarding`, `no-x11-forwarding`)
- `$SSH_ORIGINAL_COMMAND` environment variable
- `sshd_config` directives (`AllowUsers`, `Match`, `ForceCommand`, `ChrootDirectory`, `PermitTTY`, `AllowTcpForwarding`, `X11Forwarding`, `PermitTunnel`)
- `internal-sftp` SFTP subsystem with chroot
- `rrsync` (restricted rsync wrapper)
- `git-shell` for Git-only SSH access
- systemd / journalctl for logging

## Sources Consulted
- [OpenSSH sshd man page (authorized_keys options)](https://man.openbsd.org/sshd)
- [OpenSSH sshd_config man page](https://man.openbsd.org/sshd_config)
- [Ubuntu Manpage: rrsync](https://manpages.ubuntu.com/manpages/noble/man1/rrsync.1.html)
- [Ubuntu rsync package file list (jammy)](https://packages.ubuntu.com/jammy/amd64/rsync/filelist) — confirmed `rrsync` ships at `/usr/bin/rrsync` on 22.04+
- [Repology: scponly package versions](https://repology.org/project/scponly/versions) — confirmed scponly removed from Debian/Ubuntu repos
- [git-shell documentation](https://git-scm.com/docs/git-shell)

## Issues Found

1. **Outdated `rrsync` installation instructions.** The post instructed readers to copy `rrsync` from `/usr/share/doc/rsync/scripts/rrsync` to `/usr/local/bin`. On Ubuntu 22.04 and later, the `rsync` package ships `rrsync` directly at `/usr/bin/rrsync`, so the manual copy step is unnecessary. Updated the instructions to reflect the modern packaging.

2. **`scponly` package no longer available.** The post recommended `sudo apt install scponly` and setting it as a user shell. The `scponly` package has been removed from Debian and Ubuntu repositories (no longer maintained). Replaced this snippet with a note directing readers to use `internal-sftp` with `ForceCommand` and `ChrootDirectory` (already covered in Method 4), which is the modern recommended approach.

## Review Notes

- All `authorized_keys` options used in the post (`command=`, `from=`, `no-pty`, `no-agent-forwarding`, `no-port-forwarding`, `no-x11-forwarding`) are valid per the current OpenSSH `sshd` man page.
- The `Match User`/`Match Group` syntax with `ForceCommand internal-sftp`, `ChrootDirectory %u`, `AllowTcpForwarding no`, `X11Forwarding no`, `PermitTTY no`, and `PermitTunnel no` is correct.
- The requirement that `ChrootDirectory` be owned by root and not group/world writable is correctly documented.
- The `AllowUsers alice bob@192.168.1.0/24` syntax (user@host pattern) is supported by sshd_config.
- `sudo sshd -t` for config validation and `sudo systemctl reload sshd` to apply changes both work on Ubuntu (the `sshd` service unit is aliased to `ssh.service`).
- The `git-shell` error message "fatal: Interactive git shell is not enabled." is the actual message produced when no `git-shell-commands` directory exists or the user attempts a non-git command.
- Minor stylistic inconsistency in the `Match Group gitusers` block (the prose mentions a "'git' group" while the directive uses `gitusers`). This is a writing nit, not a technical error, and was not changed per the instruction to avoid stylistic edits.
- `/var/log/auth.log` still exists by default on Ubuntu 22.04 and 24.04; `journalctl -u ssh` is also correct since the systemd unit on Ubuntu is `ssh.service`.
