# Validation Summary: Troubleshooting Errors in calicoctl node checksystem

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Linux kernel modules
- Linux sysctl networking parameters
- Kubernetes kube-proxy IPVS mode
- Ubuntu, Debian, RHEL, CentOS, Rocky Linux, Flatcar, and Bottlerocket

## Sources Consulted
- Calico documentation: `calicoctl node checksystem` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico documentation: Kubernetes system requirements and kernel dependencies: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: `calicoctl node` command overview: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Project Calico source: `calicoctl/calicoctl/commands/node/checksystem.go`: https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/node/checksystem.go
- Linux kernel documentation: IPv4 sysctl `rp_filter`: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- systemd documentation: `modules-load.d`: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Ubuntu package index: `linux-modules-extra-*` package naming: https://packages.ubuntu.com/
- Red Hat documentation: `kernel-modules-extra` package behavior: https://access.redhat.com/articles/3760101
- Flatcar documentation: kernel modules and `/etc/modules-load.d`: https://www.flatcar.org/docs/latest/setup/customization/other-settings/
- Bottlerocket documentation: bootstrap containers: https://bottlerocket.dev/en/os/1.57.x/concepts/bootstrap-containers/

## Issues Found
- The post stated that `calicoctl node checksystem` reports sysctl errors. Current Calico documentation and source show that this command checks kernel version and kernel modules, not sysctl settings. I changed the introduction and sysctl section to describe those settings as related node preparation checks instead.
- The kernel version example claimed `checksystem` fails kernel 3.10 because Calico requires 5.10+. Current Calico system requirements do require Linux 5.10 or later, but `checksystem` itself uses a built-in minimum of 2.6.24. I updated the example and explanation to distinguish the command's built-in check from Calico's current supported node requirements.
- Several module examples used names that do not match current `checksystem` output or source checks, including `nf_conntrack` and `ip_vs`. I updated the examples to use `xt_conntrack`, `nf_conntrack_netlink`, and `ipt_ipvs` where appropriate.
- The reverse path filtering section said `rp_filter=2` should be changed to `1`. Linux documents `0` as disabled, `1` as strict, and `2` as loose, and strict RPF can be problematic with asymmetric or tunneled traffic. I corrected the explanation and commands to disable strict RPF when troubleshooting those cases.
- The Ubuntu/Debian kernel package command used Ubuntu-specific `linux-generic` for both distributions. I scoped the command to Ubuntu and noted that Debian users should install or upgrade the appropriate `linux-image-*` package.
- The module loading lists included module names that are not reliable direct `modprobe` targets on current kernels, such as `xt_rpfilter`. I removed that from the direct loading examples and kept the load list focused on practical module names and aliases.

## Review Notes
The script remains a broad troubleshooting aid rather than a universal production bootstrap. Some modules are optional depending on the selected Calico dataplane and encapsulation mode, and some minimal or immutable operating systems require OS-specific bootstrapping rather than package installation.
