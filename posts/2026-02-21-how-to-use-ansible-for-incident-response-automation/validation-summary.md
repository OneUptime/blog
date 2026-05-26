# Validation Summary: How to Use Ansible for Incident Response Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: command, copy, file, service, uri, apt, find, user, include_tasks, debug
- community.general.ufw
- systemd journalctl and systemctl
- Linux process, socket, disk, memory, and package-management commands
- Slack incoming webhooks
- PagerDuty Events API v2
- Mermaid diagrams

## Sources Consulted
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible mandatory filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/mandatory_filter.html
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible loops, retries, and until documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- PagerDuty Events API v2 / rulesets endpoint documentation: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration
- Local command help for journalctl, systemctl, ss, pkill, find, and apt

## Issues Found
- The security breach playbook hard-coded `journalctl -u sshd`, which is not correct for all Linux distributions because Debian/Ubuntu commonly use the `ssh` service name. Changed it to `{{ ssh_service | default('sshd') }}` so the example remains valid while allowing the service unit to be overridden.
- The UFW containment tasks added a deny rule for all SSH before adding the management-network allow rule. UFW rules are order-sensitive, so the deny rule could shadow the intended allow rule. Reordered the tasks and inserted the allow rule at position 1 before adding the broader deny rule.
- The disk cleanup playbook described `apt autoremove -y --purge` as removing old kernels, but the command removes unused packages generally and is better represented with the Ansible apt module. Replaced the command with `ansible.builtin.apt` using `autoremove: yes` and `purge: yes`, and updated the task name accordingly.
- The PagerDuty Events API v2 enqueue endpoint accepts events with HTTP 202, while Ansible's uri module defaults to expecting HTTP 200. Added `status_code: 202` so successful PagerDuty incident creation is treated as success.

## Review Notes
The YAML examples parse successfully after the corrections. The playbooks are examples and still require environment-specific variables such as `management_network`, webhook secrets, service names, and health check ports. The `community.general.ufw` module is not part of ansible-core and requires the `community.general` collection and the `ufw` package on managed hosts.
