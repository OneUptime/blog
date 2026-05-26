# Validation Summary: How to Use Ansible to Run Commands with Specific Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `environment` keyword
- Ansible `command`, `shell`, `apt`, `get_url`, and `debug` modules
- YAML configuration
- Proxy environment variables
- PATH manipulation
- Build tool environment variables for Node.js, Go, Java/Maven, and Rust

## Sources Consulted
- Ansible Core documentation: Setting the remote environment - https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible Community documentation: Playbook Keywords - https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Core documentation: Blocks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Community documentation: Asynchronous actions and polling - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_async.html
- Ansible Community documentation: ansible.builtin.command module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Community documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: Logging Ansible output and protecting sensitive data with `no_log` - https://docs.ansible.com/ansible/8/reference_appendices/logging.html

## Issues Found
- The play-level environment explanation said play-level values apply to all tasks. Ansible documents that play- and block-level environment values are available only to tasks in that play or block that execute as the same user, so the wording was narrowed to include that caveat.
- The `npm start` example used `async: 0` with `poll: 0`. Ansible asynchronous tasks require an `async` timeout value; `poll: 0` makes the task fire-and-forget until it completes, fails, or exceeds that timeout. Changed `async: 0` to `async: 300`.

## Review Notes
- The examples use `ansible_env.PATH`, which is valid, but Ansible documents a caveat: gathered `ansible_env` values depend on the user used when facts were gathered. This is especially important if a play later changes `remote_user` or `become_user`.
- The post correctly recommends `no_log: true` for tasks containing secrets, but Ansible also warns that environment variables are generally passed in clear text depending on the shell plugin, so they should not be treated as a secure secret transport by themselves.
