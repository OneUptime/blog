# Validation Summary: How to Fix SELinux Denials with Podman Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- SELinux
- Linux containers
- SELinux labels, contexts, booleans, and policy modules
- Linux audit tools

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-volume-create` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- SELinux `container_selinux` manual page: https://www.mankier.com/8/container_selinux
- Red Hat SELinux states and modes documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-introduction-selinux_modes
- Red Hat SELinux file context documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/selinux_users_and_administrators_guide/index
- Red Hat Developer guidance on systemd in containers and `container_manage_cgroup`: https://developers.redhat.com/blog/2019/04/24/how-to-run-systemd-in-a-container
- Local `chcon` help/man page output for `-R` and `-t` options

## Issues Found
- The `container_manage_cgroup` boolean was described as allowing containers to manage all files on the system. This is incorrect; it allows container processes to manage cgroups and is commonly needed when running systemd in a container. Updated the description accordingly.
- The `--security-opt label=type:` example used `svirt_lxc_net_t`, which is not the type shown in current Podman documentation and may not exist on modern systems. Updated the example to `svirt_apache_t` and added that the selected type must be defined by SELinux policy.

## Review Notes
The remaining commands and explanations are consistent with current Podman and SELinux documentation. The post correctly warns against broad relabeling of system directories, recommends persistent labeling with `semanage fcontext` plus `restorecon`, and treats `--security-opt label=disable` as a per-container fallback rather than a preferred fix.
