# Validation Summary: How to Configure systemd Portable Services for Isolated Workloads on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd portable services
- portablectl
- systemd unit files
- SquashFS filesystem images
- dnf

## Sources Consulted
- systemd portable services documentation: https://systemd.io/PORTABLE_SERVICES/
- portablectl upstream manual: https://www.freedesktop.org/software/systemd/man/portablectl.html
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9.2 release notes for systemd 252: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/new-features
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Local `mksquashfs(1)` manual page
- Local `systemd.service(5)` and `systemd.exec(5)` manual pages

## Issues Found
- The prerequisites named a `systemd-portable` package, but RHEL package documentation lists `systemd-container`, and the install step already used that package. Updated the prerequisite to `systemd-container`.
- The tutorial used `mksquashfs` but did not install the tool that provides it. Updated the install command and prerequisites to include `squashfs-tools`.
- The SquashFS image omitted required placeholder files and directories that systemd portable service guidance says must exist in read-only images for host overmounts, including `/etc/resolv.conf`, `/etc/machine-id`, `/proc`, `/sys`, `/dev`, `/run`, `/tmp`, and `/var/tmp`. Added commands to create them.
- The `portablectl attach`, `detach`, and profile examples referenced `myportable_1.0.raw` without a slash. The `portablectl` manual states that names without a slash are resolved through portable image search paths; local files should be referenced with `./`. Updated the commands to use `./myportable_1.0.raw`.

## Review Notes
The tutorial is technically relevant and accurate after the fixes. The example assumes `/path/to/myapp` is a self-contained executable or that its runtime dependencies are included in the image; a production image should build the full application dependency tree reproducibly.
