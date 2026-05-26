# Validation Summary: How to Use Ansible Playbook --list-hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible inventory and host patterns
- Bash scripting

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI, including `--list-hosts`, `--list-tags`, `--list-tasks`, `-i`, and `--limit`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Patterns for targeting hosts and groups, including group unions, intersections, exclusions, wildcards, ranges, and `--limit`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Core Documentation: Tags and previewing tags/tasks with `--list-tags` and `--list-tasks`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_tags.html

## Issues Found
- The `get-hosts.sh` example only extracted hostnames containing a dot, so it would miss valid Ansible inventory names such as short aliases, instance IDs, and other inventory hostnames. Updated it to parse unique host entries under each `hosts (N):` block instead.
- The safety wrapper counted every indented line from `ansible-playbook --list-hosts`, including play metadata such as `play`, `pattern`, and `hosts`, not only target hosts. Updated it to count unique entries under `hosts (N):` blocks.
- The safety wrapper passed extra `ansible-playbook` options after the playbook path. Updated the example to pass user-supplied options before the playbook path, matching the official synopsis.
- The safety wrapper called `shift` before validating that a playbook argument existed, which could emit a shell error when run without arguments. Moved `shift` after the usage check.
- The dynamic inventory sample implied that `--list-hosts` appends IP addresses in parentheses. `--list-hosts` lists matching inventory hostnames, so the example output was adjusted to show instance IDs only.

## Review Notes
The primary `--list-hosts`, inventory, `--limit`, and host-pattern examples are consistent with current Ansible documentation. The local environment did not have `ansible-playbook` installed, so command behavior was verified against official Ansible documentation rather than local `--help` output.
