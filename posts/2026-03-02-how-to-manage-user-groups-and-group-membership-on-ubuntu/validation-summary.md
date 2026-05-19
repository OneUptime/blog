# Validation Summary: How to Manage User Groups and Group Membership on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu / Linux user and group management
- shadow-utils commands: `groupadd`, `groupmod`, `groupdel`, `usermod`, `useradd`, `gpasswd`, `newgrp`
- Ubuntu high-level wrappers: `deluser`
- NSS lookups: `getent`
- System files: `/etc/group`, `/etc/passwd`, `/etc/gshadow`
- POSIX file mode bits and the setgid bit (`chmod 2775`)
- Common Ubuntu system groups: `sudo`, `adm`, `docker`, `www-data`, `ssl-cert`, `dialout`, `plugdev`, `kvm`, `libvirt`, `lxd`, `netdev`
- Bash scripting (associative arrays, control flow)

## Sources Consulted
- shadow-utils man pages (`groupadd(8)`, `groupmod(8)`, `groupdel(8)`, `usermod(8)`, `useradd(8)`, `gpasswd(1)`, `newgrp(1)`)
- `find(1)` man page — verified semantics of `-writable` and `-perm` predicates
- `chmod(1)` man page — verified setgid bit semantics and octal mode `2775`
- Ubuntu documentation on default UID/GID ranges (`/etc/login.defs`: `UID_MIN`/`GID_MIN` = 1000, `SYS_GID_MIN`/`SYS_GID_MAX` for system groups)
- Ubuntu Server Guide: User and group management
- Docker installation docs (post-install steps for managing Docker as a non-root user via the `docker` group)
- rsyslog/syslog default ownership of `/var/log/auth.log` (syslog:adm)

## Issues Found

1. **Incorrect use of `find -writable` to find group-writable files**
   - Original: `find /var -group myapp -writable` with comment "Find files a group can write to".
   - Per `find(1)`, `-writable` matches files writable by the current user (the user running `find`), not by a specific group. If run as root, this matches everything; if run as a non-root user, it only matches files the caller can write — neither matches the comment's intent.
   - Fix: changed to `find /var -group myapp -perm -g+w` with corrected comment "Find files where the group has write permission". The `-perm -g+w` test correctly checks that the group write bit is set on the file mode.

2. **Mismatch between "orphaned groups" comment and the script's actual behavior**
   - Original comment: "Check for orphaned groups (no users have them as primary)". The script then iterates GIDs from `/etc/passwd` and reports those missing from `/etc/group`.
   - This is the inverse of what the comment describes: the code finds users whose primary GID has no matching group entry (broken references in `/etc/passwd`), not groups with no primary users.
   - Fix: rewrote the comment to accurately describe the check ("Check for users whose primary GID has no matching group entry — broken references between /etc/passwd and /etc/group") and updated the printed message to "Missing group for primary GID: $gid". The auditing intent is still valuable; only the description was corrected.

## Review Notes

- The post's claim that `/var/log/auth.log` and syslog files are readable by the `adm` group is accurate for systems where rsyslog is installed. Note that Ubuntu 24.04 LTS does not install rsyslog by default and uses systemd-journald only — in that configuration `/var/log/auth.log` may not exist unless rsyslog is installed. Not corrected, since the example is still valid wherever the file exists and the ownership/permission claim itself is correct.
- The `plugdev` group is still present on Ubuntu and used by udev rules for removable storage, though some modern desktops increasingly rely on PolicyKit/udisks2 rather than group membership.
- `chmod 2775` and the resulting `drwxrwsr-x` listing were verified correct: the `s` in the group execute position represents the setgid bit combined with group execute permission.
- The `getent group | awk -F: '$3 >= 1000 ...'` example uses `>= 1000` which correctly captures Ubuntu's default user-group range starting at GID 1000; the comment "GID above 1000" is slightly informal but not incorrect in spirit.
- `usermod -aG` requires `-a` together with `-G` — without `-a`, `usermod -G` replaces all supplementary group memberships. The post correctly highlights this critical pitfall.
- `useradd -r -s /usr/sbin/nologin -g myapp myapp` is correct on Ubuntu; `/usr/sbin/nologin` is the standard path and `-r` creates a system account in the `SYS_GID_MIN`–`SYS_GID_MAX` range.
