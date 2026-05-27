# Validation Summary: How to Use Ansible to Configure SELinux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- SELinux
- RHEL and CentOS-family Linux
- Ansible POSIX collection
- Ansible Community General collection
- SELinux audit and policy tooling

## Sources Consulted
- Ansible `ansible.posix.selinux` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible `ansible.posix.seboolean` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible `community.general.sefcontext` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/sefcontext_module.html
- Ansible `community.general.seport` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/seport_module.html
- Ansible `ansible.builtin.reboot` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible `ansible.builtin.pause` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Red Hat Enterprise Linux 8 Using SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux

## Issues Found
- The package list used `libselinux-python3`, which is not the standard RHEL-family package name. Changed it to `python3-libselinux` and added `python3-libsemanage`, `audit`, and `checkpolicy` so the shown boolean, audit, and policy-module examples have their required tooling.
- Boolean persistence examples used YAML `yes` values and the `seboolean` default used the string `'yes'`. Updated them to boolean `true` to match the current Ansible module parameter type.
- Custom SELinux port variables used integers, while `community.general.seport` documents `ports` as string/list elements. Quoted the port values so the variables match the module contract.
- The custom policy example assumed a `node_t` SELinux domain. Reworked it to use a configurable application domain because the correct domain depends on how the service is labeled on the target system.
- Audit examples used `ausearch -m avc --start recent`. Updated them to the Red Hat-documented `ausearch -m AVC -ts recent` form.
- The troubleshooting task described `getsebool -a` output as "non-default booleans" even though the filter only shows enabled booleans. Renamed the task to avoid the incorrect claim.

## Review Notes
The post is technically valid after the fixes. Future improvements could mention installing the required Ansible collections explicitly, but the module FQCNs and examples are current.
