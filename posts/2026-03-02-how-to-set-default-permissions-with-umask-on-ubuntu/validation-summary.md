# Validation Summary: How to Set Default Permissions with umask on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux file permissions and umask
- Bash shell initialization files (`~/.bashrc`, `~/.profile`, `/etc/profile`, `/etc/profile.d/`)
- systemd service units (`UMask=` directive)
- PAM (`pam_umask.so`, `/etc/login.defs`, `/etc/pam.d/common-session`)
- sudo / sudoers (`Defaults umask`, `umask_override`)
- Ubuntu system administration

## Sources Consulted
- umask(2): https://man7.org/linux/man-pages/man2/umask.2.html
- umask(1p) POSIX: https://man7.org/linux/man-pages/man1/umask.1p.html
- systemd.exec(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemctl(1): https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- pam_umask(8): https://www.man7.org/linux/man-pages/man8/pam_umask.8.html
- sudoers(5): https://www.sudo.ws/docs/man/sudoers.man/
- bash(1): https://man7.org/linux/man-pages/man1/bash.1.html

## Issues Found

1. **Incorrect terminology: "group sticky bit"** — The post referred to "setting the group sticky bit on shared directories" so files inherit the group. The correct term is the **setgid bit** (SGID), set via `chmod g+s`. The "sticky bit" (the `t` bit, e.g., on `/tmp`) is a different mechanism that restricts deletion of files by non-owners. Changed the wording to "setgid bit (`chmod g+s`)".

2. **Misleading claim about `~/.profile` and non-interactive scripts** — The post said `~/.profile` "affects non-interactive scripts too". Per bash(1), `~/.profile` is sourced by login shells (typically interactive logins or `bash --login`). Standard non-interactive scripts (cron jobs, scripts executed via non-interactive SSH) do **not** source `~/.profile`; bash uses `BASH_ENV` for those instead. Changed the parenthetical to "sourced on login, including SSH logins", which is accurate.

## Review Notes

- The "subtraction" intuition for umask (e.g., `666 - 022 = 644`) is a common pedagogical simplification. The technically accurate operation is bitwise: `mode & ~umask`. The two yield the same result for all the umask values shown in the post (022, 027, 077, 002), so the explanation and table are not incorrect — just a simplification readers may want to be aware of when working with unusual umask values.
- The `systemctl daemon-reload` step after `systemctl edit nginx` is technically unnecessary: per systemctl(1), `systemctl edit` automatically reloads the configuration on exit (the only exception being `--global` edits). Leaving the explicit `daemon-reload` is harmless and a common defensive habit, so no change was made.
- The `ls -la` example output in the verification section is abbreviated for readability (omits the link count, owner, group, size, and timestamp); this is fine for a tutorial.
- All systemd (`UMask=0027`), PAM (`session optional pam_umask.so umask=027`), `/etc/login.defs` (`UMASK 027`), and sudoers (`Defaults umask=0027`, `Defaults umask_override`) directives are syntactically and semantically correct.
- The behavior of `umask_override` as a boolean flag (no value) was confirmed against sudoers(5); the post's usage is correct.
