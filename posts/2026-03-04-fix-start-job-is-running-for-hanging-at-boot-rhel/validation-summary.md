# Validation Summary: How to Fix 'A Start Job Is Running for...' Hanging at Boot on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd units and targets
- systemd mount units
- `/etc/fstab`
- NetworkManager wait-online service
- systemd boot analysis tools

## Sources Consulted
- systemd-system.conf official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html
- systemd.mount official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.mount.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- NetworkManager nm-online official manual: https://networkmanager.dev/docs/api/latest/nm-online.html
- Red Hat Enterprise Linux 8 documentation, booting to emergency mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/
- Local command help/man pages for `systemctl`, `systemd-analyze`, `systemd.mount`, and `systemd.service`

## Issues Found
- The slow storage device example used `sudo systemctl edit dev-sdb1.mount`. systemd mount units are named after the mount point path, not the block device, and fstab-generated mounts support the explicit `x-systemd.device-timeout=` and `x-systemd.mount-timeout=` options. I changed the example to show those fstab options for `/dev/sdb1` mounted at `/data`.

## Review Notes
- The emergency mode instructions match Red Hat documentation for adding `systemd.unit=emergency.target` at the GRUB `linux` line and booting with `Ctrl+x`.
- `nofail` is appropriate for non-critical mounts because systemd treats those mounts as wanted rather than required and does not order them before the filesystem target.
- `NetworkManager-wait-online.service` timeout reduction with `nm-online -s -q --timeout=30` matches the documented `nm-online` options.
- The post's default timeout guidance matches systemd documentation: `DefaultTimeoutStartSec=` defaults to 90 seconds for the system manager.
