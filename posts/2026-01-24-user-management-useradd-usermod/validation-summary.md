# Validation Summary: How to Handle User Management with useradd and usermod

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux user and group management
- `useradd`, `usermod`, `passwd`, `chpasswd`, `chage`, `gpasswd`, `userdel`
- `/etc/passwd`, `/etc/shadow`, `/etc/group`, `/etc/gshadow`
- `/etc/login.defs` and `/etc/skel`
- Bash scripting for account creation and auditing

## Sources Consulted
- Linux man-pages `passwd(5)`: https://man7.org/linux/man-pages/man5/passwd.5.html
- Linux man-pages `shadow(5)`: https://man7.org/linux/man-pages/man5/shadow.5.html
- Linux man-pages `group(5)`: https://man7.org/linux/man-pages/man5/group.5.html
- shadow-utils `useradd(8)`: https://man7.org/linux/man-pages/man8/useradd.8.html
- shadow-utils `usermod(8)`: https://man7.org/linux/man-pages/man8/usermod.8.html
- shadow-utils `chpasswd(8)`: https://man7.org/linux/man-pages/man8/chpasswd.8.html
- shadow-utils `login.defs(5)`: https://man7.org/linux/man-pages/man5/login.defs.5.html
- Linux man-pages `passwd(1)`: https://man7.org/linux/man-pages/man1/passwd.1.html
- Local `useradd --help`, `usermod --help`, `chage --help`, and `chpasswd --help` output from the review environment

## Issues Found
- The multi-line `useradd` example placed inline comments after continuation backslashes. In POSIX shells, that prevents the intended line continuation and can cause following option lines to be parsed as separate commands. I moved those explanations into separate comment lines below the command.
- The user creation workflow stated that `useradd` always creates a user group. I changed this to "Create user group if configured" because the behavior depends on `USERGROUPS_ENAB` and the `-g`, `-N`, and `-U` options.
- The system-user section described `useradd -r` as creating a UID below 1000. I changed this to "from the system UID range" because shadow-utils uses the configured `SYS_UID_MIN`/`SYS_UID_MAX` range, which is commonly below regular user IDs but is configuration-dependent.
- The locking section said `usermod -L` prevents login. I corrected it to password locking because `usermod -L` and `passwd -l` lock password authentication by prefixing the password hash with `!`; other authentication methods, such as SSH keys, may still work unless the account is expired or otherwise disabled.
- The user account state diagram referred to disabling an account by removing the shell. I changed this to setting a non-login shell, which better matches the commands shown and avoids implying that an empty shell field disables login.
- The password policy section listed `PASS_MIN_LEN` in `/etc/login.defs`. I removed it from the key `login.defs` settings and noted that minimum password length is normally enforced through PAM, such as `pam_pwquality`, on modern Linux systems.
- The SFTP-only example implied that changing the shell to `/usr/sbin/nologin` is sufficient by itself. I clarified that SSHD should be configured with `ForceCommand internal-sftp` for this pattern.

## Review Notes
Many examples are distribution-dependent, especially default shells, UID/GID values, whether home directories are created by default, and the exact path to `nologin`. The post now avoids presenting those defaults as universal behavior where it matters.
