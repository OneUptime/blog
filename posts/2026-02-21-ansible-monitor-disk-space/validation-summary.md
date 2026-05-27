# Validation Summary: How to Use Ansible to Monitor Disk Space and Send Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and modules
- Linux disk usage commands (`df`, `du`, `journalctl`)
- Slack incoming webhooks
- Email alerting with `community.general.mail`
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible variables and extra-vars documentation: https://docs.ansible.com/ansible/6/user_guide/playbooks_variables.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- GNU Coreutils `df` documentation and local `df --help`: https://www.gnu.org/software/coreutils/df
- GNU Coreutils `du` documentation and local `du --help`: https://www.gnu.org/software/coreutils/du
- systemd `journalctl --help`

## Issues Found
- The disk usage parser used `df --output=target,...` and split each row on whitespace, which breaks for mount points containing spaces. Changed the `df` output order to put `target` last and parse with `split(maxsplit=5)`.
- Filesystem exclusion was implemented with `grep -v -E`, which could exclude rows based on mount path text instead of filesystem type. Changed it to use `df -x` exclusions for each configured filesystem type.
- The Mermaid flow said cleanup only runs for critical issues, but the playbook runs cleanup for any issue when auto-cleanup is enabled. Updated the diagram label to match the playbook behavior.
- The Slack webhook payload set `channel`, `username`, and `icon_emoji`, but current Slack incoming webhooks inherit those values from the app/webhook configuration. Removed those fields and the unused Slack channel variable.
- The localhost alert play used `ansible_date_time` while facts were disabled. Enabled fact gathering for the localhost play so the timestamp fact is available.
- The auto-cleanup variables included `disk_cleanup_old_kernels`, but no task used it. Removed the unused variable to avoid implying old kernel cleanup was implemented.
- The post-cleanup `df` command joined mount paths without shell quoting. Added Ansible's `quote` filter for mount paths.
- The directory monitoring `du` command interpolated paths into a command string. Changed it to use `argv`, matching Ansible's recommended approach for arguments that may require quoting.
- The example `--extra-vars` commands used key=value syntax for booleans and integers. Ansible documents key=value extra-vars as strings, so these examples were changed to JSON to preserve boolean and numeric types.

## Review Notes
Ansible was not installed in the local environment, so module checks were performed against official Ansible documentation rather than `ansible-doc`. Local command checks were performed with `df --help`, `du --help`, `find --help`, and `journalctl --help`.
