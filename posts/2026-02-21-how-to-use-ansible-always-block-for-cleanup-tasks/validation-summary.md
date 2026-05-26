# Validation Summary: How to Use Ansible always Block for Cleanup Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible block, rescue, and always sections
- Ansible built-in modules: file, tempfile, get_url, command, template, copy, systemd_service, apt, set_fact, lineinfile, uri, debug
- YAML

## Sources Consulted
- Ansible block error handling documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible tempfile module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/tempfile_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible logging and no_log documentation: https://docs.ansible.com/ansible/latest/reference_appendices/logging.html
- Ansible facts and ansible_date_time documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- The introduction said the `always` section runs "no matter what." Official Ansible documentation notes that invalid task definitions and unreachable hosts do not trigger block error handling. Updated the wording to include that caveat.
- The sensitive credential and API examples handled secrets without `no_log`. Added `no_log: true` to tasks that expose downloaded credentials, decrypted credentials, API credentials, bearer tokens, and protected headers.
- The temporary credential cleanup task said it cleared cached decrypted data. `set_fact` overwrites a host variable but does not reliably erase prior output from logs or all in-memory result data. Renamed the task to "Overwrite decrypted data fact" and protected it with `no_log`.
- The lock example used `ansible.builtin.copy` with `force: false` and commented that it fails if the lock already exists. The copy module does not provide exclusive lock acquisition that way. Replaced the example with an atomic lock-directory acquisition using `mkdir`, then writing owner metadata inside the directory.
- The service examples used `ansible.builtin.systemd`. Current Ansible documentation says this is an alias/redirect to `ansible.builtin.systemd_service`; updated examples to use `systemd_service`.
- The health check retry example used `retries` and `delay` without an explicit `until`. Added `until: health_check.status == 200` to match the established Ansible retry pattern and work beyond only newer retry behavior.
- The deployment duration example used `ansible_date_time.epoch` for both start and end times. Official docs warn that `ansible_date_time` is captured when facts are gathered and can become stale. Updated the duration calculation to use `lookup('pipe', 'date +%s')`.
- The API token cleanup task said it cleared the token from memory. Updated the task name to "Overwrite token fact" because `set_fact` overwrites the variable rather than guaranteeing complete memory cleanup.

## Review Notes
All YAML snippets were parsed successfully with PyYAML. `ansible-playbook` is not installed in this environment, so full Ansible syntax checking was not run locally.
