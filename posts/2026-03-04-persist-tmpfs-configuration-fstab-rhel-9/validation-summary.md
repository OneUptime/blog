# Validation Summary: How to Persist tmpfs Configuration Across Reboots in /etc/fstab on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux tmpfs
- `/etc/fstab`
- util-linux `mount`
- systemd mount units
- systemd service dependencies

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Persistently mounting file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Mounting the SSSD cache in tmpfs": https://docs.redhat.com/fr/documentation/red_hat_enterprise_linux/9/html/tuning_performance_in_identity_management/mounting-the-sssd-cache-in-tmpfs_assembly_tuning-sssd-performance-for-large-idm-ad-trust-deployments
- Linux `tmpfs(5)` manual page: https://man7.org/linux/man-pages/man5/tmpfs.5.html
- Linux `fstab(5)` manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux `mount(8)` manual page: https://man7.org/linux/man-pages/man8/mount.8.html
- systemd `systemd.mount(5)` manual page: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- Local system manual pages for `fstab(5)`, `tmpfs(5)`, `mount(8)`, `systemd.mount(5)`, `systemd.unit(5)`, and `systemd-fstab-generator(8)`

## Issues Found
- The post said the fstab device/source field is always `tmpfs`. For filesystems without backing storage, `fstab(5)` allows any source string, with `tmpfs` being a typical convention. Updated the statement to say `tmpfs` is usually used for clarity.
- The fstab editing step did not reload systemd's generated mount units. Red Hat's RHEL 9 documentation recommends `systemctl daemon-reload` after modifying `/etc/fstab`. Added that command after the fstab entry is appended.
- The explicit `.mount` unit used `After=local-fs.target`. Local mount units already receive default ordering before `local-fs.target`; ordering the mount after the same target can create incorrect boot ordering. Removed that line and left the default local mount ordering in place.

## Review Notes
The remaining examples use valid tmpfs, fstab, and systemd syntax. The `/dev/shm` example is technically valid, but changing `/dev/shm` policy can affect applications that rely on POSIX shared memory, so it should be tested in the target environment.
