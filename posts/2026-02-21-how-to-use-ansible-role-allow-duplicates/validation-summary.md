# Validation Summary: How to Use Ansible Role Allow Duplicates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible role metadata
- `ansible.builtin.include_role`
- Nginx virtual host configuration
- PostgreSQL cluster management on Debian/Ubuntu

## Sources Consulted
- Ansible Community Documentation: Roles, running a role multiple times in one play: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: `ansible.builtin.include_role` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html
- Debian manpage: `pg_createcluster`: https://manpages.debian.org/testing/postgresql-common/pg_createcluster.1.en.html
- Debian manpage: `pg_ctlcluster`: https://manpages.debian.org/testing/postgresql-common/pg_ctlcluster.1.en.html

## Issues Found
- The post said that listing the same role twice with different variables still demonstrates default duplicate-role skipping. Current Ansible documentation distinguishes variables under `vars` from role parameters for deduplication, so I clarified that `vars` values are not role parameters.
- The post said `include_role` bypasses deduplication logic. The official module documentation says `include_role` has an `allow_duplicates` option that defaults to `true`, so I changed the wording to describe that behavior accurately.
- The PostgreSQL example used `pg_ctlcluster 16 <name> start` as the initialization command. `pg_ctlcluster` starts, stops, restarts, reloads, and checks existing clusters; it does not create a cluster. I changed the example to use `pg_createcluster 16 <name> --port ... --datadir ...` for cluster creation, followed by `pg_ctlcluster ... start`.
- The PostgreSQL example wrote `postgresql.conf` into the data directory. For Debian/Ubuntu clusters managed by `postgresql-common`, `pg_createcluster` creates the cluster configuration under `/etc/postgresql/<version>/<name>/`, so I changed the destination to `pg_instance_config_dir`.
- The variable scoping caveat was too broad for current Ansible behavior. I updated it to mention that, on current Ansible versions, play-level `roles` vars do not leak into the whole play, while registered variables and facts can still be overwritten.

## Review Notes
- The Nginx role snippets are illustrative and syntactically valid Ansible/YAML examples. In a production role, the SSL variables shown in defaults should either be used in the template or removed to avoid confusing consumers.
- The PostgreSQL example is Debian/Ubuntu-specific because it uses `pg_createcluster` and `pg_ctlcluster` from `postgresql-common`; that tooling is not universal across PostgreSQL installations.
