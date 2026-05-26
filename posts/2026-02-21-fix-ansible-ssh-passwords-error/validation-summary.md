# Validation Summary: How to Fix Ansible to use the ssh connection type with passwords Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- Ansible SSH connection plugin
- sshpass
- SSH key authentication
- Ansible Vault
- Ansible playbooks and modules

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- ansible.posix.authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Homebrew sshpass formula: https://formulae.brew.sh/formula/sshpass

## Issues Found
- The opening explanation said Ansible needs sshpass for password-based SSH authentication without qualification. Current ansible-core documents `password_mechanism`, where `sshpass` is one supported mechanism rather than the only one. Updated the wording to scope the error to older Ansible versions and newer configurations that use the `sshpass` mechanism.
- The CentOS/RHEL install command used `yum`. Updated it to `dnf`, which is the current package manager command for modern RHEL-family systems.
- The macOS Homebrew command used an older tap-specific install path. Updated it to the current documented Homebrew formula command, `brew install sshpass`.
- The key distribution playbook used the short `authorized_key` module name. Updated it to `ansible.posix.authorized_key`, which is the current documented FQCN for the module.
- The bootstrap playbook notified `restart sshd` but did not define that handler, so the example would fail when the task changed. Added the missing handler using `ansible.builtin.service`.
- The infrastructure workflow used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the module FQCN.

## Review Notes
The examples are generally correct for a tutorial context, but some snippets depend on external collections such as `ansible.posix` and `community.general`. The post could mention collection installation in the future, but no extra section was added because the requested scope was limited to technical corrections.
