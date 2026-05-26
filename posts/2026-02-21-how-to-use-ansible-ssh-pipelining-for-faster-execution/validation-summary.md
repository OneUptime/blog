# Validation Summary: How to Use Ansible SSH Pipelining for Faster Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible SSH connection plugin
- SSH pipelining
- OpenSSH ControlPersist
- sudoers `requiretty`
- Ansible playbooks and modules

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible connection methods and ControlPersist documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible module architecture and pipelining documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.raw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The post described module transfer as specifically SCP or SFTP and said pipelining collapses the work into a single SSH session. Updated this to match Ansible's current wording: the SSH connection plugin uses a configured transfer method, and pipelining reduces connection operations by piping many Python modules into the remote Python interpreter.
- The post said pipelining means "no temp files" without qualification. Updated this to "no temporary module file" for many Python modules, because Ansible's documentation scopes pipelining to Python modules and describes avoiding actual file transfers for those modules.
- The post said many RHEL and CentOS systems ship with `requiretty` enabled by default. Updated this to refer to older RHEL/CentOS systems and hardened sudoers configurations, which avoids presenting an outdated distribution default as current.
- The benchmark commands used environment assignment before `time`. Updated them to `time env ANSIBLE_PIPELINING=... ansible-playbook ...` so the examples are clearer and portable.
- The post described `[ssh_connection] retries = 3` as retrying the task up to three times. Corrected this: Ansible's SSH connection plugin retries SSH connection attempts only for SSH error return code 255; it is not a general task retry mechanism.
- The post said pipelining is purely beneficial with no downsides after removing `requiretty`. Softened this to recommend testing with the user's privilege escalation settings, because Ansible documents a conflict with `become`/sudo configurations.

## Review Notes
The example playbooks and Ansible configuration snippets are otherwise syntactically valid. The performance numbers are presented as the author's own benchmark, so they were reviewed for plausibility rather than independently reproduced.
