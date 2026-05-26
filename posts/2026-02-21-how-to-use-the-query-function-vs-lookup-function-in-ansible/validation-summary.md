# Validation Summary: How to Use the query Function vs lookup Function in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- Ansible `lookup()`, `query()`, and `q()` functions
- Jinja2 templating in Ansible playbooks
- Ansible `loop` and legacy `with_*` loops

## Sources Consulted
- Ansible Community Documentation: Lookup plugins, including `query`, `q`, `wantlist=True`, and lookup error handling: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible Core Documentation: Lookups, including `lookup`, `query/q`, and `wantlist`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_lookups.html
- Ansible Core Documentation: Loops, including ensuring list input for `loop` using `query` rather than `lookup`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html

## Issues Found
- The post stated that an empty string from `lookup('fileglob', ...)` would pass a truthy check because it is a string. Empty strings are falsy in Ansible/Jinja-style conditionals. Updated the comment to say the result is an empty string, which is falsy but still a string.

## Review Notes
The main distinction described in the post is correct: `query()`/`q()` is equivalent to `lookup(..., wantlist=True)` and is the safer choice for `loop`, while `lookup()` defaults to a string result for backward compatibility. The `errors` parameter behavior and migration guidance are consistent with current Ansible documentation.
