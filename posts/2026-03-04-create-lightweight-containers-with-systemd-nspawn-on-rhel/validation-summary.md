# Validation Summary: How to Create Lightweight Containers with systemd-nspawn on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-nspawn
- systemd-container and machinectl
- DNF installroot package bootstrapping
- Linux bind mounts and tmpfs mounts

## Sources Consulted
- systemd-nspawn manual page: https://www.freedesktop.org/software/systemd/man/systemd-nspawn.html
- systemd-nspawn Linux manual page mirror: https://man7.org/linux/man-pages/man1/systemd-nspawn.1.html
- Red Hat Enterprise Linux 9 Managing software with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Customer Portal note on systemd-nspawn availability: https://access.redhat.com/solutions/1533893

## Issues Found
- The minimal installroot package list did not explicitly install the `passwd` package, but the next section instructs the reader to run `passwd` inside the container. Added `passwd` to the `dnf install` command so the command is available.
- The read-only root example described `--read-only` plus `--tmpfs=/var --tmpfs=/tmp` as a writable tmpfs overlay. The systemd-nspawn manual describes `--read-only` as mounting the root filesystem read-only, while `--tmpfs=` mounts tmpfs only at the specified paths. Updated the comment to say it creates writable tmpfs mounts for `/var` and `/tmp`.

## Review Notes
The remaining systemd-nspawn flags and DNF command structure are valid for the stated RHEL 9 context, assuming the host has appropriate RHEL repositories/subscriptions enabled. Red Hat's primary container documentation focuses on Podman for OCI containers; this post is still technically relevant as a lightweight systemd-nspawn tutorial.
