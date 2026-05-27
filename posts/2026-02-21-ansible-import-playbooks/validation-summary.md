# Validation Summary: How to Import Playbooks with import_playbook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.import_playbook`
- Ansible tags
- Ansible variables and conditionals
- `ansible-playbook` CLI
- Ansible `apt`, `template`, and `service` modules

## Sources Consulted
- Ansible `ansible.builtin.import_playbook` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible reusing artifacts guide: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible tags guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The conditional imports section said the `when` condition is evaluated against each host individually when the plays execute. Official `import_playbook` documentation says the import action itself ignores `when`; the conditional is inherited by the imported content. Updated the wording to explain that the playbook is still parsed and the condition applies to the imported plays and tasks at execution time.

## Review Notes
- The examples use short Ansible module names such as `apt`, `template`, and `service`. This remains valid for built-in modules, although Ansible documentation recommends FQCNs such as `ansible.builtin.apt` for clearer linking and to avoid collection name conflicts.
- I could not run `ansible-playbook --syntax-check` locally because `ansible-playbook` is not installed in this environment.
