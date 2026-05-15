# Validation Summary: How to Use systemd-nspawn for Lightweight Container Testing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL 9
- systemd-nspawn
- systemd.nspawn configuration files
- machinectl
- DNF installroot
- Linux namespaces and bind mounts

## Sources Consulted
- RHEL 9 systemd-nspawn man page: https://redhat-plumbers.github.io/systemd-rhel9/systemd-nspawn.html
- RHEL 9 systemd.nspawn man page: https://redhat-plumbers.github.io/systemd-rhel9/systemd.nspawn.html
- RHEL 9 machinectl man page: https://redhat-plumbers.github.io/systemd-rhel9/machinectl.html
- DNF Command Reference, installroot and releasever options: https://dnf.readthedocs.io/en/stable/command_ref.html
- Freedesktop systemd-nspawn manual: https://www.freedesktop.org/software/systemd/man/systemd-nspawn.html
- Freedesktop systemd.nspawn manual: https://www.freedesktop.org/software/systemd/man/systemd.nspawn.html
- Freedesktop machinectl manual: https://www.freedesktop.org/software/systemd/man/latest/machinectl.html

## Issues Found
- The root filesystem setup installed `basesystem`, `systemd`, and `dnf`, but did not install `passwd` or set a root password. Because the later `systemd-nspawn -b` and `machinectl login` examples use an interactive login prompt, this could leave readers unable to log in to the container. I added `passwd` to the DNF installroot command and added `sudo systemd-nspawn -D /var/lib/machines/testcontainer passwd root`, matching the systemd-nspawn documentation pattern of setting a root password before starting and logging into a machine.

## Review Notes
- The documented `systemd-nspawn`, `machinectl`, `.nspawn`, networking, bind mount, and DNF option syntax matches the consulted RHEL 9/systemd documentation.
- `--network-veth` creates a private network namespace with a veth pair, but automatic addressing and external connectivity depend on network configuration such as `systemd-networkd` running on the host and in the container.
- The `machinectl start` path uses the `systemd-nspawn@.service` template, whose defaults differ from direct interactive `systemd-nspawn` invocation, including boot and veth-related defaults documented in the RHEL 9 man pages.
