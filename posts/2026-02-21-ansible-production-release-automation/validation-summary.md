# Validation Summary: How to Use Ansible for Production Release Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: uri, assert, command, pause, copy, include_role, include_tasks
- community.general.slack
- Consul KV and sessions for deployment locking
- Prometheus HTTP API and PromQL
- PagerDuty REST API
- Load balancer based rolling and blue-green deployment workflows

## Sources Consulted
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible playbook strategy, serial, and max_fail_percentage documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible lookup plugin error handling documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible role reuse and include_role documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- community.general.slack module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- Consul KV HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/kv
- Consul Session HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/session
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- PagerDuty List Incidents API documentation: https://developer.pagerduty.com/api-reference/9d0b4b12e36f9-list-incidents

## Issues Found
- The smoke test command registered `smoke_tests.rc`, but Ansible's command module fails the task on a non-zero return code by default. This meant the release tracking task would not run with the intended `degraded` status. Added `failed_when: false` so the following task can record either success or degraded status.
- The Consul lock task used the atomic `?acquire=` API but did not verify the boolean response. Consul returns `true` or `false` for KV writes and lock acquisition, so the playbook could continue after a failed lock acquisition. Added `return_content: true`, registered the response, and asserted that the returned content is `true`.
- The blue-green example used `lookup('file', '/opt/deploy/current_color') | default('blue')`. Ansible lookups use strict error handling by default, so a missing marker file would fail before `default` could apply. Updated it to use the FQCN lookup with `errors='ignore'`, `default('blue', true)`, and `trim`.
- The blue-green section claimed "instant rollback" and the pause prompt said pressing Ctrl+C then `A` would "abort and rollback." Ansible pause aborts the play; it does not run a rollback unless rollback tasks are implemented. Reworded the surrounding text and prompt to describe the implemented behavior accurately.
- The release lock snippet comment said it acquired and released locks, but the snippet only acquires a lock. Updated the comment to avoid implying release logic that is not present.

## Review Notes
The examples are intentionally infrastructure-specific and depend on caller-provided APIs, inventory groups, variables, and roles such as `app_deploy` and `tasks/deploy-color.yml`. The Ansible module usage, rolling deployment controls, Slack module parameters, PagerDuty incident status query shape, Prometheus query endpoint, and Consul lock API usage are now aligned with current official documentation.
