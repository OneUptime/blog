# Validation Summary: How to Use Ansible for Automated Remediation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and task includes
- AWX job template launches
- Prometheus Alertmanager routing and webhook receivers
- Prometheus alerting rules
- Linux service, disk, journal, and memory remediation commands

## Sources Consulted
- Ansible reusable artifacts documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible `uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- AWX job template and extra variables documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Linux `journalctl` manual page: https://man7.org/linux/man-pages/man1/journalctl.1%40%40systemd.html
- Linux kernel `drop_caches` documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux `ps` manual page: https://man7.org/linux/man-pages/man1/ps.1.html

## Issues Found
- Updated Alertmanager routing from deprecated `match` syntax to current `matchers` syntax.
- Replaced the deprecated/obsolete Alertmanager `bearer_token` style with current `http_config.authorization.credentials_file`.
- Changed the remediation webhook target from a direct AWX launch endpoint to an intermediate remediation webhook receiver, because Alertmanager sends its own webhook JSON payload and AWX job launches require launch-compatible input such as `extra_vars`.
- Added the missing PagerDuty receiver configuration referenced by the Alertmanager route.
- Moved `service_name` from an annotation to a label so the dispatcher can read it from `alert_labels`.
- Split the dispatcher into a localhost setup play and a target-host remediation play. The original version used `include_tasks` to include files that contained full plays with `hosts`, but Ansible task includes can only include task lists.
- Converted remediation snippets into task files so they work with `ansible.builtin.include_tasks`.
- Added host variables when using `add_host` so the target remediation play receives `remediation_type`, `service_name`, and `service_port`.
- Added an explicit `until` condition to the service health check retry loop.
- Quoted the templated service name in the `journalctl` command to avoid command argument parsing issues.
- Replaced the zombie-process kill command. Zombie processes are already terminated and cannot be killed directly, so the remediation now records them for follow-up instead of claiming to kill them.
- Fixed the cooldown check so it does not depend on `ansible_date_time` facts when `gather_facts: false` is used.
- Adjusted the daily remediation count command to count only log entries from the current date and parenthesized the Ansible filter expressions in the comparison.

## Review Notes
- The examples are now technically consistent, but a production implementation should still include a real webhook adapter that validates Alertmanager payloads, maps alert fields into AWX `extra_vars`, authenticates requests, logs each remediation attempt, and handles AWX job launch failures.
- The memory cleanup example uses Linux `drop_caches`, which is valid but can hurt performance and is generally better reserved for carefully controlled operational runbooks.
