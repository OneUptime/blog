# Validation Summary: How to Use Ansible to Set Up Automated Backups with Restic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Restic
- Bash
- Cron
- Logrotate
- AWS S3
- SFTP
- Linux backup automation

## Sources Consulted
- Restic official installation documentation: https://restic.readthedocs.io/en/stable/020_installation.html
- Restic official repository setup documentation: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Restic official backup documentation: https://restic.readthedocs.io/en/stable/040_backup.html
- Restic official forget/prune documentation: https://restic.readthedocs.io/en/stable/060_forget.html
- Restic official manual and scripting documentation: https://restic.readthedocs.io/en/stable/manual_rest.html
- Restic GitHub releases: https://github.com/restic/restic/releases
- Ansible builtin collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/dnf_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html

## Issues Found
- The Restic version in the binary fallback example was pinned to 0.16.4, while the current official release is 0.18.1. Updated the example version to 0.18.1 and verified that official linux amd64 and arm64 release assets exist.
- The RedHat package install task used `ansible.builtin.yum`. Current Ansible documentation notes that the YUM backend was removed in ansible-core 2.17 and recommends the DNF module for modern RedHat-family systems. Changed the task to `ansible.builtin.dnf`.
- The install comment said the binary fallback handled packages that were "too old", but the playbook only falls back when package installation fails. Updated the comment to match the actual behavior.
- The main Bash backup script used `set -euo pipefail` and then attempted to inspect `${PIPESTATUS[0]}` after a piped `restic backup` command. With `errexit` and `pipefail`, a failed backup could exit the script before the explicit error handling ran. Temporarily disabled `errexit` around the backup pipeline, captured the Restic exit code, and then re-enabled it.
- The monitoring example used `restic snapshots --last --json`, but current Restic uses `--latest 1` for this behavior. Updated the command to `restic snapshots --latest 1 --json`.
- The monitoring stats example displayed `restic stats --json` as "Repository size", but Restic's default stats mode reports restore size. Changed the command to `restic stats --mode raw-data --json` and updated the label to "Repository data size."

## Review Notes
- The S3 repository syntax, Restic environment variables, backup flags, forget/prune retention flags, check command, mount command, Ansible copy/cron/command usage, and general Restic claims about encryption, deduplication, and supported backends were consistent with official documentation.
- The examples assume GNU/Linux hosts and a working `bunzip2` executable for the manual binary fallback.
