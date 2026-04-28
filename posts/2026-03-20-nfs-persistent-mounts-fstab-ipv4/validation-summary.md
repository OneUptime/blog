# Validation Summary: How to Configure Persistent NFS Mounts via /etc/fstab on IPv4

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- NFS (Network File System), NFSv4
- Linux `/etc/fstab`
- `mount(8)` / NFS mount options (`_netdev`, `soft`, `bg`, `nfsvers`, `rsize`, `wsize`, `noatime`)
- systemd `.mount` and `.automount` units
- `journalctl`, `showmount`, `mount -a`

## Sources Consulted
- `nfs(5)` Linux man page — https://man7.org/linux/man-pages/man5/nfs.5.html
- `fstab(5)` Linux man page — https://man7.org/linux/man-pages/man5/fstab.5.html
- `systemd.syntax(7)` — https://man7.org/linux/man-pages/man7/systemd.syntax.7.html
- `systemd.unit(5)` / `systemd.mount(5)` / `systemd.automount(5)` — freedesktop.org systemd documentation

## Issues Found

1. **Deprecated `intr` mount option listed as "recommended."** The `intr` / `nointr` NFS mount option has been deprecated and ignored since Linux kernel 2.6.25 (2008) per the `nfs(5)` man page. Removed it from the recommended-options table and from the example fstab entries to avoid suggesting an option that has no effect on modern kernels.

2. **fstab example used backslash line continuation.** `/etc/fstab` does not support backslash line continuation — each filesystem must be described on a separate single line per `fstab(5)`. The "Recommended options for reliability" example was rewritten as a single line, with a comment noting the constraint.

3. **Inline comment inside a systemd unit file directive.** The `[Automount]` section had `TimeoutIdleSec=600   # Unmount after 10 minutes of inactivity`. Per `systemd.syntax(7)`, only lines that *start* with `#` or `;` are treated as comments — inline trailing comments are parsed as part of the value, which would cause the unit to fail to load. Moved the comment to its own line above the directive.

## Review Notes
- The `soft` mount option is widely used to avoid boot hangs, but the Linux NFS FAQ and `nfs(5)` warn that `soft` mounts can lead to silent data corruption on read-write filesystems. A future revision could mention `hard,bg,_netdev` (the safer default) and use `soft` only where the workload tolerates I/O errors. Left as-is since the post explicitly frames `soft` as a boot-hang mitigation.
- `rsize=65536` / `wsize=65536` are valid but conservative; modern NFSv4 clients typically negotiate up to 1 MiB. Not changed because the values still work and are commonly cited.
- `Type=nfs` with `nfsvers=4` is correct; `Type=nfs4` would also work but is the legacy form.
- `_netdev` inside a systemd `.mount` unit is harmless but redundant when `After=network-online.target` / `Wants=network-online.target` are already set. Left as-is.
