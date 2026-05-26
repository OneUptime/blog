# Validation Summary: How to Use Multiline Shell Commands in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.shell module
- YAML block scalars
- POSIX shell and Bash
- Shell pipelines, heredocs, and functions

## Sources Consulted
- Ansible documentation: ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- YAML 1.2.2 specification: block scalar styles, folding, and chomping - https://yaml.org/spec/1.2.2/
- GNU Bash Reference Manual: `set -e`, pipelines, and `pipefail` behavior - https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
- Clarified that Ansible passes the block to the remote shell as one script, rather than sending each line separately. Newlines are interpreted by the shell as command separators.
- Updated the backup cleanup `find` command to include `-mindepth 1`, so the command does not target the `/backup` root directory itself.
- Added `set -o pipefail` and `args.executable: /bin/bash` to the database backup loop because `set -e` alone does not fail a script when an earlier command in a pipeline fails.
- Moved `executable: /bin/bash` under `args` in the shell-functions example, matching the documented Ansible shell module syntax for free-form commands.
- Updated the summary to mention the `pipefail` caveat for pipelines.

## Review Notes
The examples are Linux/Unix-oriented and use commands such as `systemctl`, `pg_dump`, `npm`, `docker`, and `gzip`; those commands must exist on the target hosts for the playbooks to run. Ansible was not installed in the local workspace, so module syntax was checked against official Ansible documentation rather than with `ansible-playbook --syntax-check`.
