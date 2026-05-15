# Validation Summary: How to Boot a Full RHEL System Inside systemd-nspawn

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-nspawn
- systemd machinectl
- systemd.nspawn configuration files
- DNF installroot usage
- systemd service management and journald

## Sources Consulted
- systemd-nspawn(1), official upstream manual via man7.org: https://man7.org/linux/man-pages/man1/systemd-nspawn.1.html
- systemd.nspawn(5), official upstream manual via man7.org: https://www.man7.org/linux/man-pages/man5/systemd.nspawn.5.html
- machinectl(1), official systemd manual: https://www.freedesktop.org/software/systemd/man/latest/machinectl.html
- DNF Command Reference, official DNF documentation: https://dnf.readthedocs.io/en/stable/command_ref.html
- Red Hat Enterprise Linux 9 package manifest: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- Red Hat Enterprise Linux container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/index.htm

## Issues Found
- The service-management example uses `systemctl enable --now chronyd`, but the container package installation command did not install the `chrony` package that provides the `chronyd` service. I added `chrony` to the installroot package list so the example works in a clean RHEL 9 root tree.

## Review Notes
- The `systemd-nspawn -bD` boot command, `[Exec] Boot=yes`, `[Network] VirtualEthernet=yes`, `[Files] Bind=...`, `machinectl start`, `machinectl login`, `machinectl poweroff`, and `machinectl enable` usage match the documented systemd interfaces.
- The DNF `--installroot` and `--releasever=9` usage is consistent with DNF documentation for creating a new install root. A real RHEL host still needs appropriate enabled repositories and subscription access for the package transaction to succeed.
- Red Hat's current RHEL container documentation primarily focuses on Podman and Quadlet rather than systemd-nspawn for production container workflows, but systemd-nspawn remains technically valid for local system-container testing.
