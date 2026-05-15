# Validation Summary: How to Run Rootless Pods with SELinux Confinement on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Rootless containers and pods
- SELinux container confinement
- SELinux MCS labels
- SELinux booleans and policy modules

## Sources Consulted
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `--security-opt` documentation: https://docs.podman.io/en/v4.6.0/markdown/options/security-opt.html
- Podman `podman-create` volume labeling documentation: https://docs.podman.io/en/stable/markdown/podman-create.1.html
- Red Hat Enterprise Linux 9 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `container_selinux(8)` policy man page: https://www.mankier.com/8/container_selinux

## Issues Found
- The custom SELinux label example used `label=type:svirt_sandbox_file_t`, which is a file type rather than an appropriate process label override. Changed the example to override the MCS level with `label=level:s0:c100,c200`, which matches Podman's documented `--security-opt label=level:LEVEL` behavior.
- The volume labeling explanation treated `:Z` as private to one container in all cases. Updated it to note that containers in the same pod share the pod SELinux label, so a `:Z` volume mounted by one container in the pod can be used by other containers in that pod.
- The MCS explanation implied that labels alone always ensure isolation. Clarified that MCS labels enforce isolation between containers with different MCS labels.
- The custom policy section recommended generating policy directly from denials without review and did not mention RHEL 9's `udica` workflow. Added a note that RHEL 9 provides `udica` for custom container policies and added an `audit2allow -w` review step before module generation.
- The SELinux boolean descriptions were inaccurate. `container_connect_any` allows container domains to connect to any TCP port, not to use host networking, and `container_manage_cgroup` allows cgroup management, not management of all files. Updated both comments.

## Review Notes
The commands are otherwise plausible for RHEL 9 systems with Podman installed and SELinux enforcing. `podman` was not installed in the local workspace, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
