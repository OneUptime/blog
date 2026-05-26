# Validation Summary: How to Use the ansible_facts Dictionary in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible_facts
- ansible.builtin.setup
- ansible.builtin.gather_facts
- ansible.builtin.debug
- ansible.builtin.apt
- ansible.builtin.dnf
- community.general.apk
- Jinja2 templates

## Sources Consulted
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- ansible.builtin.gather_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- ansible.builtin.yum redirect documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- community.general.apk module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/apk_module.html

## Issues Found
- The introduction said Ansible runs the setup module every time it connects to a managed host. This was changed to say Ansible usually gathers facts at the start of a play, matching Ansible's default play-level fact gathering behavior.
- The facts access section implied top-level `ansible_` fact variables are always available. This was changed to note that they are available by default, because Ansible documents that this behavior can be disabled with `INJECT_FACTS_AS_VARS`.
- The RHEL/CentOS package example used `ansible.builtin.yum`. Current Ansible documentation redirects `ansible.builtin.yum` to `ansible.builtin.dnf`, so the example was updated to use `ansible.builtin.dnf` directly.
- The first nested network-interface example built strings with `regex_replace`, used `item.key` and `item.value` on string loop items, and was disabled with `when: false`. It was replaced with a runnable loop over `ansible_facts['interfaces']` that safely checks for each interface's IPv4 fact before reading the address.
- The setup `filter` section said `filter` collects only specific facts and speeds up execution. Ansible documents `filter` as returning only matching first-level facts, while `gather_subset` controls fact collection scope. The wording and example comment were corrected.

## Review Notes
The post is now technically accurate for current Ansible documentation. The examples still assume common Linux fact keys such as `default_ipv4`, `mounts`, and `processor_vcpus` are present; in real inventories, playbooks may need additional `default` filters or guards for minimal containers, unusual network setups, or explicitly restricted fact gathering.
