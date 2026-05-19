# Validation Summary: How to Harden Ubuntu Server: A Complete Security Checklist

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Ubuntu Server package management and unattended upgrades
- OpenSSH server configuration
- UFW firewall
- Fail2Ban
- Linux user and file permissions
- Linux sysctl kernel parameters
- auditd audit rules
- AIDE file integrity monitoring
- systemd service management
- AppArmor
- Lynis, debsums, and Tiger auditing tools

## Sources Consulted
- Ubuntu Server documentation: Automatic updates - https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- OpenSSH sshd_config manual - https://man.openbsd.org/sshd_config
- Ubuntu ufw(8) manpage - https://manpages.ubuntu.com/manpages/noble/man8/ufw.8.html
- Ubuntu fail2ban jail.conf(5) manpage - https://manpages.ubuntu.com/manpages/noble/man5/jail.conf.5.html
- Ubuntu find(1) manpage - https://manpages.ubuntu.com/manpages/noble/man1/find.1.html
- Ubuntu dpkg-statoverride(1) manpage - https://manpages.ubuntu.com/manpages/noble/man1/dpkg-statoverride.1.html
- Ubuntu sysctl.conf(5) manpage - https://manpages.ubuntu.com/manpages/noble/man5/sysctl.conf.5.html
- Ubuntu audit.rules(7) manpage - https://manpages.ubuntu.com/manpages/jammy/man7/audit.rules.7.html
- Ubuntu aideinit(8) manpage - https://manpages.ubuntu.com/manpages/noble/man8/aideinit.8.html
- Ubuntu Server documentation: AppArmor - https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu mount(8) manpage - https://manpages.ubuntu.com/manpages/noble/man8/mount.8.html

## Issues Found
- Replaced the deprecated OpenSSH `ChallengeResponseAuthentication no` directive with the current `KbdInteractiveAuthentication no` directive. The OpenSSH manual documents `ChallengeResponseAuthentication` as a deprecated alias.
- Removed the `Protocol 2` SSH directive and replaced it with a note that modern OpenSSH supports SSH protocol 2 only. Current `sshd_config` documentation no longer lists `Protocol` as a normal hardening setting.
- Added a Fail2Ban note to keep the `[sshd]` jail `port` value aligned with a custom SSH port. Otherwise a server moved to port `2222` could still show a jail configured for the default `ssh` service port.
- Corrected the world-writable file check from `find /etc -writable` to `sudo find /etc -xdev -type f -perm -0002 -print`, because `-writable` tests writability by the current user rather than world-writable permission bits.
- Corrected orphaned-file and SUID/SGID scans to prune pseudo-filesystems directly in `find` instead of piping `ls` output through `grep -v "^/proc"`, which did not reliably exclude `/proc` paths.
- Changed `/etc/gshadow` permissions from `600` to `640`, matching Ubuntu's standard root:shadow-readable sensitive account-file permissions.
- Replaced the broad AppArmor glob `aa-enforce /etc/apparmor.d/*` with a per-profile placeholder. The directory contains non-profile subdirectories such as `abstractions`, `abi`, and `local`, so a blanket glob is not a reliable command.
- Updated the shared-memory mount target from `/run/shm` to `/dev/shm`, the canonical tmpfs mount point on current Ubuntu systems.

## Review Notes
- The SSH hardening snippet was syntax-tested with `sshd -t` using a temporary host key after the corrections.
- The auditd examples are valid, but production systems may want both `arch=b64` and `arch=b32` syscall rules if 32-bit compatibility is enabled.
- Several recommendations, such as disabling services or restricting `/tmp` with `noexec`, are environment-dependent and should be tested against application requirements before applying on production hosts.
