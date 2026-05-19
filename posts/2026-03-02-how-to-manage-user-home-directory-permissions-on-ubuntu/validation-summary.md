# Validation Summary: How to Manage User Home Directory Permissions on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu Linux (user management)
- `useradd` / `adduser` (shadow-utils and Debian adduser)
- `/etc/login.defs` (`HOME_MODE`)
- `/etc/skel` (skeleton directory)
- POSIX file permissions (`chmod`, `chown`, `chgrp`)
- `stat`, `find`, `getent`, `usermod`, `groupadd`
- OpenSSH (`~/.ssh/authorized_keys`, SSH StrictModes behavior)
- Bash scripting (parameter substring expansion)
- systemd-homed (LUKS-backed home directories)

## Sources Consulted
- shadow-utils `login.defs(5)` manpage — https://man7.org/linux/man-pages/man5/login.defs.5.html (confirms `HOME_MODE` is the directive, not `DIR_MODE`)
- shadow-utils `useradd(8)` manpage — https://man7.org/linux/man-pages/man8/useradd.8.html
- Debian `adduser.conf(5)` manpage — https://manpages.debian.org/bookworm/adduser/adduser.conf.5.en.html (confirms `DIR_MODE` lives in `/etc/adduser.conf`, not `/etc/login.defs`)
- GNU coreutils `chown(1)` manpage — https://www.gnu.org/software/coreutils/manual/html_node/chown-invocation.html (confirms `--no-dereference` / `-h`)
- GNU findutils `find(1)` manpage — https://www.gnu.org/software/findutils/manual/html_node/find_html/Mode-Bits.html (confirms `-perm /MODE` semantics with symbolic modes)
- OpenSSH `sshd(8)` — https://man.openbsd.org/sshd.8 (StrictModes requires `authorized_keys` to not be group/other writable)
- `systemd-homed.service(8)` — https://www.freedesktop.org/software/systemd/man/systemd-homed.service.html (LUKS-backed home image)
- Bash Reference Manual (parameter expansion `${var: -1}` requires space before negative offset) — https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html

## Issues Found
- **`DIR_MODE` vs `HOME_MODE` confusion in the "Setting the Default for New Users" section.** The post originally stated that `useradd` reads `/etc/login.defs` "and the `DIR_MODE` setting." This is incorrect: `/etc/login.defs` uses `HOME_MODE` (added in shadow-utils 4.7). `DIR_MODE` is a separate directive that lives in `/etc/adduser.conf` and is used only by Debian/Ubuntu's `adduser` Perl wrapper, not by `useradd`. Updated the sentence to reference `HOME_MODE`, which matches the actual setting shown immediately below it in the code block.

## Review Notes
- The post states that the default home directory permission is `755`. Historically that has been true on Ubuntu, but recent Ubuntu releases (22.04+) ship with `HOME_MODE 0750` in `/etc/login.defs` and `DIR_MODE=0700` in `/etc/adduser.conf`, so a fresh install will already produce more restrictive defaults than the post suggests. Not factually wrong as a general historical statement, but readers on modern Ubuntu may find their starting state is already tighter than `755`.
- The `chown -R` warning is slightly oversimplified: by default GNU `chown -R` uses `-P` semantics (does not traverse into symlinked directories) but will still operate on symlink entries themselves. Using `--no-dereference` / `-h` is still good defensive practice, so the recommendation is sound even if the explanation is brief.
- The example `chmod 644 /home/username/.ssh/config` is valid — OpenSSH does not enforce StrictModes on the client `config` file — though `600` is more commonly seen.
- `${perms: -1}` is bash-specific (requires the space before `-1`) and will not work in `sh`/`dash`. The script does not declare a shebang, so this is worth being aware of but is fine when run interactively in bash.
- The `systemd-homed` section is correct but brief; users who actually adopt homed will need additional `homectl` knowledge beyond what this post provides.
