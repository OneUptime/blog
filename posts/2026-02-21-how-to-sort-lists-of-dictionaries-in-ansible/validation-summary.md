# Validation Summary: How to Sort Lists of Dictionaries in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 filters
- YAML playbooks
- DNS zone file generation

## Sources Consulted
- Ansible Core documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Jinja documentation: `sort` filter parameters, stable sorting, nested attributes, and case sensitivity - https://jinja.palletsprojects.com/en/stable/templates/#jinja-filters.sort
- Ansible documentation: `ansible.builtin.set_fact` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible documentation: `ansible.builtin.combine` filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible documentation: `ansible.builtin.copy` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- RFC 1035: Domain Names - Implementation and Specification - https://www.rfc-editor.org/rfc/rfc1035

## Issues Found
- The numeric-vs-string example used string values `"1"`, `"10"`, and `"100"` but described a result that did not match lexicographic ordering. Changed the example to use `"9"`, `"10"`, and `"100"` so the incorrect string ordering is visible and corrected the expected result.
- The "convert to int" fix did not actually convert values and was mislabeled as `json_query`. Replaced it with a `set_fact` loop that normalizes each dictionary's `priority` value with the `int` filter before sorting.
- The case-sensitivity section claimed the default sort was case-sensitive. Jinja's `sort` filter is case-insensitive by default; updated the explanation and example to use `case_sensitive=true` for case-sensitive sorting.
- The custom priority example rendered a Jinja block expression that could produce text instead of a list in Ansible. Replaced it with an Ansible `set_fact` loop that accumulates filtered list items in the desired priority order, and changed the unused priority map to the priority list used by the loop.
- The stable-sort example comment referred to "role" even though the data and sort used `department`. Corrected the comment.
- The sorting flow diagram showed `case_sensitive=false` as the case-insensitive option. Updated it to show `case_sensitive=true` for case-sensitive sorting because case-insensitive behavior is already the default.
- The DNS zone file example emitted a priority field for every record, including A records. Updated the template so the priority field is emitted only for MX records.
- The summary repeated the incorrect `case_sensitive=false` guidance. Updated it to reflect the default case-insensitive behavior and the use of `case_sensitive=true`.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official Ansible and Jinja documentation. Jinja behavior for the `sort` filter was also spot-checked with the installed Python Jinja package.
