# Validation Summary: How to Handle Ansible Task Timeouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible async tasks and polling
- Ansible task and connection timeout configuration
- Ansible block/rescue/always error handling
- GNU coreutils timeout command
- curl

## Sources Consulted
- Ansible asynchronous actions and polling: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible playbook keywords: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible async_status module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible copy module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible blocks and error handling: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- GNU coreutils timeout documentation: https://www.gnu.org/software/coreutils/timeout
- curl timeouts documentation: https://everything.curl.dev/usingcurl/timeouts.html

## Issues Found
- The post described `async`/`poll` as the primary way to set task timeouts. Current Ansible also has a `timeout` task keyword and `task_timeout` configuration setting. Changed the wording to describe `async`/`poll` as a common pattern for long-running tasks where async execution is supported.
- The `ansible.cfg` example implied there was a default async runtime setting. Official Ansible documentation says there is no default async time limit, but there is a default async poll interval. Replaced the inaccurate comment with `task_timeout = 300` and `poll_interval = 15`, and clarified which settings are connection-level versus task-level.
- The common patterns example used `async` with `ansible.builtin.copy`. Official Ansible documentation states that running the copy module asynchronously does not perform a background file transfer. Replaced that timeout example with a bounded `curl` download command and kept a separate non-async copy example with a note.
- The API health-check example only failed on curl process errors, not on non-200 HTTP statuses. Updated `failed_when` to also require the expected `200` response body from curl's `%{http_code}` output.
- The service restart timeout example used the systemd module with `async`. Replaced it with a `systemctl restart` command so the async timeout pattern applies to a command execution path.

## Review Notes
- Ansible's `async_status.finished` return value is boolean in ansible-core 2.19 and later, but older versions returned `1` or `0`. The post's `until: backup_result.finished` condition remains compatible with both forms.
- The examples are illustrative and use placeholder hosts, service names, artifact URLs, and webhook URLs. Those placeholders are technically plausible but must be adapted before production use.
