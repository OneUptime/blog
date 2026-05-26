# Validation Summary: How to Configure Ansible Retry File Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible retry files
- Ansible configuration (`ansible.cfg` and environment variables)
- `ansible-playbook --limit`
- Bash scripting
- Ansible task retries with `until`, `retries`, and `delay`
- Ansible `block` / `rescue` error handling

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible inventory patterns and `--limit @file`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible task retries with `until`, `retries`, and `delay`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible block error handling: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Local runtime check with `ansible-playbook [core 2.21.0]`

## Issues Found
- The post stated that Ansible creates retry files by default. Current Ansible documentation lists `RETRY_FILES_ENABLED` as defaulting to `False`, so the default behavior section and opening explanation were updated to say retry files are created only when enabled.
- The sample output said `Retry file created: ...`, but current ansible-core prints a retry hint such as `to retry, use: --limit @...`. The example output was updated.
- The combined `--limit` example used `&` without shell quoting. In Bash, `&` can be interpreted by the shell, so the limit pattern was quoted.
- The retry automation script assumed Ansible removes the `.retry` file after a successful retry. Local verification with ansible-core 2.21 showed that a stale retry file can remain, so the script now removes the expected retry file before each playbook run, copies the previous retry file before using it as a limit input, and checks for non-host failures where Ansible exits without creating a retry file.
- The script used unquoted shell expansions in `basename` and `cat ${RETRY_FILE}`. These were corrected to safer quoted forms.

## Review Notes
The `retry_files_save_path` and `retry_files_enabled` configuration keys and corresponding environment variables are current. The examples for task-level retries and `block` / `rescue` match Ansible documentation. Older Ansible releases enabled retry files by default, so teams maintaining legacy projects may still encounter the older behavior.
