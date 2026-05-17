# Validation Summary: How to Use systemd Targets Instead of Runlevels on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (init system, target units)
- systemctl (CLI)
- SysV runlevels (historical reference)
- GRUB (kernel command line)
- Ubuntu Linux

## Sources Consulted
- systemd.target(5) man page: https://www.freedesktop.org/software/systemd/man/systemd.target.html
- systemd.special(7) man page: https://www.freedesktop.org/software/systemd/man/systemd.special.html
- systemctl(1) man page: https://www.freedesktop.org/software/systemd/man/systemctl.html
- bootup(7) man page: https://www.freedesktop.org/software/systemd/man/bootup.html
- kernel-command-line(7): https://www.freedesktop.org/software/systemd/man/kernel-command-line.html
- Local verification of `/lib/systemd/system/runlevel*.target` symlinks
- Local `systemctl --help` output

## Issues Found
No technical issues found. Verified specifically:
- Runlevel-to-target mapping table matches the actual symlinks shipped in `/lib/systemd/system/runlevel{0..6}.target` (0→poweroff, 1→rescue, 2/3/4→multi-user, 5→graphical, 6→reboot).
- All `systemctl` subcommands referenced (`list-units`, `status`, `show`, `get-default`, `set-default`, `isolate`, `list-dependencies`, `enable`, `start`) and their flags (`--type=target`, `--all`, `--reverse`) are valid.
- `systemctl set-default` does create a symlink at `/etc/systemd/system/default.target`.
- The `systemd.unit=` kernel command-line parameter is the correct way to override the boot target via GRUB.
- The custom `.target` unit example uses valid `[Unit]` / `[Install]` directives (`Description`, `Requires`, `After`, `WantedBy`).
- Dependency description (graphical → multi-user → basic → sysinit) matches `bootup(7)`.
- The distinction between rescue (filesystems mounted, minimal shell) and emergency (root filesystem only, possibly read-only) modes is accurate.

## Review Notes
- The mention of `startx` as a way to start a graphical session after switching to `multi-user.target` is accurate where X11 / `xinit` is installed, but readers on Wayland-only GNOME setups may not have `startx` available. It is offered as an option rather than a guarantee, so this is acceptable.
- The claim that "multiple targets can be active at the same time" is correct in the sense that targets form a dependency tree and many can be in the `active` state simultaneously, which contrasts with SysV's mutually exclusive runlevels. The post conveys this accurately.
- For production custom services, `network-online.target` is often a more appropriate dependency than `network.target` when a service truly needs configured connectivity, but the example as written is syntactically valid and serves its illustrative purpose.
