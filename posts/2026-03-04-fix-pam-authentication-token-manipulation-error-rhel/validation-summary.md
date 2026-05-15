# Validation Summary: How to Fix PAM 'Authentication Token Manipulation Error' on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- PAM
- shadow-utils (`passwd`, `pwck`, `grpck`, `chage`, `vipw`)
- Linux filesystem and disk management commands (`mount`, `df`)
- DNF package cache cleanup
- systemd journal cleanup
- libpwquality configuration
- SELinux audit and file context tools

## Sources Consulted
- Red Hat Enterprise Linux SELinux documentation for `/etc/shadow` access by `passwd_t` and example `/etc/shadow` labeling/permissions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/epub/selinux_users_and_administrators_guide/chap-managing_confined_services-references
- Red Hat Enterprise Linux SELinux troubleshooting documentation for `ausearch` AVC checks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-troubleshooting-fixing_problems
- Red Hat Enterprise Linux SELinux file-labeling documentation for `restorecon`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Linux `passwd(1)` manual page for PAM usage, password complexity checks, locked-password behavior, and `passwd -u`: https://man7.org/linux/man-pages/man1/passwd.1.html
- Local `shadow-utils` manual pages for `passwd(1)`, `shadow(5)`, `pwck(8)`, and `chage(1)`.
- Local `pwquality.conf(5)` manual page for `minlen`, `dcredit`, `ucredit`, `lcredit`, and `ocredit`.
- Local `mount(8)` and command help output for remount syntax.
- Local command help output for `passwd`, `chage`, `df`, `journalctl`, and related commands.

## Issues Found
- The post listed `/etc/shadow` mode `000` or `600` as expected and used `chmod 000` as the fix. Red Hat SELinux documentation shows `/etc/shadow` as root-owned, labeled `shadow_t`, and restrictively permissioned with `0400` in its example. I changed the guidance to include `0400`, `000`, and `0600` as restrictive acceptable modes, and changed the example fix to `chmod 400 /etc/shadow` so it matches the RHEL-documented example.

## Review Notes
- The commands and options for `passwd`, `pwck`, `grpck`, `vipw -s`, `chage -l`, `chage -E -1`, `passwd -u`, `mount -o remount,rw /`, `df -h /etc`, `journalctl --vacuum-time=3d`, and the shown `pwquality.conf` options are valid.
- The SELinux troubleshooting flow is broadly correct. Red Hat documentation commonly recommends searching AVC-related message types with `ausearch -m AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR -ts recent`; the post's narrower `ausearch -m avc -c passwd --start recent` is still a valid targeted check.
