# Validation Summary: How to Use Ansible to Configure System Health Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible playbooks, roles, facts, and task includes
- Ansible builtin modules: command, shell, setup, set_fact, file, template, systemd_service, wait_for, uri
- Linux CPU, memory, disk, service, and TCP port checks
- GNU coreutils df
- Slack incoming webhooks
- Cron

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/template_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- GNU coreutils df manual: https://www.gnu.org/software/coreutils/df
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

## Issues Found
- The CPU usage check used `top ... awk '{print $2}'`, which reports only one CPU field on common `top` output rather than total CPU utilization. Replaced it with a `/proc/stat` two-sample calculation and used that value for the CPU percentage.
- The load average condition recalculated load per core inline. Added a `load_per_core` fact and evaluated thresholds against that value so the documented "multiplier of CPU count" behavior is explicit.
- The memory check calculated one `memory_used` value but evaluated `ansible_memory_mb.real.used`, which includes buffers/cache and can overstate application memory pressure. Updated the check to use `ansible_memory_mb.nocache.used` consistently.
- The project structure listed `ports.yml` and the variables included `health_required_ports`, but the role never included a port check. Added a listening port check and included it from `main.yml`.
- The report task referenced `health-report.j2` but the post did not provide a template and the playbook-level task would not automatically resolve a template under a role directory. Added the template to the structure, included its contents, and changed the task to use `roles/health-check/templates/health-report.j2`.
- The localhost report play had `gather_facts: no` but used `ansible_date_time.date`, which requires gathered facts. Changed the play to gather facts and explicitly load `group_vars/all.yml` so report and Slack variables are available on localhost.
- The Slack task was described as sending only when issues were found, but its condition only checked for a webhook URL. Added a `health_issues_found` fact and used it in the `when` condition.
- The Slack payload included a `channel` override, but Slack app incoming webhooks inherit their configured channel and cannot override it in the payload. Removed the `health_slack_channel` variable and `channel` field.
- Updated the service check from the older `ansible.builtin.systemd` module name to the current `ansible.builtin.systemd_service` FQCN used by the official documentation.

## Review Notes
All YAML snippets were parsed successfully with Python's YAML parser. `ansible-playbook --syntax-check` could not be run because Ansible is not installed in this environment. Future improvements could add HTTP endpoint checks with `ansible.builtin.uri`, unreachable-host handling in the report play, and a swap usage threshold instead of always recording swap as OK.
