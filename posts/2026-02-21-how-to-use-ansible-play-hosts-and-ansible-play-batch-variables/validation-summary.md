# Validation Summary: How to Use Ansible play_hosts and ansible_play_batch Variables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible magic/special variables
- Ansible rolling updates with `serial`
- Ansible built-in modules: `debug`, `uri`, `copy`, `systemd`, `template`, `set_fact`, `script`, `fail`
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible Special Variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible facts and magic variables guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible playbook execution strategies and `serial` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible Playbook Keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- `ansible.builtin.script` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.systemd_service` / `ansible.builtin.systemd` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The post incorrectly stated that `ansible_play_hosts` is also available as `play_hosts`. Official Ansible documentation marks `play_hosts` as deprecated and equivalent to `ansible_play_batch`, not `ansible_play_hosts`. Updated the introduction to describe this correctly.
- The batch-position example divided by the current `ansible_play_batch | length`, which can miscount `total_batches` on the final partial batch. Updated the example to use a fixed `serial_size` matching `serial: 3` and compare the current batch against `ansible_play_hosts_all`.

## Review Notes
The Ansible examples use valid YAML syntax. Native `ansible-playbook --syntax-check` could not be run because `ansible-playbook` is not installed in this workspace.
