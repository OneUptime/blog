# Validation Summary: How to Use Ansible loop with subelements Filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible loops
- `ansible.builtin.subelements` filter
- `with_subelements` lookup migration
- `ansible.posix.authorized_key`
- `ansible.builtin.user`
- `community.general.filesystem`
- `ansible.posix.mount`
- `ansible.builtin.template`
- `community.postgresql.postgresql_privs`

## Sources Consulted
- Ansible `ansible.builtin.subelements` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible 2.5 porting guide for `with_subelements` migration: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_2.5.html
- Ansible loop control and extended loop variable documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `community.general.filesystem` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `community.postgresql.postgresql_privs` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html

## Issues Found
- The first `loop_control.label` used `ansible_loop.index` without enabling extended loop variables. Added `extended: true`, because Ansible only exposes `ansible_loop.index` when `loop_control.extended` is enabled.
- The PostgreSQL grants example used `db: "{{ item.1 }}"` as if it identified the database object receiving privileges. In current `community.postgresql.postgresql_privs`, `db` is a deprecated alias for `login_db`, the database to connect to. Changed the example to use `login_db: postgres` and `objs: "{{ item.1 }}"` for the target database object.
- The nested subelements example referenced `map('combine_subelement')`, but `combine_subelement` is not an Ansible built-in filter. Replaced the snippet with a documented dotted-key `subelements('mysql.hosts')` example.

## Review Notes
- The examples use short filter names such as `subelements`; official documentation recommends the FQCN `ansible.builtin.subelements` for documentation links and avoiding name conflicts, but the short name remains valid.
- The examples use YAML booleans such as `yes` and `no`; these are accepted in Ansible playbooks, though current documentation commonly shows `true` and `false`.
