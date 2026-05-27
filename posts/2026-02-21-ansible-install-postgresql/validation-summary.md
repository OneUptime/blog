# Validation Summary: How to Use Ansible to Install PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PostgreSQL
- Ubuntu/Debian package management
- RHEL/Rocky Linux package management
- systemd
- YAML

## Sources Consulted
- PostgreSQL official Ubuntu/Linux package documentation: https://www.postgresql.org/download/linux/ubuntu/
- PostgreSQL official Red Hat family package documentation: https://www.postgresql.org/download/linux/redhat/
- PostgreSQL release notes archive: https://www.postgresql.org/docs/release/
- PostgreSQL 16 connection settings documentation: https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 resource settings documentation: https://www.postgresql.org/docs/16/runtime-config-resource.html
- Ubuntu Jammy `postgresql` package page: https://packages.ubuntu.com/jammy/postgresql
- Ansible `ansible.builtin.deb822_repository` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible `ansible.builtin.apt_key` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.lineinfile` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.meta` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html
- Ansible `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The Debian/Ubuntu example used `apt_key`, but Ansible documents that the underlying `apt-key` utility is deprecated and removed in modern Debian versions. Replaced the `apt_key` plus `apt_repository` pair with `deb822_repository` and added the required `python3-debian` prerequisite.
- The RHEL/Rocky task used `args: warn: false` with the `command` module. The current `command` module does not support that parameter. Removed it and added a `register` plus `changed_when` expression for more accurate idempotence.
- The post described reusable configuration variables such as `postgresql_listen_addresses`, `postgresql_max_connections`, and `postgresql_shared_buffers`, but the role did not apply them. Added focused `lineinfile` tasks for the corresponding PostgreSQL settings.
- The role waited on `postgresql_port` before pending restart handlers would apply a changed port. Added `meta: flush_handlers` before the `wait_for` task.
- The `psycopg2` pip fallback used `ansible_os_family == "Debian"` with a numeric version check below 20, which would accidentally match current Debian releases such as Debian 12. Narrowed the example to older Ubuntu releases.
- The prose said the PGDG repository "always has the latest stable releases." Updated this to say it provides supported PostgreSQL releases for supported distributions, matching the official PGDG wording and avoiding stale version claims.
- The opening paragraph referred to security settings, but the role does not configure `pg_hba.conf` or PostgreSQL authentication policy. Narrowed the wording to "basic service configuration."

## Review Notes
- The article uses PostgreSQL 16 as its example version. As of May 27, 2026, PostgreSQL 18 is the current major series, but PostgreSQL 16 remains a supported version, so the example is still technically valid.
- The Debian/Ubuntu repository task now uses `deb822_repository`, which requires ansible-core 2.15 or newer.
- The RHEL/Rocky example uses `disable_gpg_check: true` for installing the PGDG repository RPM from a URL. This can be convenient for a tutorial, but production roles should prefer explicit package signature verification.
