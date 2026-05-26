# Validation Summary: How to Use Ansible Delegation for API Calls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible task delegation
- ansible.builtin.uri
- REST API calls
- HTTP authentication
- Ansible Vault

## Sources Consulted
- Ansible delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible playbook strategy documentation for `serial`, `run_once`, and `throttle`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/index.html

## Issues Found
- The delegated monitoring API example used `{{ ansible_host }}` for the target host IP address. Ansible documentation notes that `ansible_host` and other connection variables can reflect the delegated host, not `inventory_hostname`, during delegated tasks. Changed it to `{{ hostvars[inventory_hostname].ansible_host | default(inventory_hostname) }}` so the API body describes the original app server.
- The HTTP 429 retry example used the same task's registered result in `delay` with `rate_limited_result.json.retry_after`. That is not a reliable tutorial pattern because `delay` is a task retry keyword, while the registered result is only created by the task execution. Changed it to a fixed 30-second retry delay.
- The webhook start notification used `run_once` with `serial: "25%"` but described the whole deployment. Ansible documents that `run_once` runs once per serial batch when `serial` is used. Updated the task name and Slack message to describe a batch start, and changed the target count to `ansible_play_batch | length`.

## Review Notes
`ansible-playbook` was not installed in the workspace, so I could not run a local syntax check. The examples were reviewed against official Ansible documentation, and the snippets are valid YAML by inspection. The post correctly recommends Ansible Vault and `no_log` for secrets, although a future security-focused revision could add `no_log: true` to selected credential-bearing examples.
