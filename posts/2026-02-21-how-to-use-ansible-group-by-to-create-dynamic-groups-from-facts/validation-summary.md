# Validation Summary: How to Use Ansible group_by to Create Dynamic Groups from Facts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.group_by
- Ansible facts and inventory variables
- Ansible host patterns
- ansible.builtin.apt
- ansible.builtin.dnf
- community.general.modprobe
- Jinja templating in playbooks

## Sources Consulted
- Ansible `ansible.builtin.group_by` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_by_module.html
- Ansible patterns documentation for group intersections: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible `community.general.modprobe` module documentation: https://docs.ansible.com/ansible/6/collections/community/general/modprobe_module.html
- Ansible configuration documentation for invalid group character handling: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The kernel grouping example created groups using both the major and minor kernel version, such as `kernel_5_15`, but the code comment and task name described it as grouping by only the major version. Updated the comment and task name to say "major and minor kernel version."
- The follow-up play targeted `kernel_5_15` but its play name said "kernel 5.x hosts." Updated the play name to "kernel 5.15 hosts" so it matches the actual host pattern.

## Review Notes
The examples use top-level fact variables such as `ansible_os_family`, `ansible_kernel`, and `ansible_memtotal_mb`, which are available with Ansible's default fact injection behavior. Environments that disable fact injection would need to reference facts through `ansible_facts` instead.
