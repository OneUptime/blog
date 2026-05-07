# Validation Summary: How to Pass USB Devices to Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux USB device files
- Linux device cgroups
- udev and udevadm
- SELinux container booleans
- Arduino CLI
- Python pySerial
- Linux block devices and mount capabilities

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume and mount option documentation in `podman-run`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Linux kernel USB host-side API documentation: https://www.kernel.org/doc/html/latest/driver-api/usb/usb.html
- Linux kernel allocated device numbers documentation: https://www.kernel.org/doc/html/latest/admin-guide/devices.html
- systemd udev rules documentation: https://www.freedesktop.org/software/systemd/man/udev.html
- systemd udevadm documentation: https://www.freedesktop.org/software/systemd/man/latest/udevadm.html
- Arduino CLI upload command documentation: https://arduino.github.io/arduino-cli/1.2/commands/arduino-cli_upload/
- Arduino CLI getting started documentation: https://docs.arduino.cc/arduino-cli/getting-started/
- pySerial short introduction and API behavior: https://pyserial.readthedocs.io/en/stable/shortintro.html

## Issues Found
- The broader `/dev/bus/usb` example used `--device /dev/bus/usb:/dev/bus/usb` for a directory. I changed it to bind-mount `/dev/bus/usb` with the `dev` mount option and added `--device-cgroup-rule='c 189:* rwm'` so raw USB bus character devices are allowed.
- The hot-plug USB bus example used `--device /dev/bus/usb:/dev/bus/usb` and ran `lsusb` inside `fedora:latest`. I changed it to a bind mount with `rw,rslave,dev` and replaced `lsusb` with `find /dev/bus/usb -type c`, avoiding an undeclared dependency on `usbutils`.
- The dynamic `/dev` hot-plug example bind-mounted `/dev` without device-capable mount options. I changed the mount to `-v /dev:/dev:rw,rslave,dev` so the device nodes exposed by the bind mount can actually be used with the cgroup rules.

## Review Notes
Podman was not installed in the local validation environment, so Podman-specific behavior was checked against current official Podman documentation rather than local command execution. The examples remain Linux-specific and assume the user has the relevant host devices, groups, SELinux policy tools, and kernel drivers available.
