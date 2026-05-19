# Validation Summary: How to Configure systemd Automount Units on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd mount units
- systemd automount units
- NFS
- CIFS/SMB
- USB/removable storage mounting

## Sources Consulted
- systemd.automount(5), freedesktop.org: https://www.freedesktop.org/software/systemd/man/latest/systemd.automount.html
- systemd.mount(5), freedesktop.org: https://www.freedesktop.org/software/systemd/man/latest/systemd.mount.html
- systemd.unit(5), freedesktop.org: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd-escape(1), freedesktop.org: https://www.freedesktop.org/software/systemd/man/latest/systemd-escape.html
- Ubuntu systemd.automount(5) man page: https://manpages.ubuntu.com/manpages/xenial/man5/systemd.automount.5.html
- Ubuntu systemd.mount(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/systemd.mount.5.html
- nfs(5), Linux man-pages project: https://man7.org/linux/man-pages/man5/nfs.5.html
- Ubuntu mount.cifs(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/mount.cifs.8.html

## Issues Found
- Removed `After=network-online.target` from example `.automount` units. The systemd documentation says automount units are separate from the mount itself and should not set `After=` or `Requires=` for mount dependencies, including `network-online.target`, because this may create ordering cycles.
- Corrected the network-dependent mount guidance so network ordering is applied to the paired `.mount` unit instead of the `.automount` unit. systemd automatically treats NFS and CIFS mount units as network mounts, and explicit network ordering belongs on the mount unit when needed.
- Changed the USB example introduction from "combine automount with udev rules" to using a stable device symlink, because the post did not include a udev rule and `/dev/disk/by-label/...` is provided by the system's device management.
- Corrected the NFS `soft` option explanation. `soft` affects NFS request retry behavior after retransmissions and carries data-integrity risks; it does not simply make the mount operation fail quickly.
- Updated troubleshooting guidance to recommend network dependencies on the mount unit, not both units.

## Review Notes
The examples use conventional unit settings and commands for systemd 249+ on Ubuntu and systemd 255 locally. `TimeoutIdleSec=0` is technically correct because it disables idle timeout logic, though it still differs from a normal boot-time persistent mount because the filesystem is first mounted on access.
