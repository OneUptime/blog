# Validation Summary: How to Write Custom udev Rules for Automatic Device Configuration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- udev and systemd-udevd
- udev rules
- udevadm
- systemd device and service units
- Linux block, USB, TTY, and network devices

## Sources Consulted
- udev(7), local systemd manual page and upstream documentation: https://www.freedesktop.org/software/systemd/man/udev.html
- udevadm(8), local systemd manual page and Linux man-pages: https://man7.org/linux/man-pages/man8/udevadm.8.html
- systemd.device(5), local systemd manual page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.device.html
- systemd.service(5), local systemd manual page and upstream documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Red Hat Enterprise Linux storage documentation on udev rule locations and precedence: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_storage_devices/index

## Issues Found
- The introduction described udev as "the device manager for the Linux kernel." udev is user-space device management that receives kernel uevents, so the wording was updated to describe udev as the device manager for Linux systems.
- The introduction said custom rules can rename devices. udev cannot rename general device nodes; it can create symlinks, and `NAME` is for network interfaces. The wording was updated to say "creating persistent symlinks" and "renaming network interfaces."
- The rules directory explanation omitted `/run/udev/rules.d/`, which is part of the documented rules search path. The directory list was updated to include runtime rules.
- The reload command used `udevadm control --reload-rules`. The current documented option is `udevadm control --reload`, so the command was updated.
- The syntax reference listed `NAME` as a general assignment key without qualification. It was clarified as network-interface-only.

## Review Notes
The examples are otherwise consistent with udev and systemd behavior. The systemd-triggered backup example correctly avoids doing mount and backup work directly in a udev `RUN` rule, which is important because long-running tasks and filesystem mounts are not allowed inside udev rules under systemd-udevd's sandbox.
