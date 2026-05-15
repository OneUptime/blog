# Validation Summary: How to Make Kernel Parameter Changes Persistent Across Reboots on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel sysctl parameters
- systemd-sysctl
- sysctl.d configuration files
- procps sysctl
- Ansible ansible.posix.sysctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring kernel parameters at runtime": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-parameters-at-runtime_managing-monitoring-and-updating-the-kernel
- systemd sysctl.d manual: https://www.freedesktop.org/software/systemd/man/sysctl.d.html
- systemd-sysctl.service manual: https://www.freedesktop.org/software/systemd/man/253/systemd-sysctl.service.html
- procps sysctl(8) manual: https://man7.org/linux/man-pages/man8/sysctl.8.html
- procps sysctl.conf(5) manual: https://man7.org/linux/man-pages/man5/sysctl.conf.5.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Local system man pages for sysctl.d(5), sysctl.conf(5), systemd-sysctl.service(8), and sysctl --help output.

## Issues Found
- The original post described sysctl.d processing as a simple directory-by-directory order ending with `/etc/sysctl.conf`. Updated the explanation and diagram to match systemd sysctl.d precedence: same-named files in higher-priority directories override lower-priority copies, while different filenames are sorted lexicographically regardless of directory.
- The original "last value wins" example said `/etc/sysctl.d/` wins because it is processed after `/usr/lib/sysctl.d/`. Updated it to explain that the example wins because `90-memory-tuning.conf` sorts after `50-default.conf`, and noted same-filename directory precedence separately.
- The original post said `/etc/sysctl.conf` is processed last after all drop-in files by RHEL's boot-time systemd-sysctl path. Updated this to distinguish procps `sysctl --system`, which reads `/etc/sysctl.conf` last, from systemd-sysctl, which reads sysctl.d files at boot. The post now notes RHEL legacy compatibility without implying upstream systemd-sysctl reads `/etc/sysctl.conf` directly.
- The original command used `systemd-sysctl --cat-config`, but the documented systemd-sysctl executable path is `/usr/lib/systemd/systemd-sysctl`. Updated the command and made the unit name explicit as `systemd-sysctl.service`.
- The naming table said `99-*` overrides "always win." Updated this to "should sort late" because lexicographic filename ordering and same-filename precedence determine the effective result.

## Review Notes
The sysctl examples, file formats, `sysctl -p`, `sysctl --system`, and Ansible `ansible.posix.sysctl` usage are otherwise consistent with the consulted documentation. Future improvements could mention that some sysctl keys are module-dependent and may not exist when systemd-sysctl runs early in boot.
