# Validation Summary: How to Configure Systemd Mount Units as an Alternative to fstab on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd mount units
- systemd automount units
- /etc/fstab
- Linux file system mounting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Persistently mounting file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Using systemd.automount to mount a file system on-demand with a mount unit": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-file-systems-on-demand_managing-file-systems
- systemd.mount(5): https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- systemd.automount(5): https://www.freedesktop.org/software/systemd/man/systemd.automount.html
- systemd.unit(5), "String Escaping for Inclusion in Unit Names": https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd-escape(1): https://www.freedesktop.org/software/systemd/man/systemd-escape.html
- Local command checks: `systemd-escape -p --suffix=mount`, `systemctl --version`, and installed `systemd.mount(5)` / `systemd.automount(5)` man pages.

## Issues Found
- The mount unit filename guidance was incomplete. It said names are made by replacing slashes with dashes, which is true for simple paths but not for paths containing characters such as literal hyphens. Updated the guidance to refer to systemd path escaping and recommend `systemd-escape -p --suffix=mount`.
- The comparison table said fstab has no on-demand mounting. On systemd systems, fstab entries can use `x-systemd.automount`, and RHEL 9 documents this workflow. Updated the table entry accordingly.
- The comparison table implied fstab mounts are monitored only with `mount` and logged only through `dmesg`. Because systemd generates mount units from fstab entries, `systemctl` and `journalctl` can also be used for generated units. Updated the table to reflect this.

## Review Notes
The mount and automount unit examples use valid `[Mount]` and `[Automount]` keys, including `TimeoutSec=` and `TimeoutIdleSec=`. The post's automount workflow matches the RHEL 9 documented mount-unit workflow. Some dependencies in the examples are redundant because systemd adds default local mount dependencies automatically, but they are not technically incorrect.
