# Validation Summary: Using calicoctl node checksystem with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Linux kernel modules
- Linux sysctl settings
- Bash scripting
- Kubernetes node pre-flight validation

## Sources Consulted
- Calico Open Source `calicoctl node checksystem` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico Open Source system requirements: https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Calico Open Source Kubernetes IPv4/IPv6 host requirements: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Project Calico v3.32.0 `checksystem.go` source: https://github.com/projectcalico/calico/blob/v3.32.0/calicoctl/calicoctl/commands/node/checksystem.go
- Linux `modules-load.d(5)` manual page: https://www.man7.org/linux/man-pages/man5/modules-load.d.5.html
- Linux `sysctl.d(5)` manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html

## Issues Found
- The post claimed `calicoctl node checksystem` validates network capabilities and sysctl parameters. Official Calico documentation and the v3.32.0 source show that the command checks the kernel version and kernel module availability. Updated the description and introduction accordingly.
- The example output did not match the documented/current command behavior. Replaced the synthetic sysctl-oriented output with output shaped like the official command and source implementation, using `OK`, `FAIL`, and the documented warning style.
- The scripts counted `ERROR`, but `checksystem` reports missing required modules as `FAIL` and exits with an error. Updated the scripts to count `FAIL`.
- The shell examples used `grep -c ... || echo 0`, which can produce duplicate `0` output because `grep -c` prints `0` even when it exits with status 1. Changed these cases to `|| true`.
- The examples wrote to `/etc/modules-load.d/` and `/etc/sysctl.d/` with plain redirection after using `sudo` elsewhere. Updated them to use `sudo tee` so they work when run by a non-root user with sudo privileges.
- The sysctl example set `rp_filter = 1` as if it were a Calico requirement. Removed those settings because they are not part of the cited Calico checksystem behavior and can be deployment-sensitive.
- Expanded the module examples to include modules that are directly represented in the current `checksystem` implementation, such as `ip6_tables`, `xt_u32`, and `xt_addrtype`.

## Review Notes
- `checksystem` validates module availability, not the full operational readiness of a node. Operators should still validate host firewalls, NetworkManager behavior, forwarding sysctls, encapsulation mode, and kube-proxy/dataplane choices separately.
- The module names required by Calico can vary by kernel and distribution, and some dependencies may be built into the kernel rather than loadable modules. The examples now frame module loading as common remediation rather than an exhaustive universal list.
