# Validation Summary: How to Configure systemd Portable Services on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd portable services
- portablectl
- systemd unit files
- SquashFS images
- dnf

## Sources Consulted
- systemd portable services documentation: https://systemd.io/PORTABLE_SERVICES/
- portablectl upstream manual: https://www.freedesktop.org/software/systemd/man/portablectl.html
- systemd-portabled upstream manual: https://www.freedesktop.org/software/systemd/man/systemd-portabled.service.html
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- mksquashfs local manual page
- systemd.service local manual page

## Issues Found
- The post installed only `systemd-container` but used `mksquashfs`, which is provided by `squashfs-tools` on RHEL-family systems. Updated the install command to include `squashfs-tools`.
- The service image contained a shell script but did not include `/bin/bash`, `date`, `sleep`, or their runtime dependencies inside the image. Portable services run with `RootDirectory=` or `RootImage=` pointing at the image, so executable paths and interpreters must exist inside that filesystem. Added a `dnf --installroot` command to install `bash` and `coreutils` into the image.
- The post described the `mksquashfs` output as a raw disk image. `mksquashfs` creates a SquashFS filesystem image, not a raw disk image with a partition table. Updated the wording to say SquashFS image.
- The read-only SquashFS image did not create common overmount directories such as `/run`, `/tmp`, and `/var/tmp`. systemd portable service guidance notes that these paths must already exist in read-only images. Added directory creation for those paths.
- The command `portablectl inspect myservice.raw --cat` placed the `--cat` option after the command arguments. Updated it to `portablectl --cat inspect myservice.raw`, matching the documented `portablectl [OPTIONS...] COMMAND [NAME...]` syntax.
- The comment for `portablectl is-attached` said it checked image integrity. The command reports whether an image is attached. Updated the comment accordingly.

## Review Notes
The tutorial is technically relevant and accurate after the fixes. In a production portable service image, the dependency set should be generated reproducibly as part of a build process rather than by an ad hoc installroot command.
