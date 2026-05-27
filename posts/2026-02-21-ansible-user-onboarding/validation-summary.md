# Validation Summary: How to Use Ansible to Automate User Onboarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Linux user and group management
- SSH authorized keys
- sudoers configuration
- PostgreSQL role and privilege provisioning
- Jinja2 templates
- Cron scheduling
- UFW firewall configuration
- Ansible facts and system configuration modules

## Sources Consulted
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible password lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible host pattern and --limit documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- ansible.posix.authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.postgresql.postgresql_privs module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The user role set file ownership groups to each username but did not explicitly create matching primary groups. Added a task to create per-user primary groups and set `group` on the `user` task so later `file` and `template` tasks work consistently across Linux distributions.
- The `onboarding_home_base` and `onboarding_skeleton_dir` defaults were defined but not applied to user creation. Added `home` and `skeleton` parameters supported by `ansible.builtin.user`.
- The SSH key task used `authorized_key` as a short module name even though the current documented FQCN is `ansible.posix.authorized_key`. Updated the example to the FQCN.
- The PostgreSQL tasks used short module names for modules in the `community.postgresql` collection. Updated them to `community.postgresql.postgresql_user` and `community.postgresql.postgresql_privs`.
- The PostgreSQL password lookup used `/dev/null`, which official Ansible docs state generates a new password every time and does not store it. Changed it to a per-user controller-side password file path so the task remains idempotent.
- The PostgreSQL privilege task used the deprecated `database` alias and singular `role` alias. Updated them to `login_db` and `roles`, and added `schema: public` for the `ALL_IN_SCHEMA` example.
- Team checks used substring tests against `item.team`. Changed them to exact comparisons so similarly named teams do not receive unintended database access.
- The infrastructure workflow used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. Updated the FQCN.

## Review Notes
The Ansible CLI was not installed in the local environment, so `ansible-playbook --syntax-check` could not be run. YAML code blocks were parsed successfully with PyYAML after the edits. Several examples depend on non-core collections (`ansible.posix`, `community.postgresql`, and `community.general`) being installed.
