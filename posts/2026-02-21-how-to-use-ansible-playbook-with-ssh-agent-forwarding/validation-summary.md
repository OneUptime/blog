# Validation Summary: How to Use Ansible Playbook with SSH Agent Forwarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory variables
- Ansible SSH connection plugin
- Ansible git and known_hosts modules
- OpenSSH ssh-agent, ssh-add, ForwardAgent, ProxyJump, and sshd_config
- GitHub SSH authentication testing
- sudo-based privilege escalation with Ansible become

## Sources Consulted
- Ansible ssh connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible known_hosts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible become documentation: https://docs.ansible.com/ansible/latest/user_guide/become.html
- OpenSSH ssh_config manual: https://man.openbsd.org/ssh_config.5
- OpenSSH ssh-agent manual: https://man.openbsd.org/ssh-agent.1
- OpenSSH ssh-add manual: https://man.openbsd.org/ssh-add.1
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config.5
- GitHub Docs, testing SSH connection: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection

## Issues Found
- The examples that used `become: yes` and then ran Git operations as another user did not preserve `SSH_AUTH_SOCK`, so forwarded-agent authentication could fail under sudo. Added `become_flags: '-E'` to the affected play examples and clarified that sudo must allow the environment variable to be preserved.
- The practical example added GitHub to the default known_hosts path while later running Git as the `deploy` user. Changed the known_hosts task to write `/etc/ssh/ssh_known_hosts`, which is a system-wide location documented by Ansible for Git-over-SSH use cases.
- The bastion section implied agent forwarding is what lets Ansible reach private hosts. Adjusted the wording to distinguish ProxyJump connectivity from agent forwarding on the final host.
- The bastion playbook comment said agent forwarding works through the bastion automatically. Reworded it to clarify that ProxyJump reaches the host and the forwarded agent is available on the final destination.

## Review Notes
The post still uses short module names such as `git`, `apt`, and `known_hosts`; these remain valid, though Ansible documentation recommends FQCNs such as `ansible.builtin.git` for unambiguous linking. The examples assume sudo as the become method when using `become_flags: '-E'`; other become methods may require different handling.
