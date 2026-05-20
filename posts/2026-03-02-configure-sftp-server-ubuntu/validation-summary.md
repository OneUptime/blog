# Validation Summary: How to Configure SFTP Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH server
- SFTP
- SSH chroot configuration
- SSH public key authentication
- Linux filesystem permissions
- Linux filesystem quotas
- UFW firewall
- systemd journal logging

## Sources Consulted
- Ubuntu Server documentation: OpenSSH server - https://ubuntu.com/server/docs/how-to/security/openssh-server/
- OpenSSH `sshd_config(5)` manual - https://man.openbsd.org/sshd_config
- OpenSSH `sftp-server(8)` manual - https://man.openbsd.org/sftp-server
- Ubuntu `quotacheck(8)` manual - https://manpages.ubuntu.com/manpages/jammy/man8/quotacheck.8.html
- Ubuntu `setquota(8)` manual - https://manpages.ubuntu.com/manpages/noble/man8/setquota.8.html
- Local `useradd --help` output for Ubuntu/Linux command flags

## Issues Found
- The introduction described chroot isolation as being in users' home directories, but the tutorial configures `/var/sftp/%u`. Changed this to "assigned directories" to match the configuration.
- The chroot permissions guidance only mentioned the chroot root. OpenSSH requires every component in the `ChrootDirectory` path to be root-owned and not writable by group or others, so the text and commands now explicitly set `/var/sftp` ownership and permissions.
- The multi-user creation script did not explicitly enforce safe ownership and permissions on `/var/sftp`. Added `chown root:root /var/sftp` and `chmod 755 /var/sftp`.
- The key-based authentication comments incorrectly referred to creating `.ssh` inside the chroot structure. Updated the comments to state that `/home/alice/.ssh` is outside the chroot, matching the `AuthorizedKeysFile /home/%u/.ssh/authorized_keys` configuration.
- The sample public key used `ssh-rsa`, which is not the best current example. Replaced it with an `ssh-ed25519` placeholder, consistent with Ubuntu's OpenSSH key recommendation.
- The quota section heading incorrectly said "with du". Changed it to "with Filesystem Quotas".
- The quota setup omitted `quotaon`, so configured quotas might not be enforced after `quotacheck`. Added `sudo quotaon /var/sftp`.
- The quota remount command assumed `/var/sftp` is the mount point. Added a note to replace it with the actual mount point if needed.
- The monitoring section used `who | grep sftp`, which is not reliable for internal-sftp sessions. Replaced it with a `ps` command that looks for active `sshd: user@internal-sftp` sessions.
- The auth log connection-count example parsed the wrong field and depended on `/var/log/auth.log`. Replaced it with `journalctl -u ssh --grep="subsystem request for sftp"` and `awk '{print $NF}'`.

## Review Notes
- The core OpenSSH `Subsystem sftp internal-sftp`, `Match Group`, `ForceCommand internal-sftp`, `ChrootDirectory /var/sftp/%u`, forwarding restrictions, and `AuthorizedKeysFile` examples are consistent with OpenSSH documentation.
- The quota example assumes `/var/sftp` is a separate quota-enabled filesystem. If `/var/sftp` lives on `/`, administrators should use the root filesystem's mount point instead.
