# Validation Summary: How to Use max_fail_percentage in Ansible Playbooks

## Status
validated

## Post Type
Technical tutorial / deployment guide

## Technologies Covered
- Ansible playbooks
- Ansible error handling
- Ansible rolling updates with `serial`
- Ansible block/rescue error handling
- Ansible callback plugins

## Sources Consulted
- Ansible Core documentation: Error handling in playbooks, including `any_errors_fatal` and `max_fail_percentage`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible Community documentation: Playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Core documentation: Blocks and rescue behavior: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Community documentation: Callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible Community documentation: `ansible.posix.json` callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible source code for `max_fail_percentage` handling in the linear strategy: https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/strategy/linear.py

## Issues Found
- The post incorrectly stated that `max_fail_percentage` is calculated against the total number of hosts in the play when `serial` is used. Current Ansible documentation states that the setting applies to each `serial` batch. Updated the explanation, example math, Mermaid diagram, and deployment scenario text.
- The post incorrectly stated that `max_fail_percentage: 0` only aborts if all hosts fail. Ansible treats any unhandled failure as exceeding a zero threshold. Updated the zero-threshold section and clarified when `any_errors_fatal` is the clearer option.
- The rescue-block example used `max_fail_percentage: 15` with `serial: 5`, which would stop after the first failed host in a batch rather than allowing multiple per-host rollbacks. Changed it to `39` and updated the explanation so the second failed host in a 5-host batch stops the play.
- The JSON callback command used `ANSIBLE_STDOUT_CALLBACK=json`. Current Ansible documentation identifies the callback as `ansible.posix.json`, so the command and surrounding text were updated.

## Review Notes
The examples use short module names such as `uri`, `service`, `unarchive`, `synchronize`, and `fail`. These remain common in playbooks, though fully qualified collection names are preferred in formal Ansible documentation for clarity and linkability. The local environment did not have Ansible installed, so CLI validation was not available; review was performed against official documentation and Ansible source.
