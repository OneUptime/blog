# Validation Summary: How to Set Up Account Lockout Policies on Ubuntu

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Ubuntu (20.04 / 22.04 LTS)
- Linux-PAM (Pluggable Authentication Modules)
- `pam_faillock` module
- `/etc/security/faillock.conf` configuration
- PAM stack files: `/etc/pam.d/common-auth`, `/etc/pam.d/common-account`, `/etc/pam.d/sshd`, `/etc/pam.d/sudo`
- `faillock` CLI tool
- OpenSSH (`sshd_config`, `UsePAM`)
- fail2ban (jail configuration)
- syslog / `/var/log/auth.log`

## Sources Consulted
- [pam_faillock(8) — Linux manual page](https://man7.org/linux/man-pages/man8/pam_faillock.8.html)
- [faillock.conf(5) — Linux manual page](https://www.man7.org/linux/man-pages/man5/faillock.conf.5.html)
- [Ubuntu Manpages — pam_faillock](https://manpages.ubuntu.com/manpages/jammy/man8/pam_faillock.8.html)
- [Ubuntu Manpages — faillock.conf](https://manpages.ubuntu.com/manpages/jammy/man5/faillock.conf.5.html)
- Linux-PAM 1.4.0 release notes (removal of `pam_tally2`)
- fail2ban official documentation for jail.d configuration

## Issues Found

1. **Incorrect Ubuntu version for pam_faillock replacement.** The post claimed `pam_faillock` replaced `pam_tally2` in Ubuntu 20.04 and later. In fact, Ubuntu 20.04 still shipped PAM 1.3.1 with `pam_tally2` present; `pam_tally2` was removed when PAM 1.4.0 landed in Ubuntu 22.04. Updated the sentence to "Ubuntu 22.04 and later (where PAM 1.4.0 removed `pam_tally2`)".

2. **Incorrect description of the account phase role.** The post stated the account phase "Increments the failure counter on authentication failure". This is wrong — the counter is incremented in the *auth* phase via the `authfail` argument. The account phase only *enforces* the lockout decision. Rewrote both bullets to clearly describe `preauth` / `authfail` / `authsucc` (auth phase) and lockout enforcement (account phase).

3. **Misleading comment on the `audit` option.** The post said `audit` "Audit log all lockout events". Per the man page, `audit` actually logs the user name to syslog when a non-existent user attempts to authenticate (useful for detecting username probing). Corrected the inline comment.

4. **Misleading comment on the `no_log_info` option.** The post said this option controls a user-facing message about remaining unlock time. In fact, `no_log_info` only controls whether informational messages are written to syslog; it does not affect what locked-out users see. Corrected the inline comment.

## Review Notes

- The PAM stack examples for `common-auth` and `common-account` follow the canonical Linux-PAM/Red Hat pattern and are correct, including the control flags `[success=1 default=ignore]` and `[default=die]`.
- `faillock --user <name>`, `faillock --user <name> --reset`, and bare `faillock` are all valid invocations on Ubuntu.
- `/var/run/faillock` is a tmpfs and clears on reboot; moving to `/var/lib/faillock` for persistence is the correct mitigation. Note that the documented modes (`755`) are slightly more permissive than the upstream default for this directory, but acceptable since the files themselves are still owned by root.
- The `even_deny_root` / `root_unlock_time` options were verified against the man page and are correct.
- The fail2ban jail snippet is valid (`maxretry`, `findtime`, `bantime` are standard keys; `filter = sshd` and `logpath = /var/log/auth.log` are correct for Ubuntu).
- Minor stylistic note (not changed): in `faillock.conf`, boolean options like `audit` and `even_deny_root` are conventionally listed without a value, but the `key = true` form is also accepted by the parser, so the post's syntax works.
- The example `faillock` output timestamps (2026-03-02) match the post's publish date and are illustrative.
