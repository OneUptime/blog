# Validation Summary: How to Use Ansible to Configure Kernel Parameters (sysctl)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.sysctl
- Linux sysctl
- Linux networking kernel parameters
- Linux VM and memory kernel parameters
- Transparent Huge Pages
- systemd service units

## Sources Consulted
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible conditionals and loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v5.10/networking/ip-sysctl.html
- Linux kernel VM sysctl documentation: https://kernel.org/doc/html/v6.18/admin-guide/sysctl/vm.html
- Linux kernel Transparent Hugepage documentation: https://docs.kernel.org/admin-guide/mm/transhuge.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The network tuning example described `net.ipv4.tcp_fin_timeout` as a faster `TIME_WAIT` timeout. Linux documents this setting as the timeout for orphaned sockets in `FIN-WAIT-2`, so the comment was corrected to avoid confusing it with `TIME_WAIT`.
- The memory tuning example implied `vm.nr_hugepages` controls Transparent Huge Pages. Linux documents `vm.nr_hugepages` as the persistent HugeTLB pool size, while THP is controlled through `/sys/kernel/mm/transparent_hugepage/`, so the comment was corrected.
- The THP systemd task used `ansible.builtin.systemd`. Ansible documents this as a backward-compatible alias renamed to `ansible.builtin.systemd_service`, so the example now uses the current FQCN.
- The role profile and validation examples used `sysctl_params | dict2items` in loop expressions while also saying the variable may be undefined. Ansible documents using `default` for undefined loop variables, so those loops now use `sysctl_params | default({}) | dict2items`, and the validation assert loop defaults `sysctl_check.results` to an empty list.

## Review Notes
The remaining sysctl values are example tuning choices rather than universal recommendations. They are syntactically valid, but production values should still be benchmarked and adjusted per Linux version, workload, memory size, and network role.
