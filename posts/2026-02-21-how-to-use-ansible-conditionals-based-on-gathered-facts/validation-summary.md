# Validation Summary: How to Use Ansible Conditionals Based on Gathered Facts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible gathered facts
- Ansible `when` conditionals
- Ansible built-in modules: `setup`, `apt`, `dnf`, `template`, `lineinfile`, `set_fact`, `get_url`, `sysctl`, `debug`, `fail`, `include_role`, `copy`
- Jinja tests and filters used by Ansible conditionals
- Linux package management, networking, disk, CPU, memory, architecture, and virtualization facts

## Sources Consulted
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible tests documentation, including `match` and `version`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- `community.general.zypper` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_module.html

## Issues Found
- The RedHat/CentOS package example used `ansible.builtin.yum`. Current Ansible documentation describes `ansible.builtin.yum` as syntax compatibility for `ansible.builtin.dnf`, and notes that the YUM backend was removed in ansible-core 2.17. Changed the example to use `ansible.builtin.dnf`.
- The Ubuntu version example described older Ubuntu handling as "legacy init" while still writing a systemd unit file. Changed the wording to "older systemd config" and adjusted the surrounding sentence to reference supported systemd features instead of config file locations.

## Review Notes
- YAML code fences were parsed successfully for syntax.
- The local environment did not have `ansible` or `ansible-doc` installed, so CLI/module verification was done against official Ansible documentation.
- The post uses top-level fact variables such as `ansible_distribution` and `ansible_memtotal_mb`, which are still available by default, but Ansible also documents access through the `ansible_facts` dictionary. Installations with `INJECT_FACTS_AS_VARS` disabled would need the dictionary form.
