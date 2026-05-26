# Validation Summary: How to Configure become Timeout in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible privilege escalation (`become`)
- Ansible SSH connection plugin
- `ansible.cfg`
- YAML inventory and playbooks

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible privilege escalation guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible become plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/become.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible paramiko SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/paramiko_ssh_connection.html
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible precedence rules: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html

## Issues Found
- The post described a separate generic become timeout. Ansible's official documentation does not expose a generic `become_timeout` option; the relevant documented setting for typical SSH-based playbooks is the SSH connection timeout. I changed the explanation to state that connection timeout controls the wait while establishing and reading from the SSH connection, including become prompt/response waits.
- The playbook and inventory examples used `ansible_timeout`, which is not the documented variable for the built-in SSH connection plugin. I changed these examples to `ansible_ssh_timeout`.
- The environment variable examples used only `ANSIBLE_TIMEOUT`. While `ANSIBLE_TIMEOUT` is a documented default connection timeout, `ANSIBLE_SSH_TIMEOUT` is the documented SSH-specific override for the built-in SSH connection plugin. I changed the command examples to use `ANSIBLE_SSH_TIMEOUT` and noted both variables in the precedence section.
- The debugging section claimed that `-vvvv` shows exactly what Ansible sends to the remote host. I softened this to connection-level debugging detail, which matches the CLI documentation.

## Review Notes
The examples are now accurate for the built-in SSH connection plugin. Other connection plugins can expose different timeout variables, such as `ansible_paramiko_timeout` for Paramiko or persistent connection timeout settings for network devices.
