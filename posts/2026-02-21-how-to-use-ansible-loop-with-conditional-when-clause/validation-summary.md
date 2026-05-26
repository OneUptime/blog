# Validation Summary: How to Use Ansible loop with Conditional when Clause

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loop keyword
- Ansible when conditionals
- Jinja2 filters and expressions in Ansible
- Ansible built-in modules: apt, package, template, user, systemd, lineinfile, service
- ansible.posix.sysctl collection module

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.systemd module redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- Updated the OS-family condition from `ansible_os_family` to `ansible_facts['os_family']`, matching the current Ansible documentation's recommended fact access style.
- Corrected wording that said a variable can control whether Ansible loops at all. With `when` on a looped task, Ansible evaluates the condition separately for each loop item, so a false feature flag skips each iteration rather than avoiding loop evaluation entirely.
- Softened the statement that `when` is necessary whenever external variables or facts are involved. Pre-filtering can sometimes use external variables too; `when` is often clearer when runtime facts are involved or when skipped-item visibility is desired.
- Adjusted the comparison guidance so pre-filtering is recommended when the condition can be expressed cleanly as a list filter, not only when it depends on item properties.

## Review Notes
- The `ansible.posix.sysctl` example uses a collection module that is not part of `ansible-core`; it is commonly available with the full `ansible` package, but users of `ansible-core` may need to install the `ansible.posix` collection separately.
- The package-installation examples loop over package modules to demonstrate per-item conditionals. For unconditional package lists, Ansible documentation recommends passing a list directly to package modules when supported.
