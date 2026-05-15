# Validation Summary: How to Use Ansible Vault for Secret Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Vault
- Ansible playbooks and inventory variables
- Ansible Vault IDs
- PostgreSQL deployment with Ansible
- Git pre-commit hooks
- CI/CD vault password handling

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible Vault CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Vault encrypted content guide: https://docs.ansible.com/projects/ansible/6/user_guide/vault.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Red Hat Enterprise Linux 9 package changes documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_changes-to-packages_considerations-in-adopting-rhel-9

## Issues Found
- The password-file setup created `~/.vault_pass`, then said to add `.vault_pass` to the project `.gitignore` so it never gets committed. A home-directory file is already outside the repository, and the `.gitignore` entry only applies to a project-local file. Updated the comment to clarify that the ignore rule is for a project-local password file.
- The PostgreSQL example installed only `postgresql-server` before using `community.postgresql.postgresql_user`. On RHEL 9, PostgreSQL must be initialized with `postgresql-setup --initdb` and started before database user management, and the Ansible PostgreSQL module requires the psycopg2 Python library on the host executing the module. Added `python3-psycopg2`, an idempotent initialization task, and a task to start and enable PostgreSQL.

## Review Notes
- The Vault CLI commands, Vault ID examples, encrypted string syntax, `vault_password_file` configuration key, and encrypted file header examples match Ansible documentation.
- `ansible.builtin.systemd` is still accepted, but current documentation redirects to `ansible.builtin.systemd_service`; a future style update could switch to the newer FQCN without changing behavior.
