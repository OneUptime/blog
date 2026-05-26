# Validation Summary: How to Use Ansible to Set User Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux environment variables
- PAM-managed login environments
- Bash startup files
- systemd service environment configuration
- Jinja2 templates

## Sources Consulted
- Ansible `lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `blockinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- Ansible `copy` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible playbook environment keyword documentation: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible `systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- GNU Bash startup files documentation: https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Ubuntu `pam_env` manual page: https://manpages.ubuntu.com/manpages/jammy/man7/pam_env.7.html

## Issues Found
- The original environment loading diagram presented a universal boot-time sequence from `/etc/environment` through shell startup files. This was corrected to distinguish PAM-managed logins, login shells, interactive non-login shells, and application/service-specific environments.
- The `/etc/environment` explanation said it works for all login methods including SSH and GUI. This was narrowed to PAM-managed login services that use `pam_env`, which is the accurate mechanism.
- The `/etc/profile.d/` explanation said scripts are sourced for every login shell and support full Bash syntax. This was corrected to note that they are commonly sourced by `/etc/profile` on many distributions and should use POSIX-compatible syntax unless Bash sourcing is known.
- The `.bash_profile` guidance said most distributions source `.bashrc`. This was softened to "many distributions" because Bash itself only reads the first matching login startup file and sourcing `.bashrc` is a distribution or skeleton-file convention.
- The systemd inline environment example used secret-shaped values. These were replaced with non-secret configuration values because systemd environment variables are not appropriate for confidential material.
- The systemd handler used `ansible.builtin.systemd`, which is currently an alias/redirect. It was updated to `ansible.builtin.systemd_service`, the current documented module name.
- The best practice recommending `/etc/environment` for all users and services was narrowed to PAM-managed login sessions, since systemd services do not generally read user shell or PAM login environment files.
- The best practice around secrets was clarified to avoid profile files and inline systemd environment values, and to distinguish Ansible Vault's at-rest protection from runtime secret handling.

## Review Notes
The Ansible module examples use valid current module parameters. The examples assume target users, groups, directories, and application paths already exist; production playbooks should create or validate those prerequisites.
