# Validation Summary: How to Handle Ansible Playbook Failures in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible block/rescue/always error handling
- Ansible rolling deployments with serial and max_fail_percentage
- Ansible built-in modules: service, git, pip, command, shell, uri, apt, apt_repository, assert, wait_for, get_url, copy, lineinfile
- Incident response and rollback patterns

## Sources Consulted
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible playbook strategy documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible loops and retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html

## Issues Found
- The database migration task used `run_once: true` inside a play with `serial: "25%"`. Ansible runs `run_once` tasks once per serial batch, not once for the whole play, so the example could run migrations multiple times. Added `when: inventory_hostname == ansible_play_hosts_all[0]` to keep the task to one host for the full play.
- The health-check retry examples used `retries` and `delay` without an explicit `until` condition. Current Ansible supports retries without `until`, but older supported Ansible versions force retries to one attempt without `until`. Added registered results and explicit `until` checks for clearer and more portable behavior.
- The pre-flight repository check used `ansible.builtin.git` with `clone: no` and `update: no`, which would not verify access to a repository or revision when the destination checkout did not already exist. Replaced it with `git ls-remote --exit-code` via `ansible.builtin.command` using `argv`.
- The diagnostics task used `ansible.builtin.command` for a command containing a pipe (`ps aux --sort=-%mem | head -20`). Ansible's command module does not process shell metacharacters. Changed the task to `ansible.builtin.shell`.
- The diagnostic bundle rendered `result.cmd | join(' ')`, which is not reliable after switching to `shell` because the command is a string. Changed the label to use `result.item`, the loop value.

## Review Notes
The examples are now technically valid against current Ansible documentation. In a real production playbook, database migrations and rollback semantics still need application-specific safeguards, especially around whether migrations are reversible and whether health checks should be executed from the target host or an external load-balancer perspective.
