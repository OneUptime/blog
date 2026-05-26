# Validation Summary: How to Use Ansible changed_when for Custom Change Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `changed_when` and `failed_when` conditionals
- Ansible handlers and loop behavior
- Ansible built-in modules: `command`, `shell`, `raw`, `script`, `template`, `copy`, `file`, `service`, `debug`
- Jinja2 expressions and Ansible filters
- Common CLI tools used in examples: `diff`, `git`, `pip`, `docker`, `openssl`, `iptables`, `df`, `uptime`, `psql`, `rsync`

## Sources Consulted
- Ansible documentation: Error handling in playbooks, including defining `changed_when` and implicit AND logic for condition lists: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible documentation: Handlers and notification behavior on task changes: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible documentation: `ansible.builtin.command` module parameters, return values, and shell-processing caveats: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: `ansible.builtin.regex_search` filter behavior and return value: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible documentation: Loop registration and per-item registered result behavior: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible Lint documentation: `no-changed-when` guidance for `command` and `shell` tasks: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- Local CLI help output for `diff --help`, `git pull -h`, `python3 -m pip install --help`, `docker ps --help`, `openssl x509 -help`, `iptables -h`, `df --help`, and `uptime --help`.

## Issues Found
- The post introduced a custom installer example as "Another example with `apt-get`", but the snippet did not use `apt-get`; it used `/usr/local/bin/install-pkg`. Changed the lead-in to "Another example with a custom package installer" to match the code.
- The `regex_search` example for post-migration data fixes assumed a match would always be present. Ansible's `regex_search` returns `None` when no match is found, so piping directly to `first` can fail if the command output does not include `Fixed ... records`. Added `default(['0'], true)` before `first` so a no-match result is treated as zero fixed records.

## Review Notes
- The examples using custom commands such as `/opt/app/bin/check-config`, `/opt/app/bin/apply-config`, `/opt/app/bin/migrate`, `/opt/app/bin/fix-data`, and `/usr/local/bin/install-pkg` are illustrative and cannot be verified against public official documentation.
- The `git pull` and `pip install` output-parsing examples are technically plausible, but production playbooks should be careful with localization, output changes, and stderr/stdout differences. Built-in modules or more structured command output are preferable when available.
