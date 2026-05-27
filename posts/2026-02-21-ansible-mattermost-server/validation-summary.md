# Validation Summary: How to Use Ansible to Set Up a Mattermost Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Mattermost Server
- PostgreSQL
- Nginx
- Certbot / Let's Encrypt
- systemd
- cron
- UFW

## Sources Consulted
- Mattermost Server releases: https://docs.mattermost.com/product-overview/mattermost-server-releases.html
- Mattermost Linux tarball deployment guide: https://docs.mattermost.com/deployment-guide/server/deploy-linux.html
- Mattermost server preparation and PostgreSQL requirements: https://docs.mattermost.com/deployment-guide/server/preparations.html
- Mattermost Nginx proxy guide: https://docs.mattermost.com/deployment-guide/server/setup-nginx-proxy.html
- Ansible community.postgresql.postgresql_user documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible community.postgresql.postgresql_db documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible community.postgresql.postgresql_privs documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- Ansible community.postgresql.postgresql_owner documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_owner_module.html
- Ansible community.general.ufw documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Certbot documentation: https://eff-certbot.readthedocs.io/en/stable/

## Issues Found
- The post pinned Mattermost to `9.3.0`, which is no longer a current supported installation target. Updated the default to `11.7.1`, matching the current Mattermost release/ESR documentation available during validation.
- The PostgreSQL setup used legacy short Ansible module names and only granted database-level privileges. Updated the examples to use `community.postgresql` FQCNs, create the Mattermost role before the database, set the database owner, use Mattermost's documented UTF-8 locale/template settings, and grant/own the public schema for PostgreSQL 15+ compatibility.
- The backup script ran `pg_dump -U mmuser` as root without a password or host, which commonly fails with default PostgreSQL local authentication. Updated it to pass `PGPASSWORD` safely through Jinja's `quote` filter and connect over localhost.
- The backup script hard-coded `/opt/mattermost/data` even though the role exposes `mattermost_data_dir`. Updated the tar command to use the configured data directory.
- The Ubuntu-oriented UFW/SSH hardening example notified and restarted `sshd`, which is not the Debian/Ubuntu service name. Updated the handler to restart `ssh`.

## Review Notes
- The main Mattermost, systemd, Nginx reverse proxy, Certbot, cron, and Ansible examples are technically valid after the corrections above.
- The role still assumes the required Ansible collections are installed on the control node and that the managed host's PostgreSQL package version is Mattermost-supported.
