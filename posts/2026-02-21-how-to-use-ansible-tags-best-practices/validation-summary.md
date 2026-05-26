# Validation Summary: How to Use Ansible Tags Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible tags
- Ansible roles, blocks, tasks, and handlers
- Ansible built-in modules: `apt`, `apt_repository`, `template`, `file`, `service`, `assert`, `command`
- `community.general.ufw`

## Sources Consulted
- Ansible tags documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- `ansible.builtin.assert` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- `community.general.ufw` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- Corrected the description of the `always` tag. The post originally said it runs regardless of tag selection; official documentation states it can be skipped explicitly with `--skip-tags always`, so the wording now includes that caveat.
- Corrected the handler tagging guidance. The post originally said handlers must be tagged or they will not run under tagged execution. Current Ansible documentation states handlers ignore tags and cannot be selected for or against; they run when notified by a changed task. The handler example and summary were updated accordingly.
- Clarified that `--tags` runs matching tagged tasks plus `always` tasks unless they are explicitly skipped.

## Review Notes
- The CLI examples for `--tags`, `--skip-tags`, and `--list-tags` match the official `ansible-playbook` options.
- The module examples use valid parameters according to current Ansible documentation. `community.general.ufw` is part of the `community.general` collection and is not included in `ansible-core`; users need that collection installed when using the example.
