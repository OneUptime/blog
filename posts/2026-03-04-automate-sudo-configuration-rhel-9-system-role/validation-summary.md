# Validation Summary: How to Automate Sudo Configuration with the RHEL Sudo System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Linux System Roles sudo role
- Ansible playbooks and inventory variables
- sudo and sudoers configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Applying custom sudoers configuration by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index#applying-custom-sudoers-configuration-by-using-rhel-system-roles_managing-sudo-access
- Linux System Roles sudo role README: https://github.com/linux-system-roles/sudo/blob/main/README.md
- Linux System Roles sudo role defaults: https://github.com/linux-system-roles/sudo/blob/main/defaults/main.yml
- Linux System Roles sudo role task implementation showing `visudo` validation: https://github.com/linux-system-roles/sudo/blob/main/tasks/main.yml
- Linux System Roles sudo role sudoers template: https://github.com/linux-system-roles/sudo/blob/main/templates/sudoers.j2
- Ansible inventory variable merge documentation: https://docs.ansible.com/ansible/latest/user_guide/intro_inventory.html#how-variables-are-merged
- Ansible playbook check and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The post used an unsupported `sudo_sudoers` variable with `name`, `state`, `runas`, and `nopassword` keys. Updated examples to use the documented `sudo_sudoers_files` list with `path`, `user_specifications`, `operators`, `tags`, and `commands`.
- The defaults example used raw sudoers strings for `env_keep += HOME` and `secure_path=...`. Updated it to the role's documented structured default format for `env_keep` and `secure_path`.
- The "Removing old rules" example used `state: absent` inside the sudo role data structure, which is not supported by the role. Replaced it with an `ansible.builtin.file` task that removes the drop-in file.
- The clean slate example used a non-existent `sudo_remove_all` variable. Replaced it with `sudo_remove_unauthorized_included_files` and clarified that this removes unmanaged drop-in files from included directories.
- The environment-specific `group_vars` examples reused the same list variable in `all.yml` and child group files, which would be overridden rather than merged by default Ansible variable behavior. Updated the examples to use common and group-specific list variables and explicitly combine them in the playbook.
- The CI/CD example combined `--check`, `--diff`, and `--syntax-check` while describing a syntax check. Simplified it to `ansible-playbook --syntax-check configure-sudo.yml`.

## Review Notes
Ansible was not installed in the local environment, so the examples were verified against official Red Hat, Linux System Roles, and Ansible documentation rather than by running `ansible-playbook` locally.
