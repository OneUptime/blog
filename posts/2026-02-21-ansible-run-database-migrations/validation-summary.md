# Validation Summary: How to Use Ansible to Run Database Migrations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible inventory and playbooks
- community.postgresql Ansible collection
- PostgreSQL
- Flyway CLI
- Django migrations
- Alembic migrations
- YAML

## Sources Consulted
- Ansible community.postgresql.postgresql_ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_ping_module.html
- Ansible community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible community.postgresql.postgresql_script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_script_module.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible import_playbook documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Redgate Flyway command-line documentation: https://documentation.red-gate.com/flyway/reference/usage/command-line
- Redgate Flyway command-line parameters documentation: https://documentation.red-gate.com/fd/command-line-parameters-277578836.html
- Django django-admin and manage.py documentation: https://docs.djangoproject.com/en/6.0/ref/django-admin/
- Alembic tutorial and command documentation: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Maven Central Flyway CLI artifact check: https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.6.0/flyway-commandline-10.6.0-linux-x64.tar.gz

## Issues Found
- The post claimed to cover MySQL migrations, but all database-specific Ansible examples use PostgreSQL modules and PostgreSQL connection strings. Updated the scope statement to say the guide covers PostgreSQL migrations.
- The description claimed rollback support, but the post does not include a rollback implementation. Updated the description to refer to backups and pre-migration checks instead.
- The inventory placed `db_name`, `db_user`, `db_host`, and `db_port` under `[database_servers:vars]`, but the Flyway migration play runs on `app_servers` and needs those variables. Moved the shared values to `[all:vars]`.
- PostgreSQL module examples used the deprecated `db` alias. Replaced it with the current `login_db` parameter in `community.postgresql.postgresql_ping` and `community.postgresql.postgresql_query` examples.
- The raw SQL example used `community.postgresql.postgresql_query` with a non-documented `path_to_script` parameter. Replaced it with `community.postgresql.postgresql_script` and the documented `path` parameter.
- The raw SQL example copied files into `/opt/migrations/sql` without ensuring the directory exists. Added an `ansible.builtin.file` task to create the directory before copying migration files.
- The conclusion said the included playbooks cover full orchestration, even though the backup playbook is only imported and not shown. Adjusted the wording to say the examples orchestrate around a backup step.

## Review Notes
- The Flyway 10.6.0 Maven Central download URL returned HTTP 200 during validation, though the current Redgate documentation now shows newer Flyway releases.
- The YAML snippets were parsed locally with PyYAML after edits; Ansible itself was not installed in the environment, so `ansible-playbook --syntax-check` could not be run.
