# Validation Summary: How to Use Ansible to Set Up Gitea Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Gitea
- Git
- SQLite
- PostgreSQL
- Nginx
- Certbot
- systemd
- Gitea REST API

## Sources Consulted
- Gitea installation from binary documentation: https://docs.gitea.com/installation/install-from-binary
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Gitea command-line documentation: https://docs.gitea.com/usage/command-line
- Gitea backup and restore documentation: https://docs.gitea.com/usage/backup-and-restore
- Gitea reverse proxy documentation: https://docs.gitea.com/usage/reverse-proxies
- Gitea API documentation: https://docs.gitea.com/api/
- Ansible apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible community.postgresql postgresql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_db_module.html

## Issues Found
- The Gitea install example used version `1.21.4` and the old `dl.gitea.io` download host. Updated the example to Gitea `1.26.2` and `https://dl.gitea.com/...`, matching the current official binary installation documentation and verified the binary URL returns HTTP 200.
- The locked manual `app.ini` example set `INSTALL_LOCK = true` and `SECRET_KEY` but omitted `INTERNAL_TOKEN`. Added an `INTERNAL_TOKEN` variable and configuration entry because Gitea's binary installation guidance requires both secrets when bypassing the web installer.
- The generated secret used Ansible's password lookup with `/dev/null`, which would create a new value on every playbook run. Changed the lookup paths to persistent local credential files so Ansible reuses the same Gitea secrets across runs.
- The Nginx WebSocket proxy header used a hard-coded `Connection "upgrade"` value. Changed it to `Connection $http_connection` to match Gitea's documented Nginx reverse proxy example.
- The backup script ran `gitea dump` as the `gitea` user but created `/opt/gitea-backups` as root, causing the dump file write to fail. Added an Ansible task to create the backup directory with `gitea:gitea` ownership and retained ownership correction in the script.
- The backup script took live backups without stopping Gitea. Updated it to stop Gitea before `gitea dump` and restart it via a trap, matching Gitea's backup consistency guidance.

## Review Notes
The corrected YAML examples parse successfully. Ansible was not installed in the review environment, so full `ansible-playbook --syntax-check` execution was not available.
