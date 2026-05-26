# Validation Summary: How to Exclude Hosts from an Ansible Playbook Run

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Ansible playbooks
- Ansible inventory patterns
- Ansible CLI `--limit`
- Ansible conditionals
- Ansible `serial` and `max_fail_percentage`
- Ansible `group_by`, `meta`, `command`, and `shell` modules
- Ansible retry files

## Sources Consulted
- Ansible pattern and `--limit` documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `group_by` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_by_module.html
- Ansible `meta` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/meta_module.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `shell` module documentation: https://docs.ansible.com/ansible/2.9/modules/shell_module.html
- Ansible configuration settings for retry files: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The post said `--limit` works regardless of the playbook `hosts` field. Updated this to say `--limit` further narrows the hosts selected by the play, which matches Ansible's behavior.
- The `--limit '!web3.example.com'` example was not a correct standalone negated limit pattern. Changed it to `--limit 'all:!web3.example.com'`, consistent with Ansible's documented negated-limit example.
- The post showed `all:!@/tmp/maintenance_hosts.txt` as a file-based exclusion pattern. Official docs document `@file` as an inclusion list for `--limit`, not as a portable inline exclusion expression. Rewrote the example and explanation to avoid the unsupported pattern.
- The post said `when` can be used on entire plays. Adjusted this to tasks, blocks, and role includes, which are supported uses covered by Ansible's conditionals documentation.
- The dynamic `group_by` example read `health_check.status` directly after an ignored `uri` failure. Added `default(0)` so grouping still works when a failed request does not provide a status code.
- The retry-file section implied retry files are created automatically. Current Ansible defaults `RETRY_FILES_ENABLED` to `False`, so the section now states that retry files are created when `retry_files_enabled` is set to `True` and shows how to enable it.
- The combined example used the `command` module with a shell pipeline. Changed it to `shell`, because Ansible's `command` module does not process shell metacharacters such as pipes.

## Review Notes
The remaining examples are technically consistent with current Ansible documentation. The post uses short module names such as `meta`, `group_by`, and `shell`; Ansible still supports these, although official docs recommend fully qualified collection names for clearer linking and to avoid collection name conflicts.
