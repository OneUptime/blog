# Validation Summary: How to Fix cgroup v1 vs v2 Issues with Podman

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Linux cgroups v1 and v2
- systemd cgroup delegation
- containers.conf
- crun and runc OCI runtimes
- GRUB and kernel command-line parameters

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman command documentation for cgroup manager behavior: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman run` documentation for resource limit flags: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux `cgroups(7)` manual page: https://man7.org/linux/man-pages/man7/cgroups.7.html
- systemd resource-control documentation for `Delegate=`: https://www.freedesktop.org/software/systemd/man/251/systemd.resource-control.html
- systemd kernel command-line documentation for cgroup hierarchy parameters: https://www.freedesktop.org/software/systemd/man/247/systemd.html
- systemd latest kernel command-line documentation noting deprecation of legacy hierarchy parameters: https://www.freedesktop.org/software/systemd/man/latest/kernel-command-line.html
- Red Hat RHEL 9 adoption notes for cgroup v2 and crun defaults: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/considerations_in_adopting_rhel_9/
- SUSE rootless Podman documentation for cgroup v2 recommendation and delegation caveats: https://documentation.suse.com/en-us/smart/container/html/rootless-podman/rootless-podman.html

## Issues Found
- The `sudo cat > /etc/systemd/system/user@.service.d/delegate.conf` command would not reliably write the file as root because shell redirection happens before `sudo`. Changed it to a `sudo tee` pipeline.
- The cgroup detection text treated any `cgroup2` mount as pure cgroup v2 and treated `stat -fc %T /sys/fs/cgroup` output of `tmpfs` as only cgroup v1. Updated it to distinguish unified v2 from legacy or hybrid hierarchies.
- The user-session controller check used `/sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.controllers`. Updated it to check the delegated `user@UID.service` cgroup path used by systemd user sessions.
- The cgroup v1 switch command used only `systemd.unified_cgroup_hierarchy=0`, which may select hybrid rather than full legacy mode. Added `systemd.legacy_systemd_cgroup_controller=1` for the full legacy example.
- The hybrid-mode explanation did not clarify the systemd parameter interaction. Updated it to describe disabling unified hierarchy while keeping systemd off the legacy cgroup controller.
- The distribution notes overstated runtime defaults across Fedora and RHEL and omitted rootless cgroup limitations on cgroup v1. Tightened the wording for RHEL 9, Fedora, RHEL 8, and CentOS 7.

## Review Notes
The legacy systemd kernel parameters discussed in the post are deprecated in newer systemd documentation, but they are still relevant for systems that support switching between unified, hybrid, and legacy cgroup hierarchies. Future revisions should prefer cgroup v2 where possible and frame cgroup v1 as a compatibility fallback.
