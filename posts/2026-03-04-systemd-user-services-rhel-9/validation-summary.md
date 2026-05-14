# Validation Summary: How to Create and Manage systemd User Services on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd user services
- systemctl
- loginctl lingering
- journalctl
- systemd timers
- systemd unit drop-ins
- systemd environment.d

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers", sections on user systemd services and lingering: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/building_running_and_managing_containers/con_understanding-the-ubi-micro-images_assembly_types-of-container-images
- systemd 252 systemd.unit(5): https://www.freedesktop.org/software/systemd/man/252/systemd.unit.html
- systemd 252 systemd.service(5): https://www.freedesktop.org/software/systemd/man/252/systemd.service.html
- systemd 252 systemd.timer(5): https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html
- systemd 252 journalctl(1): https://www.freedesktop.org/software/systemd/man/252/journalctl.html
- systemd 252 loginctl(1): https://www.freedesktop.org/software/systemd/man/252/loginctl.html
- Local systemd man pages for systemd.exec(5), environment.d(5), systemd.special(7), systemctl(1), loginctl(1), and journalctl(1)

## Issues Found
- The environment variable example wrote `~/.config/systemd/user/mydev.service.d/env.conf` without first creating the `mydev.service.d` drop-in directory. Added `mkdir -p ~/.config/systemd/user/mydev.service.d` so the command works on a fresh user account.
- The environment.d example wrote `~/.config/environment.d/mydev.conf` without first creating `~/.config/environment.d`. Added `mkdir -p ~/.config/environment.d` so the command works on a fresh user account.

## Review Notes
The post's core systemd claims and commands are correct for RHEL 9-era systemd: user units belong under `~/.config/systemd/user`, user services can be managed with `systemctl --user`, enabled user services are attached to `default.target`, user timers are enabled through `timers.target`, and `loginctl enable-linger` keeps a user manager running after logout and starts it at boot. `journalctl --user -u mydev.service` is valid because `journalctl` converts `--unit` filters to user-unit filters when `--user` is used.
