# Validation Summary: How to Use Ansible for Chaos Engineering Experiments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux systemd service management
- Linux traffic control with `tc netem`
- `stress-ng` resource stress testing
- Prometheus HTTP API queries
- Chaos engineering experiment design

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `ansible.builtin.async_status` module documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/async_status_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `include_tasks` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- Ansible `now()` function documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- Linux `tc-netem` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Ubuntu `stress-ng` manual page: https://manpages.ubuntu.com/manpages/questing/man1/stress-ng.1.html

## Issues Found
- The service-kill example used `ansible.builtin.command` with shell command substitution. `command` does not process shell metacharacters, so it was changed to `ansible.builtin.shell` for that task and the service name is quoted.
- The service recovery check used `ansible.builtin.systemd` with only `name`, which is not a valid status-only invocation in current Ansible. It now uses `systemctl show --property=ActiveState --value` through `ansible.builtin.command` with `argv`.
- The failed recovery assertion would stop the play before the forced recovery task. The assertion now registers its result and ignores the assertion failure so recovery still runs.
- The Prometheus result display could fail when the query returned no series because it indexed `result[0]` before applying a default. It now checks the result length before indexing.
- The network latency example defined `target_port` and described port-specific database latency, but the `tc qdisc add ... root netem` command affects outgoing traffic on the whole interface. The unused variable and port-specific wording were removed.
- The network example could skip qdisc cleanup if the health check failed with an unexpected response. The health check now ignores errors so the cleanup task can run.
- The disk baseline task wrote a test file while declaring `changed_when: false`. It now reports the task as changed.
- The memory pressure example used `stress-ng` without installing it. An installation task was added.
- The reporting wrapper used `include_tasks` to include full playbooks, but `include_tasks` expects a task list. It now invokes the selected playbook with `ansible-playbook`.
- The reporting wrapper used `ansible_date_time` for completion time, which is gathered at play start and can become stale. It now uses Ansible's `now()` function for start and completion timestamps.

## Review Notes
The examples still assume Debian-family targets for `apt` package installation and systemd-based Linux hosts. The local workspace did not have `ansible-playbook`, `stress-ng`, or Ruby installed, so live Ansible syntax checks and local stress-ng help output could not be run. Static YAML parsing of all YAML code blocks passed with Python/PyYAML.
