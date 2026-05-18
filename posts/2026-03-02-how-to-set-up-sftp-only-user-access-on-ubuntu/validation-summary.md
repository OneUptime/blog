# Validation Summary: How to Set Up SFTP-Only User Access on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenSSH (sshd, sftp, internal-sftp subsystem)
- Ubuntu user/group management (`useradd`, `usermod`, `groupadd`, `passwd`)
- Linux filesystem permissions (chmod, chown, sticky bit, bind mounts, `/etc/fstab`)
- systemd service management (`systemctl reload/restart`)
- `journalctl` for log inspection
- UFW firewall

## Sources Consulted
- OpenSSH `sshd_config(5)` man page — verified directives `Match`, `ForceCommand`, `ChrootDirectory`, `AuthorizedKeysFile`, `PermitTunnel`, `AllowAgentForwarding`, `AllowTcpForwarding`, `X11Forwarding`, `PasswordAuthentication` are all permitted inside `Match` blocks (https://man.openbsd.org/sshd_config)
- OpenSSH `sshd(8)` man page — verified chroot directory ownership/permission requirements ("All components of the pathname must be root-owned directories that are not writable by any other user or group")
- OpenSSH `sftp-server(8)` man page — verified `-l log_level` flag accepted by `internal-sftp` and `sftp-server`
- Ubuntu `nologin(8)` man page — verified default message is "This account is currently not available."
- Ubuntu openssh-server packaging — `sshd.service` is aliased to `ssh.service`, so `systemctl reload sshd` works
- `mount(8)` and `fstab(5)` — verified bind mount syntax in `/etc/fstab`
- Linux `chmod(1)` — verified sticky bit semantics (mode `1xxx` prevents deletion of files owned by others in a world-writable dir)

## Issues Found

1. **Incorrect expected SSH error message after `ForceCommand internal-sftp` is configured.** The post claimed `ssh sftpuser1@localhost` would output `"This service allows sftp connections only."` and attributed it to `ForceCommand internal-sftp`. This message is not produced by OpenSSH or `internal-sftp` — it is typically only seen when a custom shell wrapper script prints it. With `ForceCommand internal-sftp`, an interactive `ssh` attempt simply runs `internal-sftp`, which expects SFTP protocol on stdin, so the connection becomes unusable and terminates. Updated both the inline expected-output comment and the follow-up explanatory paragraph to describe the actual behavior.

2. **Misleading claim that `authorized_keys` must be "inside the chroot" because "OpenSSH looks relative to the chroot root".** This is wrong: `sshd` reads `authorized_keys` during authentication, *before* the chroot takes effect in the user session. `AuthorizedKeysFile` paths are interpreted against the host filesystem. The post's setup happens to work because the chroot root coincides with the user's home directory, but the rationale was incorrect. Rewrote the explanatory comment block to clarify this without changing the underlying steps.

## Review Notes

- `systemctl reload sshd` works on modern Ubuntu because `sshd.service` is an alias of `ssh.service`. The post mixes `sshd` (for systemctl) and `ssh` (for journalctl); both work, so no change was needed.
- The `for user in alice bob charlie; do ... sudo passwd $user ...; done` loop will prompt interactively for each user's password. This is correct behavior but readers should be aware it isn't fully automated.
- The `AuthorizedKeysFile /home/sftpuser1/.ssh/authorized_keys` directive is technically redundant — the default lookup (`%h/.ssh/authorized_keys`) finds the same file because the user's home directory in `/etc/passwd` is `/home/sftpuser1`. It does not hurt to be explicit, so it was left in.
- The bind-mount approach for shared SFTP directories is valid; readers should note that bind mounts inside a chroot do not always survive nested mount namespaces (e.g., containers) and that the chroot still requires `/srv/sftp/shared`'s parents to be root-owned and non-writable if it were placed under a chroot pathway. As described (mounting *into* the chroot, not chrooting onto `/srv`), the setup is fine.
- `PasswordAuthentication yes` inside a `Match` block is supported and overrides a global `no` for matched users — a common gotcha worth keeping in mind when hardening SSH.
