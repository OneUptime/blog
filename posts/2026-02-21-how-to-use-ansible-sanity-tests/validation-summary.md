# Validation Summary: How to Use Ansible Sanity Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-core
- ansible-test
- Ansible Collections
- Python
- YAML
- GitHub Actions
- Docker

## Sources Consulted
- Ansible sanity testing guide: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_sanity.html
- Ansible sanity test list: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/index.html
- Ansible ignore file documentation: https://docs.ansible.com/ansible/latest/dev_guide/testing/sanity/ignores.html
- Ansible import sanity test documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/import.html
- Ansible validate-modules documentation: https://docs.ansible.com/ansible/latest/dev_guide/testing/sanity/validate-modules.html
- ansible-core release and Python support matrix: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- Python 3.10 release notes for structural pattern matching: https://docs.python.org/3.10/whatsnew/3.10.html#pep-634-structural-pattern-matching

## Issues Found
- The opening anecdote said an f-string worked on Python 3.9 but failed on Python 3.6. F-strings are valid in Python 3.6, so this was technically incorrect. Changed the example to Python 3.10 structural pattern matching failing on Python 3.9.
- The sample ignore file used `ignore-2.16.txt`, but Ansible core 2.16 is end-of-life as of the current review date. Updated examples to `ignore-2.20.txt` to match a currently maintained ansible-core release.
- The Python version examples and GitHub Actions matrix used controller versions that are no longer all supported by current ansible-core releases installed with `pip install ansible-core`. Updated the CI matrix to Python 3.12, 3.13, and 3.14, while retaining Python 3.10 as a target-version sanity test example.
- The optional dependency code example had PEP 8 issues: insufficient top-level blank lines and an overly long `module.fail_json` line. Reformatted the snippet so it is consistent with the PEP 8 sanity test section.
- The list-tests example omitted `--allow-disabled`, even though the official sanity test list notes this is needed to list disabled tests as well. Updated the command and comment accordingly.
- The common sanity test list included `compile-test`, which is not the current test name. Changed it to `compile` and replaced unavailable/older examples with current test names from the official sanity test list.

## Review Notes
The core commands and concepts are technically sound: `ansible-test sanity`, `--docker`, `--test`, `--python`, collection-relative ignore files, and the documented sanity test categories all align with Ansible documentation. Future updates should re-check the Python support matrix when newer ansible-core releases become current.
