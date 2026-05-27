# Validation Summary: How to Use Ansible for On-Call Runbook Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: systemd_service, shell, command, copy, uri, pause, apt, find, file, package_facts
- community.docker.docker_prune
- community.postgresql.postgresql_query
- PostgreSQL pg_stat_activity and pg_terminate_backend
- PagerDuty Events API v2
- Linux systemd, journalctl, df, ps, ss, and shell commands

## Sources Consulted
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.package_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.pause module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible built-in collection index for include_tasks behavior: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- community.docker.docker_prune module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_prune_module.html
- community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- PagerDuty Events API v2 reference: https://developer.pagerduty.com/api-reference/368ae3d938c9e-send-an-event-to-pager-duty

## Issues Found
- The restart-service playbook used `ansible.builtin.systemd`. This is still a compatibility alias, but current Ansible documentation identifies `ansible.builtin.systemd_service` as the module name and notes that `systemd` redirects to it. Updated the examples to use `ansible.builtin.systemd_service`.
- The restart-service diagnostic shell command interpolated `service_name` directly into shell commands. Added the Ansible `quote` filter where the variable is passed to `grep` and `journalctl`.
- The Docker cleanup task checked `ansible_facts.packages` without first gathering package facts. Added an `ansible.builtin.package_facts` task before the Docker prune condition.
- The application release cleanup shell command interpolated `app_releases_dir` without shell quoting. Added the Ansible `quote` filter.
- The PostgreSQL examples used the deprecated `db` alias for `community.postgresql.postgresql_query`. Replaced it with `login_db`, which is the documented current parameter.
- The PostgreSQL examples embedded `db_name` directly into SQL strings. Replaced those filters with `%(db_name)s` placeholders and `named_args`, matching the module's documented parameterization support.
- The PagerDuty auto-remediation example used `include_tasks` to include files that were written as full playbooks. Replaced that task with an `ansible.builtin.command` call using `argv` to launch the selected runbook playbook with extra vars.
- The PagerDuty Events API v2 acknowledgement request did not account for the API's accepted response. Added `status_code: 202` to the `uri` task.

## Review Notes
- Ansible was not installed in the local environment, so a full `ansible-playbook --syntax-check` could not be run. I verified the examples against official documentation and parsed all YAML code blocks successfully with PyYAML.
- The playbooks are illustrative runbooks and still require environment-specific values such as inventory, `lb_api`, `health_check_port`, `db_name`, `target_service`, and PagerDuty integration keys.
