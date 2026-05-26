# Validation Summary: How to Use the intersect Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible filter plugins: `intersect`, `difference`, `sort`
- Ansible modules: `debug`, `shell`, `set_fact`, `template`, `command`, `include_role`
- Jinja2 templating in Ansible
- Debian package querying with `dpkg-query`
- Mermaid diagrams

## Sources Consulted
- Ansible `ansible.builtin.intersect` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/intersect_filter.html
- Ansible `ansible.builtin.difference` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/difference_filter.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Debian `dpkg-query(1)` manual page: https://manpages.debian.org/bookworm/dpkg/dpkg-query.1.en.html

## Issues Found
- The post described `intersect` as returning the items that appear in both lists, but Ansible documents the return value as a unique list and notes that result order is arbitrary. I updated the wording to say "unique items" and clarified that stable display order requires sorting.
- The basic example showed a deterministic output directly from `intersect`. I changed the example to sort the result before presenting `[3, 4, 5]`.
- The commutativity explanation implied identical list output from both operand orders. I clarified that the same set of common elements is returned, while list order is not guaranteed.
- The compliance example used `dpkg --get-selections | awk '{print $1}'`, which reads package selections rather than filtering actual installed package status. I changed it to use `dpkg-query -W` with `db:Status-Status` and filter for `installed`.
- The compliance report joined `intersect` and `difference` results without sorting. I added `sort` before `join` so the displayed report is stable.

## Review Notes
The examples otherwise use valid Ansible task syntax and current fully qualified module names. The post uses short filter names such as `intersect` and `difference`; Ansible still supports these, though the official documentation recommends fully qualified filter names for unambiguous linking and conflict avoidance.
