# Validation Summary: How to Configure Persistent CIFS/Samba Mounts via /etc/fstab on IPv4

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Samba/CIFS mounts
- `/etc/fstab`
- Linux `mount.cifs`
- systemd mount and automount units
- Bash shell redirection

## Sources Consulted
- Linux Kernel CIFS client documentation: https://www.kernel.org/doc/html/v5.10/admin-guide/cifs/usage.html
- `mount.cifs(8)` manual page from LinuxCIFS/cifs-utils: https://man7.org/linux/man-pages/man8/mount.cifs.8.html
- `fstab(5)` manual page from util-linux: https://man7.org/linux/man-pages/man5/fstab.5.html
- `systemd.mount(5)` upstream documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.mount.html
- `systemd.automount(5)` upstream documentation: https://www.freedesktop.org/software/systemd/man/253/systemd.automount.html
- GNU Bash redirection documentation: https://www.gnu.org/software/bash/manual/html_node/Redirections.html

## Issues Found
- The credentials-file example used `sudo cat > /etc/samba/credentials-fileserver`, which would not reliably work because Bash performs the output redirection in the current shell before `sudo` runs `cat`. Changed it to create `/etc/samba` and write the file through a root shell.
- The systemd unit examples used plain `cat > /etc/systemd/system/...`, which requires root-owned writes under `/etc/systemd/system`. Changed those examples to use `sudo tee`.
- The advanced `/etc/fstab` example used shell-style backslash continuations. `fstab` records are parsed as separate lines with whitespace-separated fields, so the entry must be a single physical line. Changed the example to one line.
- `_netdev` was described as preventing boot hangs. systemd documents it as forcing network-mount classification and network ordering; it does not by itself guarantee boot will continue when a share is unreachable. Updated the wording and added `nofail` where boot continuation is intended.
- The troubleshooting section recommended `x-systemd.device-timeout=30` for a hanging network mount. That option controls waiting for device nodes; for limiting the mount command itself, systemd documents `x-systemd.mount-timeout=`. Changed the recommendation to `x-systemd.mount-timeout=30s`.
- Clarified the `x-systemd.automount` and `soft` descriptions so they match systemd and CIFS behavior more precisely.

## Review Notes
The example IP address `203.0.113.10` is from documentation address space and should be replaced by a real Samba server address. The `vers=3.0` option is valid, but the best SMB dialect can vary by server and client; newer clients may negotiate secure SMB2.1+ dialects by default when `vers=` is omitted.
