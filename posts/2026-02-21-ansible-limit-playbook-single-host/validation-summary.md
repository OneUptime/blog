# Validation Summary: How to Limit Playbook Execution to a Single Host

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks
- Ansible inventory host patterns
- ansible-playbook CLI
- ansible.cfg

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI options, https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Patterns targeting hosts and groups, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: Configuration settings, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Local ansible-core 2.21.0 CLI checks for `--limit`, `--list-hosts`, unmatched hosts, retry file defaults, and available config keys.

## Issues Found
- The opening explanation said `--limit` restricts hosts regardless of the playbook `hosts` directive. Changed it to clarify that `--limit` is applied after the playbook host pattern, matching Ansible's documented behavior.
- The post said Ansible automatically creates `.retry` files after failed runs. Current Ansible defaults `RETRY_FILES_ENABLED` to `False`, so this was changed to say `.retry` files are created only when `retry_files_enabled` is set to `True`.
- The example for limiting a `webservers` play to `db01` showed the warning for a host pattern that does not exist in inventory. Because `db01` exists in the example inventory but is outside the play target, Ansible reports that no hosts matched for the play. The output snippet was corrected.
- The IP address limit section could imply that `--limit 192.168.1.10` works when the inventory host is an alias with `ansible_host=192.168.1.10`. Ansible requires the pattern to match inventory syntax, so the text now clarifies that the IP must be the inventory hostname.
- The post claimed `[defaults] limit = web01` can set a default playbook limit in `ansible.cfg`. Current Ansible configuration documentation and `ansible-config dump` do not expose a documented `limit` config key, so the section was corrected to recommend using `--limit` explicitly.

## Review Notes
The remaining host pattern examples, including comma and colon separators, wildcard matching, exclusions with `!`, intersections with `&`, `@` limit files, regex patterns with `~`, and `--list-hosts`, match the current Ansible documentation.
