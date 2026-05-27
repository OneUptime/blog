# Validation Summary: How to Use Ansible to Monitor Service Availability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: `command`, `service`, `wait_for`, `uri`, `set_fact`, `include_tasks`, and `cron`
- Linux service and process checks
- HTTP health checks
- Slack incoming webhooks
- Cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.set_fact` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible playbook block error handling documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Slack incoming webhooks documentation: https://api.slack.com/incoming-webhooks

## Issues Found
- The playbook defined `health_expected_body` and `health_expected_output` but did not validate either value. Updated the HTTP check to request response content when needed and fail if the expected body fragment is missing. Updated the command check to fail if the expected output is missing.
- A successful auto-restart did not allow the later port, health, and dependency checks to run because those checks still depended on the original failed `pgrep` result. Added `service_can_check` so a successful restart continues through the remaining checks.
- `max_restart_attempts` was defined in service variables but unused. Added retry handling to the service restart task so the variable has the intended effect when restart attempts fail.
- Dependency failures were recorded as warnings but did not prevent the final "All checks passed" result from being added. Updated the success condition to require no failed dependency checks.
- The alert host aggregation used a multi-line Jinja template that could produce a string instead of a list. Replaced it with explicit list initialization and per-host accumulation through `set_fact`.
- The example command for disabling auto-restart replaced `monitored_services` with an empty list and used check mode, which would skip the monitoring work rather than monitor without restart. Added `service_auto_restart_enabled` and updated the command to set it to `false`.
- The Slack payload included a `channel` field, but Slack app incoming webhooks cannot override the channel selected for the webhook. Removed the channel variable and payload field.

## Review Notes
The YAML snippets parse successfully. Ansible is not installed in the local workspace, so module and CLI behavior was verified against official documentation rather than by running `ansible-playbook --syntax-check`.
