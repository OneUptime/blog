# Validation Summary: How to Use Ansible become at Task Level vs Play Level

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible privilege escalation with `become`
- Ansible play, block, and task keywords
- Ansible built-in modules including `apt`, `service`, `systemd`, `file`, `git`, `pip`, `copy`, `template`, `command`, `uri`, `get_url`, `slurp`, and `lineinfile`
- YAML

## Sources Consulted
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: Controlling how Ansible behaves: precedence rules - https://docs.ansible.com/projects/ansible/13/reference_appendices/general_precedence.html
- Ansible Community Documentation: Playbook Keywords - https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Documentation: Blocks - https://docs.ansible.com/projects/ansible/7/playbook_guide/playbooks_blocks.html
- Ansible Community Documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: ansible.builtin.systemd module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible Community Documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community Documentation: ansible.builtin.template module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The original precedence diagram and explanation incorrectly implied that task-level `become` overrides inventory variables. Ansible connection variables such as `ansible_become` are variables and can override playbook keywords, including play-level and task-level `become`. Updated the diagram and explanation to distinguish playbook keyword specificity from connection variable precedence.
- The file ownership section stated too broadly that files created by Ansible modules are owned by the `become_user`. Updated it to specify new files and note that modules such as `copy` and `template` can preserve existing ownership when the destination already exists.

## Review Notes
The YAML snippets parse successfully. The module names and options used in the examples are current and valid according to the Ansible documentation consulted.
