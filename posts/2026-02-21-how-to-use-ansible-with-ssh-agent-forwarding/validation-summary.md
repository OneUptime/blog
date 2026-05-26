# Validation Summary: How to Use Ansible with SSH Agent Forwarding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenSSH
- SSH agent forwarding
- ssh-agent and ssh-add
- ansible.builtin.ssh connection plugin
- ansible.builtin.git module
- sudoers environment preservation

## Sources Consulted
- Ansible ansible.builtin.ssh connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- OpenBSD/OpenSSH ssh_config(5) manual for ForwardAgent: https://man.openbsd.org/ssh_config
- OpenBSD/OpenSSH ssh-add(1) manual for key lifetime and confirmation flags: https://man.openbsd.org/ssh-add
- OpenBSD/OpenSSH sshd_config(5) manual for AllowAgentForwarding: https://man.openbsd.org/sshd_config
- Sudo sudoers manual for env_keep behavior: https://www.sudo.ws/docs/man/1.9.12/sudoers.man/
- Local OpenSSH manual pages and CLI output on OpenSSH_9.6p1

## Issues Found
- The Git examples used `accept_hostkey: yes`, which works but disables strict host key checking. Updated the examples to `accept_newhostkey: yes`, the safer current Ansible option for OpenSSH 7.5+ that accepts only new or unchanged host keys.
- The playbook method mentioned `environment` as if it were a playbook-level way to enable SSH agent forwarding. Updated the wording to refer to SSH connection variables, matching Ansible's documented connection options.
- The `become` example said the task ran as root while the task set `become: no`. Updated the comment and removed the ineffective `become_user` line so the example accurately shows running the Git task as the SSH connection user to access the forwarded agent.
- The security section claimed agent forwarding could be enabled only for a single task with task-level connection variables and `SSH_AUTH_SOCK`. Ansible SSH connection options apply to SSH connections rather than reliably changing an already-open connection for one task. Updated the text and example to recommend limiting forwarding to specific plays or inventory groups.

## Review Notes
- The article is now technically valid for current Ansible and OpenSSH behavior.
- `accept_newhostkey` requires ansible-core 2.12+ and OpenSSH 7.5+; older environments may need the less-safe `accept_hostkey` option or pre-populated `known_hosts` entries.
