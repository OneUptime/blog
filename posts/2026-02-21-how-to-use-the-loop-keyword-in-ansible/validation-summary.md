# Validation Summary: How to Use the loop Keyword in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `loop` keyword
- Ansible `loop_control`
- Jinja2 filters and `range`
- Ansible built-in modules: `apt`, `package`, `dnf`, `yum`, `user`, `file`, `command`, `debug`, `template`, `cron`, `service`
- `ansible.posix` modules: `firewalld`, `sysctl`

## Sources Consulted
- Ansible loop documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `dnf` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `yum` module redirect documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible `firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The introduction said `loop` replaced the older `with_*` syntax and should be used for all new playbooks. Current Ansible documentation says `loop` was added in Ansible 2.5 as a simpler loop mechanism, recommends it for most use cases, and explicitly says `with_<lookup>` is not deprecated. Updated the wording to match that.
- The firewalld example used `permanent: yes` without `immediate: yes` while describing opening firewall ports. Current `ansible.posix.firewalld` behavior applies permanent changes to permanent configuration; adding `immediate: yes` ensures the ports are also opened in the running firewall.
- The `range` explanation said `range` returns a generator. Updated it to describe `range` as returning an iterable range object.
- The summary said `loop` covers every iteration scenario. Updated this to "most iteration scenarios" to avoid overstating Ansible's recommendation.

## Review Notes
The remaining examples are consistent with current Ansible documentation. `with_*` syntax is still valid and not deprecated, but `loop` is the recommended approach for most modern playbook iteration patterns.
