# Validation Summary: How to Run Cron Jobs with Specific User Permissions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cron / crontab (Vixie cron on Ubuntu)
- `/etc/crontab` and `/etc/cron.d/` system crontabs
- sudo and sudoers (`visudo`, `NOPASSWD`)
- `useradd` for system service accounts
- File ownership and permissions (`chown`, `chmod`)
- setuid / setgid (`chmod 4755`)
- systemd service units (`User=`, `Group=`, `SupplementaryGroups=`)
- Bash scripting (`id`, environment isolation with `env -i`)

## Sources Consulted
- `man 5 crontab` on Ubuntu — confirmed the system crontab format adds a username field between time/date and command, while user crontabs run as their owner.
- `man 8 useradd` — confirmed `-r` (system account), `-s` (login shell), `-d` (home dir without creation unless `-m` is also passed).
- `man 5 sudoers` — confirmed `NOPASSWD:` tag, `Runas_Spec` syntax (e.g. `ALL=(root)`), and that sudo `Cmnd` paths must be executable commands with optional argument matching.
- `man 8 sudo` and sudo command-matching docs — sudo executes the requested path; non-executable proc files cannot be valid command targets.
- Local verification on Ubuntu: `/proc/sys/vm/drop_caches` has mode `--w-------` (write-only, not executable), and `sysctl` lives at `/usr/sbin/sysctl`.
- Linux kernel docs (`Documentation/admin-guide/sysctl/vm.rst`) — drop_caches accepts values 1, 2, or 3; written via `sysctl` or by writing to the proc file.
- Linux kernel — setuid on shell scripts has been ignored on Linux since the 1.x days for security reasons (only setuid binaries honor the bit).
- systemd documentation (`systemd.exec`) — confirms `User=`, `Group=`, and `SupplementaryGroups=` directives in `[Service]` are the correct way to control execution identity.

## Issues Found

1. **Incorrect sudoers target for dropping caches.** The original example included:
   ```
   myapp ALL=(root) NOPASSWD: /usr/bin/sync, /proc/sys/vm/drop_caches
   ```
   `/proc/sys/vm/drop_caches` is a write-only proc file (mode `--w-------`) and is not executable. `sudo` invokes the target as a command, so this rule would never produce a working `sudo /proc/sys/vm/drop_caches` invocation. Changed to use the standard mechanism for this action:
   ```
   myapp ALL=(root) NOPASSWD: /usr/bin/sync, /usr/sbin/sysctl vm.drop_caches=3
   ```
   `sysctl vm.drop_caches=3` is the canonical, executable command for releasing pagecache, dentries, and inodes, and the sudoers `Cmnd` syntax correctly matches both the binary path and its argument.

## Review Notes
- The "Using systemd Timers for Better User Control" section only shows the `.service` unit, not an accompanying `.timer` unit. The service shown is technically valid (and correctly demonstrates `User=`/`Group=`), but to actually replace a cron schedule the reader would also need a `.timer` unit (e.g. `OnCalendar=*-*-* 02:00:00`) and `systemctl enable --now myapp-backup.timer`. Left as-is since the service unit itself is correct and the section's stated focus is user control, not scheduling syntax.
- The `*/5 * * * * www-data /var/www/html/queue-worker.php` example assumes the PHP file has an executable bit and a `#!/usr/bin/env php` (or similar) shebang. Without those, cron would fail to execute it. This is a common pattern in PHP tutorials and not strictly wrong, but readers may prefer `php /var/www/html/queue-worker.php` for clarity. Not changed.
- `useradd -r -s /sbin/nologin ...` works on Ubuntu because `/sbin/nologin` is present (Ubuntu also ships `/usr/sbin/nologin`); both paths resolve to the same binary on current releases.
- The advice that Linux ignores setuid on shell scripts is correct; the wording in the post is accurate.
- The `chmod 4755` example sets setuid + `rwxr-xr-x`, which is the conventional permission for a setuid binary.
