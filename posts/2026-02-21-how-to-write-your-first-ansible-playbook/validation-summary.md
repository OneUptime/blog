# Validation Summary: How to Write Your First Ansible Playbook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- YAML
- Ansible inventory
- Ansible modules: apt, copy, template, service, dnf
- Ansible handlers
- Ansible conditionals and facts
- Ansible loops
- Jinja2 variable syntax

## Sources Consulted
- Ansible playbooks documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.yum redirect documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible loops documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible YAML syntax documentation: https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html

## Issues Found
- The explanation of `become: yes` said it means tasks run with sudo privileges. Updated it to say privilege escalation, usually sudo, because Ansible supports multiple become methods even though sudo is the common default.
- The OS-specific conditional example used the top-level injected fact variable `ansible_os_family`. Updated it to `ansible_facts['os_family']`, matching current Ansible documentation and avoiding reliance on injected fact variables.
- The Red Hat/CentOS package example used the `yum` module. Updated it to `dnf` and changed the task label to "Red Hat-family systems" because current Ansible documentation lists `yum` as a redirect to `ansible.builtin.dnf`.

## Review Notes
- The loop example is technically valid. For package modules, passing a list of package names to `apt.name` can be more efficient than looping, but the example correctly demonstrates loop syntax for a beginner tutorial.
