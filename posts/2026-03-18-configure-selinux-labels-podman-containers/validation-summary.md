# Validation Summary: How to Configure SELinux Labels for Podman Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- SELinux
- Linux containers
- MCS/MLS labels
- Bind-mounted volumes

## Sources Consulted
- Podman official `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman official `--volume` option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Red Hat SELinux contexts documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/chap-security-enhanced_linux-selinux_contexts
- Red Hat MCS documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/assembly_using-multi-category-security-mcs-for-data-confidentiality_using-selinux
- Red Hat container SELinux policy documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/creating-selinux-policies-for-containers_using-selinux

## Issues Found
- The original custom process label example used `svirt_lxc_net_t` and stated that it allows network access. Podman's official documentation describes `label=type:TYPE` as setting the process type and notes that alternate types must exist in SELinux policy. I changed the example to a policy-defined custom type, `my_container.process`, and clarified that the policy must define it first.
- The shared-label example used `:z`, which applies a shared content label that all containers can read/write and therefore does not demonstrate matching MCS levels. I changed the mounts to `:Z` so the example aligns with the text about containers sharing resources through the same MCS level.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was validated against official Podman documentation rather than local `podman --help` output. The examples require a host with SELinux enabled and enforcing, plus an installed container SELinux policy that supports any custom process type used with `--security-opt label=type:`.
