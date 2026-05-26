# Validation Summary: How to Set Up AWX Surveys for User Input

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX / Ansible Automation Platform Controller
- AWX job templates and surveys
- AWX REST API v2
- Ansible playbooks and extra variables
- curl
- JSON
- YAML

## Sources Consulted
- AWX job templates and surveys user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX OpenAPI schema documentation: https://docs.ansible.com/projects/awx/en/latest/open_api/index.html
- AWX API survey validation source: https://github.com/ansible/awx/blob/devel/awx/api/views/__init__.py
- AWX survey variable validation source: https://github.com/ansible/awx/blob/devel/awx/main/models/mixins.py
- awx.awx job_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/job_template_module.html
- Ansible retry / until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html

## Issues Found
- The post said Multiple Select survey answers are delivered as a newline-separated string. AWX validates multiselect runtime values as a list, so I changed the wording to say the variable receives a list of selected values.
- The deployment health-check task used `retries` and `delay` without an `until` condition. Current Ansible can retry without `until`, but older supported documentation required `until` for retry behavior. I added `register: health_check` and `until: health_check is succeeded` so the example works consistently.
- The post stated password survey values are never shown in logs and later implied they cannot be used in job output or debug statements. AWX treats password survey variables as sensitive and redacts them, but tasks can still consume the variable. I changed the wording to describe encryption/redaction and advise not relying on debug output to inspect them.

## Review Notes
The AWX API examples use the documented `/api/v2/job_templates/{id}/survey_spec/` endpoint and the `survey_enabled` job template field. The JSON survey examples are syntactically valid. `ansible-playbook` was not installed locally, so Ansible behavior was verified against official documentation and AWX source rather than local syntax-check execution.
