# Validation Summary: How to Set the SUID, SGID, and Sticky Bit on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux file permissions (SUID, SGID, sticky bit)
- chmod (octal and symbolic notation)
- find (with -perm operators)
- ls (permission display)
- setcap / Linux capabilities
- Ubuntu standard SUID binaries (passwd, sudo, mount, etc.)

## Sources Consulted
- chmod(1) man page (GNU coreutils): https://man7.org/linux/man-pages/man1/chmod.1.html
- find(1) man page: https://man7.org/linux/man-pages/man1/find.1.html
- inode(7) man page (permission bit semantics): https://man7.org/linux/man-pages/man7/inode.7.html
- capabilities(7) man page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Ubuntu 22.04/24.04 default SUID binary set (verified against typical installs)
- Linux kernel source behavior regarding SUID on #! scripts (kernel ignores SUID on interpreted scripts via binfmt_script)

## Issues Found
No technical issues found.

All technical claims were verified:
- SUID/SGID/sticky octal values (4000/2000/1000) are correct.
- Symbolic chmod operators (`u+s`, `u-s`, `g+s`, `+t`) are correct.
- 's'/'S' and 't'/'T' display semantics in `ls -l` output are correctly explained (lowercase = special bit + execute, uppercase = special bit without execute).
- `/usr/bin/passwd` SUID example with `-rwsr-xr-x` is correct.
- `/usr/bin/write` SGID tty example with `-rwxr-sr-x` is correct.
- `/tmp` sticky bit with `drwxrwxrwt` is correct.
- `find -perm -4000` (all listed bits set) and `find -perm /6000` (any listed bits set) syntax is correct per find(1).
- SGID directory group inheritance behavior is correctly described.
- Linux ignoring SUID on directories is correct (some other Unix variants use it).
- Linux kernel ignoring SUID on interpreted shell scripts is correct.
- `setcap cap_net_raw+ep /usr/bin/ping` is correct and matches the modern Ubuntu approach (ping uses capabilities, not SUID, on recent Ubuntu releases).
- The displayed permission string `drwxrwsr-t` for `chmod 3775` is correct (SGID + sticky on a 775 directory).
- The baseline SUID binary list is a reasonable subset of what appears on a fresh Ubuntu install.

## Review Notes
- The baseline SUID list is intentionally a typical subset; a real Ubuntu 22.04/24.04 install will additionally include things like `/usr/lib/dbus-1.0/dbus-daemon-launch-helper`, `/usr/lib/openssh/ssh-keysign`, `/usr/libexec/polkit-agent-helper-1`, and (if installed) `/usr/lib/snapd/snap-confine`. The post correctly frames its list as binaries "you'd typically see" rather than an exhaustive set.
- The note "some systems have bugs around this" regarding SUID on scripts is a fair hedge — historically there were race conditions, but modern Linux reliably ignores SUID on `#!` scripts.
- `fusermount3` is the current SUID helper on recent Ubuntu releases (since FUSE 3); older releases had `fusermount`. The post correctly references the modern name.
- No version-specific caveats that need flagging for a 2026 reader.
