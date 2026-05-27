# Validation Summary: How to Use Ansible to Manage Kernel Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.general.modprobe
- ansible.posix.sysctl
- Linux kernel modules
- modprobe and modprobe.d
- modules-load.d
- lsmod and modinfo
- Kubernetes Linux node prerequisites

## Sources Consulted
- Ansible community.general.modprobe module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/modprobe_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Linux modules-load.d(5) manual page: https://man7.org/linux/man-pages/man5/modules-load.d.5.html
- Linux modprobe.d(5) manual page: https://man7.org/linux/man-pages/man5/modprobe.d.5.html
- Linux modprobe(8) manual page: https://man7.org/linux/man-pages/man8/modprobe.8.html
- Linux kernel nf_conntrack sysctl documentation: https://www.kernel.org/doc/html/v5.10/networking/nf_conntrack-sysctl.html

## Issues Found
- Clarified that `modinfo` shows available module parameters, not necessarily current runtime parameter values.
- Updated `lsmod` verification snippets to normalize hyphens to underscores before matching module names. The `modprobe` tooling treats `-` and `_` interchangeably, but `lsmod` displays names with underscores, so checks such as `usb-storage` could be missed.
- Removed the empty `tcp_bbr` module options example because the generated `/etc/modprobe.d/` content skipped entries with empty options, so that item did not configure anything.
- Replaced the `ansible_loaded_modules` condition with an `ansible.builtin.stat` check for `/sys/module/nf_conntrack/parameters/hashsize`. `ansible_loaded_modules` is not a standard gathered fact in Ansible, so the runtime hashsize task would not run as intended.

## Review Notes
- The examples use `community.general.modprobe` and `ansible.posix.sysctl`, which are collection modules and may need their collections installed when using `ansible-core` alone.
- The `install <module> /bin/true` pattern is technically valid for blocking explicit `modprobe` insertion, but the `modprobe.d(5)` manual notes the long-term future of the `install` command as a dependency workaround is not assured. It remains commonly used for hardening baselines.
