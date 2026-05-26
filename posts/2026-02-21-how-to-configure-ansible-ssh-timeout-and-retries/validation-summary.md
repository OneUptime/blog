# Validation Summary: How to Configure Ansible SSH Timeout and Retries

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible configuration
- Ansible SSH connection plugin
- OpenSSH client options
- Ansible task retries
- Ansible reboot, wait_for_connection, uri, get_url, wait_for, apt, async, and async_status modules
- Ansible callback plugins
- Ansible persistent connections

## Sources Consulted
- Ansible Configuration Settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.ssh connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- ansible.builtin.wait_for_connection module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- ansible.builtin.reboot module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible task retry documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html#retrying-a-task-until-a-condition-is-met
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- ansible.netcommon persistent connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/persistent_connection.html
- ansible.builtin.get_url module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- OpenSSH ssh_config manual: https://man.openbsd.org/ssh_config

## Issues Found
- The SSH retry explanation implied that `retries = 3` retries every connection failure three additional times. Updated it to say this setting makes up to three SSH connection attempts and that Ansible retries SSH only when SSH exits with return code 255, matching the current ssh connection plugin documentation.
- The total retry timing claim did not account for SSH retry overhead. Updated it to describe the 90 seconds as connection-attempt timeout time plus any SSH retry overhead.
- The `[persistent_connection]` example used `idle_timeout`, which is not a valid current Ansible configuration key. Replaced it with `connect_retry_timeout`, which is the documented persistent connection socket retry timeout.
- The callback example used `callback_whitelist`, an older configuration name. Replaced it with the current `callbacks_enabled` key.
- The retry-file section stated that Ansible creates `.retry` files whenever a playbook fails. Current Ansible defaults `retry_files_enabled` to `False`, so the text now says retry files are created when retry files are enabled.

## Review Notes
- The post uses short module names such as `reboot`, `uri`, and `get_url`. These remain valid for ansible-core modules, although current Ansible documentation recommends FQCNs for easier linking and to avoid collection name conflicts.
- `reboot_timeout` can be evaluated separately for reboot verification and test command success, so the reboot module can run for up to twice the configured value in some cases. The post's example remains usable, but future revisions could mention this caveat.
