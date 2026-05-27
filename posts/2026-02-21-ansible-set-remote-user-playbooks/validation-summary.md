# Validation Summary: How to Set the Remote User in Ansible Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible inventory
- Ansible configuration (`ansible.cfg`)
- SSH authentication
- Ansible privilege escalation (`become`)
- Ansible CLI (`ansible-playbook`)

## Sources Consulted
- Ansible Community Documentation: Controlling how Ansible behaves: precedence rules - https://docs.ansible.com/projects/ansible/13/reference_appendices/general_precedence.html
- Ansible Community Documentation: Ansible Configuration Settings (`DEFAULT_REMOTE_USER`) - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Core Documentation: Ansible playbooks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_intro.html
- Ansible Community Documentation: Playbook Keywords (`remote_user`, `become`, `become_user`) - https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Community Documentation: `ansible-playbook` CLI options - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Connection methods and details - https://docs.ansible.com/ansible/3/user_guide/connection_details.html
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: `ansible.builtin.command` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Core Documentation: `ansible.builtin.shell` module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html

## Issues Found
- The task-level backup example used `command: pg_dump myapp > /var/backups/myapp.sql`. The `command` module does not process shell metacharacters such as `>`, so the example would not redirect output as described. Changed it to `shell: pg_dump myapp > /var/backups/myapp.sql`.
- The precedence chart incorrectly said task-level `remote_user` had the highest precedence over inventory variables. Official Ansible precedence rules place variables above playbook keywords, and `ansible_user` is a connection variable. Updated the chart and explanation so inventory `ansible_user` overrides play/task `remote_user`, while task-level `remote_user` still overrides play-level `remote_user` within the playbook keyword category.
- The command-line override section incorrectly said `-u` / `--user` overrides all other settings except task-level `remote_user`. Official Ansible docs state command-line options override configuration settings but do not override playbook keywords or variables. Updated the text to clarify that `-u` overrides configuration defaults, and `-e ansible_user=...` is needed to override variables from the command line.

## Review Notes
- The examples use short module names such as `apt`, `service`, `copy`, `debug`, `shell`, and `ios_command`. Current Ansible documentation recommends fully qualified collection names for Ansible 2.10 and later, but short names remain commonly supported when the relevant collections are available.
- The development example includes `ansible_become_pass: vagrant` in plaintext. This is acceptable as a local Vagrant-style example, but production secrets should be encrypted with Ansible Vault or supplied by another secret-management mechanism.
