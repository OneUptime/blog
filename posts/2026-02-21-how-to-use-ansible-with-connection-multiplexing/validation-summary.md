# Validation Summary: How to Use Ansible with Connection Multiplexing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- OpenSSH
- SSH connection multiplexing
- Ansible configuration
- Bash commands

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- OpenSSH `ssh_config(5)` documentation: https://manpages.ubuntu.com/manpages/jammy/man5/ssh_config.5.html
- OpenSSH `ssh(1)` documentation: https://manpages.ubuntu.com/manpages/trusty/man1/ssh.1.html

## Issues Found
- The default Ansible `ssh_args` example omitted `-C`, even though Ansible documents the default as `-C -o ControlMaster=auto -o ControlPersist=60s`. I added `-C` to the default and optimized examples so the sample configuration does not accidentally drop Ansible's default compression option.
- The production `ControlPath` examples used predictable sockets under `/tmp`. OpenSSH recommends placing opportunistic multiplexing control sockets in a directory that is not writable by other users, so I changed the recommended paths and management examples to use `~/.ansible/cp`.
- The verification section said repeated `ESTABLISH SSH CONNECTION` messages mean multiplexing is not working. Ansible may log those lines for individual SSH client sessions even when the sessions reuse a master socket, so I changed the guidance to focus on mux reuse in verbose SSH output.
- The connection management section described `ssh -O stop` as a force-close command. OpenSSH documents `stop` as telling the master to stop accepting further multiplexing requests, while `exit` requests master exit, so I corrected the label.
- The different-users example used `become_user` to imply a separate SSH master connection. `become_user` changes the privilege escalation target, not the SSH login user. I changed the example to use `remote_user: deploy_user`.

## Review Notes
The post's core explanation of `ControlMaster`, `ControlPersist`, `ControlPath`, `%h/%p/%r`, `%C`, `ServerAliveInterval`, and `ServerAliveCountMax` is consistent with OpenSSH and Ansible documentation. The article could later mention Ansible's separate `control_path` and `control_path_dir` settings, including the current default hashed control path, but the existing `ssh_args` examples are valid.
