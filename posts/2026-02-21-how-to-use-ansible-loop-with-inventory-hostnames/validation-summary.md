# Validation Summary: How to Use Ansible loop with Inventory Hostnames

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory variables (`groups`, `hostvars`, `inventory_hostname`)
- Ansible loops and `loop_control`
- Ansible `inventory_hostnames` lookup
- Ansible modules: `debug`, `template`, `wait_for`, `lineinfile`, `command`, `known_hosts`, `uri`, `service`, `set_fact`
- `community.postgresql.postgresql_query`
- `ansible.posix.firewalld`
- HAProxy, PostgreSQL, Prometheus, SSH known_hosts, firewalld

## Sources Consulted
- Ansible special variables: https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible facts and magic variables: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible loops and `loop_control.index_var`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `inventory_hostnames` lookup: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/inventory_hostnames_lookup.html
- Ansible inventory host patterns: https://docs.ansible.com/ansible/latest/inventory_guide/intro_patterns.html
- Ansible `known_hosts` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible `command` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `wait_for` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `difference` filter: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/difference_filter.html
- Ansible `extract` filter: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/extract_filter.html
- Ansible `firewalld` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- `community.postgresql.postgresql_query` module: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- PostgreSQL 14 replication slot functions and catalog view: https://www.postgresql.org/docs/14/functions-admin.html and https://www.postgresql.org/docs/14/view-pg-replication-slots.html

## Issues Found
- The HAProxy backend reachability check used `host: "{{ item }}"`, which can fail when the inventory hostname is not DNS-resolvable and `ansible_host` is used for connection addressing. Changed it to use `hostvars[item]['ansible_host'] | default(item)`, matching the template example and Ansible's documented guidance for resolvable `wait_for` hosts.
- The SSH known_hosts example ran `ssh-keyscan -H` but then passed `name: "{{ item.item }}"` to `known_hosts`. The `known_hosts` module requires the `name` value to match the host value present in `key`; hashed `ssh-keyscan` output and inventory aliases can break that requirement. Changed the command to use `argv`, scan the same `ansible_host | default(item)` value that is passed as `name`, and loop over `stdout_lines` so each returned host key line is added separately.
- The PostgreSQL `pg_hba.conf` and firewalld examples accessed `hostvars[item]['ansible_host']` without a default. Changed those references to `hostvars[item]['ansible_host'] | default(item)` so the examples also work when inventory hostnames are the network addresses.

## Review Notes
- The `map('extract', hostvars, 'ansible_host')` cluster member example is valid Ansible syntax, but it assumes every host in `app_cluster` defines `ansible_host`. If the inventory hostnames themselves are the desired addresses, a future revision could use a more verbose expression that defaults missing `ansible_host` values to the inventory name.
- The PostgreSQL example is intentionally illustrative and assumes PostgreSQL 14 Debian-style paths and IPv4 `/32` addresses. Other distributions, PostgreSQL versions, IPv6 networks, or SCRAM-only authentication policies would need adjusted paths and `pg_hba.conf` rules.
