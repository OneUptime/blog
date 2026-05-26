# Validation Summary: How to Use Ansible to Compare Data Between Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and magic variables (`hostvars`, `groups`)
- Ansible built-in modules (`set_fact`, `stat`, `debug`, `shell`)
- Jinja templating and filters
- Linux command-line tools (`nginx`, `python3`, `ss`, `awk`, `grep`, `sysctl`)

## Sources Consulted
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible filter documentation, including set theory filters: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible/Jinja `default` filter documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/default_filter.html and https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.default
- Jinja template assignment and namespace documentation: https://jinja.palletsprojects.com/en/stable/templates/#assignments
- GNU grep manual for `-P` / `--perl-regexp`: https://www.gnu.org/software/grep/manual/grep.html
- Local command help output for `grep --help`, `ss --help`, and `awk --version`

## Issues Found
- The package comparison example could misreport missing packages. If `nginx` was not installed, the original pipeline could pass the shell error through `awk -F/` and produce misleading output such as `bin`; if `python3` was missing, it could produce an empty value. Updated both commands to check `command -v` first and emit `not installed` explicitly.
- The firewall common-port calculation reassigned `common` inside a Jinja loop. Jinja loop assignments do not propagate reliably outside the loop scope, so the final `common` value could remain the first host's port list instead of the intersection across all hosts. Updated the example to use a Jinja `namespace`, which is the documented way to carry mutable values across loop scope.

## Review Notes
- Ansible was not installed in the local workspace, so the playbooks were reviewed against official documentation and local shell command help rather than executed with `ansible-playbook`.
- The firewall example compares listening TCP ports as reported by `ss`; that is useful for drift detection, but it is not a complete inspection of host firewall policy.
