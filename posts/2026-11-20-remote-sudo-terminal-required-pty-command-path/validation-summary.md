# Validation Summary: Remote sudo Requires a Terminal: Allocate a PTY or Change the Command

## Status
validated

## Post Type
Operational troubleshooting guide with shell commands and a sudoers configuration example.

## Technologies Covered
- OpenSSH client PTY allocation, noninteractive authentication, and remote command execution.
- sudo 1.9.17p2 and the sudoers policy plugin.
- POSIX shell wrappers, file ownership, environment filtering, and sudo credential caching.

## Sources Consulted
- [sudo 1.9.17p2 password input implementation](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/src/tgetpass.c): terminal-based password input and the SSH-specific diagnostic.
- [sudo 1.9.17p2 policy implementation](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/plugins/sudoers/sudoers.c): requiretty is checked before authentication.
- [sudoers 1.9.17p2 manual](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/docs/sudoers.man.in): requiretty, use_pty defaults and conditions, command argument matching, and environment controls.
- [sudo 1.9.17p2 manual](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/docs/sudo.man.in): noninteractive execution, cache bypass, target user selection, and verbose privilege listing.
- [visudo 1.9.17p2 manual](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/docs/visudo.man.in): candidate and full-policy syntax checking.
- [sudoers timestamp format](https://raw.githubusercontent.com/sudo-project/sudo/v1.9.17p2/docs/sudoers_timestamp.man.in): terminal and process-scoped cached credentials.
- [OpenBSD 7.6 ssh manual](https://man.openbsd.org/OpenBSD-7.6/ssh.1): -t, -T, -n, and remote command status.
- [OpenBSD 7.6 ssh_config manual](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5): BatchMode and host-key verification.
- [OpenBSD 7.6 sshd manual](https://man.openbsd.org/OpenBSD-7.6/sshd.8) and [sshd_config manual](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5): key restrictions and PermitTTY.

## Issues Found
No technical issues found.

## Review Notes
- README left unchanged. The article correctly separates password input, requiretty policy, use_pty behavior, and application terminal dependencies.
- Confirmed that a NOPASSWD rule does not override requiretty, and that use_pty does not create a missing terminal for sudo authentication. The upstream default change in sudo 1.9.14 is documented.
- The no-argument sudoers rule is correctly paired with a wrapper that also rejects arguments. Ownership, parent-directory integrity, environment controls, and overlapping grants are explicitly part of the deployment requirements.
- All four shell examples passed /bin/sh -n. The wrapper rejected an extra argument with exit 2 before attempting the privileged file read. The sudoers fragment passed the installed visudo parser using check mode and stdin; no system policy was modified.
- Confirmed that sudo -k with a command ignores cached credentials and actually executes that command. The article appropriately requires effective-policy inspection alongside the test.
- No live remote SSH session, privileged wrapper installation, password authentication, or sudo policy change was performed. Runtime configuration and distribution defaults must still be checked on the target. The pinned sudo version is a behavior baseline, not a claim to be the newest release.
