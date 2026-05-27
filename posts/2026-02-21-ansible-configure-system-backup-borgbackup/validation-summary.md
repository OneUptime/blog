# Validation Summary: How to Use Ansible to Configure System Backup (borgbackup)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- BorgBackup
- Linux cron
- logrotate
- SSH-based remote backup repositories
- Jinja2 shell script templating

## Sources Consulted
- BorgBackup 1.4.4 `borg init` documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup 1.4.4 `borg create` documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup 1.4.4 `borg prune` documentation: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup 1.4.4 `borg check` documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup 1.4.4 `borg info` documentation: https://borgbackup.readthedocs.io/en/stable/usage/info.html
- BorgBackup 1.4.4 `borg list` documentation: https://borgbackup.readthedocs.io/en/stable/usage/list.html
- BorgBackup 1.4.4 `borg extract` documentation: https://borgbackup.readthedocs.io/en/stable/usage/extract.html
- BorgBackup 1.4.4 general usage and environment variable documentation: https://borgbackup.readthedocs.io/en/stable/usage/general.html
- BorgBackup append-only mode notes: https://borgbackup.readthedocs.io/en/stable/usage/notes.html
- BorgBackup security internals: https://borgbackup.readthedocs.io/en/stable/internals/security.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` / `yum` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- Replaced `ansible.builtin.yum` with `ansible.builtin.dnf` for RedHat-family installation because the current Ansible `yum` module documentation redirects to `dnf`.
- Replaced deprecated SCP-style remote repository syntax with the current `ssh://` Borg repository URL form.
- Fixed a misleading install comment that mentioned pip installation even though the task only checked the installed Borg version.
- Fixed the generated backup script so Borg warning return codes are captured and handled instead of being preempted by `set -e`.
- Fixed the Jinja2 path loop in the `borg create` command so the command continuation and stderr redirection render as part of the same command.
- Added explicit prune return-code handling so Borg warnings are reported and errors fail the script.
- Corrected the monitoring output label from `Total archives` to `Total chunks`; the referenced `repo_info.cache.stats.total_chunks` field is a chunk count, not an archive count.
- Updated the stale-backup check so it uses `max_backup_age_hours` instead of only checking whether the latest archive output is empty.
- Revised append-only mode wording. Borg append-only mode still allows delete/prune operations to mark data deleted, but prevents committed data from being physically removed until compaction outside append-only mode.

## Review Notes
- The examples target BorgBackup 1.x behavior, verified against BorgBackup 1.4.4 stable documentation.
- `borg compact` requires Borg versions that support separate compaction, so production users on very old Borg packages should verify their installed Borg version before using that part of the script.
