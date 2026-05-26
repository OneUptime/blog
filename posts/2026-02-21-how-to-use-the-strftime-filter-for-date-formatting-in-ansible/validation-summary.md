# Validation Summary: How to Use the strftime Filter for Date Formatting in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Jinja2 filters
- `ansible.builtin.strftime`
- `ansible.builtin.debug`
- `ansible.builtin.set_fact`
- `ansible.builtin.shell`
- `ansible.builtin.lineinfile`
- `ansible.builtin.stat`
- `ansible.builtin.find`
- `ansible.builtin.file`
- `ansible.builtin.copy`
- `ansible.builtin.cron`
- Python `strftime` format codes
- Jinja2 templates
- Nginx configuration snippets
- PostgreSQL `pg_dump` shell usage
- gzip shell usage

## Sources Consulted
- Ansible `ansible.builtin.strftime` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/strftime_filter.html
- Ansible playbook filters guide: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible templating documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Python `datetime` `strftime` documentation: https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes

## Issues Found
- The timezone section said `strftime` uses the system's local timezone and warned about playbooks across hosts in different timezones. Ansible templates are evaluated on the control node, so the default local timezone is the control node's timezone, not each target host's timezone. Updated the wording accordingly.
- The UTC guidance did not mention the official `utc=true` option added to `ansible.builtin.strftime` in ansible-core 2.14. Added a minimal UTC example using `seconds=ansible_date_time.epoch` and `utc=true`.
- The log rotation example referenced `log_stat.stat.size` without defining `log_stat`, and the compression step could run even when rotation was skipped. Added a `stat` task plus existence and size guards for both rotation and compression.
- The cleanup example calculated `cutoff_date` but did not use it, while the actual filtering was done by `ansible.builtin.find` with `age: 30d`. Adjusted the surrounding text and loop label so the calculated date is used as a label rather than implying it drives the deletion threshold.

## Review Notes
The examples use `ansible.builtin.shell` for operational snippets such as `pg_dump`, `mv`, and `gzip`; these are syntactically valid, but production playbooks may want stronger idempotence and error handling around those commands.
