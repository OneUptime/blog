# Validation Summary: How to Use Ansible set_stats to Pass Data to AWX/Tower

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.set_stats`
- AWX / Ansible Tower workflows
- AWX REST API
- Ansible configuration and environment variables
- Python `requests`

## Sources Consulted
- Ansible `ansible.builtin.set_stats` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- AWX workflow artifact passing documentation: https://ansible.readthedocs.io/projects/awx/en/24.6.1/userguide/workflows.html
- AWX REST API conventions and API versioning: https://docs.ansible.com/projects/awx/en/latest/rest_api/conventions.html
- AWX OpenAPI schema: https://docs.ansible.com/projects/awx/en/latest/open_api/

## Issues Found
- Corrected the description of where AWX exposes `set_stats` output. The values are stored as job artifacts and exposed from the job detail API resource, not as a separate "Extra Variables" artifact view.
- Corrected the deployment duration example. `ansible_date_time` is gathered once and does not update during the play, so the original calculation could report an incorrect duration. The example now records start and end times with the `pipe` lookup.
- Corrected workflow routing language. AWX routes workflow paths by job status; `set_stats` provides artifact data that downstream jobs can consume.
- Corrected the AWX API examples to retrieve `/api/v2/jobs/<id>/` and read the `artifacts` field instead of using a non-documented `/artifacts/` subresource.
- Corrected the `aggregate` explanation. The `set_stats` module defaults `aggregate` to `true`; `aggregate: false` is used when replacement behavior is desired.

## Review Notes
The YAML examples were parsed successfully after edits. Ansible itself is not installed in this workspace, so full `ansible-playbook --syntax-check` validation could not be run locally.
