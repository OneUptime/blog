# Validation Summary: How to Fix 'Privilege Escalation' become Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible playbooks and inventory variables
- Ansible configuration (`ansible.cfg`)
- sudo, sudoers, and `requiretty`
- Ansible Vault
- Linux package management through Ansible modules

## Sources Consulted
- Ansible privilege escalation guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible POSIX shell plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sh_shell.html
- Ansible package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html

## Issues Found
- The post stated that pipelining requires NOPASSWD sudo and presented pipelining as a fix for `sudo: no tty present`. Ansible documents that pipelining can conflict with `become` when sudo requires `requiretty`; the target should disable `requiretty` before enabling pipelining. I changed this section to recommend checking/disabling pipelining until `requiretty` is fixed.
- The temporary-file permissions section described the cause too broadly and gave a `0700` temp directory task as an ACL fix. Ansible documents this issue primarily for unprivileged-to-unprivileged become flows and recommends secure sharing mechanisms such as POSIX ACL support. I clarified the cause and replaced the incorrect directory task with a task that installs the `acl` package so Ansible can use `setfacl`.

## Review Notes
The remaining commands, playbook keywords, inventory variables, become methods, Vault usage, and `ansible.cfg` keys reviewed are consistent with current Ansible documentation. The local environment did not have Ansible installed, so CLI checks were verified against official documentation rather than local `--help` output.
