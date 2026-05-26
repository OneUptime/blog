# Validation Summary: How to Use Ansible to Execute Commands with sudo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible privilege escalation with `become`
- Ansible Vault
- Ansible inventory variables
- Linux `sudo` and sudoers configuration
- systemd service management
- OpenSSH server configuration

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible.builtin.sudo` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.systemd` / `systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Sudo / sudoers manual documentation: https://www.sudo.ws/docs/man/

## Issues Found
- The application config copy task used `become_user: appuser` while writing to `/opt/myapp/config.yaml` and setting ownership. A non-root application user commonly cannot write under `/opt` or change ownership, so the task could fail. I changed the task to run with `become: true` as root and clarified the task name to say the copied config is owned by the app user.
- The system hardening example used the `apt` module, which targets Debian-family systems, but restarted the `sshd` systemd service, which is the common RHEL-family service name. On Debian/Ubuntu systems the OpenSSH server service is typically `ssh`. I changed the handler and notifications from `sshd` to `ssh` to match the `apt`-based example.

## Review Notes
- The `sudo -l` debugging task is technically valid, but it may still prompt for a password depending on the target host sudoers policy.
- The restricted sudoers example is syntactically plausible, but command argument wildcards in sudoers should be reviewed carefully in real deployments because they can grant broader command-line matches than intended.
