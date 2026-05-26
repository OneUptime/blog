# Validation Summary: How to Use Regex in Ansible Conditionals with match and search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible Jinja2 tests: `match`, `search`, and `regex`
- Ansible `regex_search` filter
- YAML quoting for regular expressions
- Python-style regular expressions as used by Ansible

## Sources Consulted
- Ansible `ansible.builtin.match` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/match_test.html
- Ansible `ansible.builtin.search` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/search_test.html
- Ansible `ansible.builtin.regex` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_test.html
- Ansible `ansible.builtin.regex_search` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible YAML syntax documentation: https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html

## Issues Found
- The post description referred to `regex_match`, which is not the Ansible conditional test used in the article. Changed it to `match, search, and regex_search` to match Ansible's documented plugin names and the examples in the post.
- The YAML quoting example claimed to demonstrate single-quoted YAML handling, but the `when` scalar itself was double-quoted. Changed the example to use a single-quoted YAML scalar while preserving the regex escaping needed by the Jinja string literal.

## Review Notes
- The core explanation is correct: Ansible's `match` test uses Python-style matching anchored at the start of the string, `search` uses Python's search behavior, and `regex` defaults to search behavior unless `match_type` is configured.
- The IPv4 examples validate simple dotted numeric formats or known Ansible fact values; they are not strict octet-range validators for arbitrary IP input.
- Local YAML parsing passed for all YAML code blocks. A full `ansible-playbook --syntax-check` could not be run because the `ansible-playbook` executable is not installed in this environment.
