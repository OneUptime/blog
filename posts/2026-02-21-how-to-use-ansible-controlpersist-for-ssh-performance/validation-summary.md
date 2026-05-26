# Validation Summary: How to Use Ansible ControlPersist for SSH Performance

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Ansible SSH connection plugin
- OpenSSH ControlMaster, ControlPersist, and ControlPath
- SSH keepalive settings
- SSH ProxyJump / bastion hosts
- Ansible become and pipelining

## Sources Consulted
- Ansible official documentation: ansible.builtin.ssh connection plugin, including ssh_args, control_path, control_path_dir, ssh_common_args, and pipelining: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- OpenSSH ssh_config(5) manual page, including ControlMaster, ControlPath, ControlPersist, ServerAliveInterval, ServerAliveCountMax, ProxyJump, and token expansion: https://man.openbsd.org/ssh_config
- OpenSSH ssh(1) manual page, including multiplex control commands and the -S control socket option: https://man.openbsd.org/ssh
- Local OpenSSH client validation with `ssh -G` on OpenSSH_9.6p1.

## Issues Found
- The Ansible default `ssh_args` example omitted `-C`. Updated it to match the documented default: `-C -o ControlMaster=auto -o ControlPersist=60s`.
- The recommended ControlPath used `/tmp/ansible-cp-%h-%p-%r`. OpenSSH recommends putting control sockets in a directory not writable by other users, so the examples now use `~/.ansible/cp` with `chmod 700`.
- The recommended ControlPath used host/port/user expansion where `%C` is safer and shorter. Updated recommended examples to `~/.ansible/cp/ansible-cp-%C`.
- The socket management scripts tried to infer the host from the socket filename, which breaks for hyphenated hostnames and hashed `%C` paths. Updated them to use `ssh -S "$sock" -O check dummy` and `ssh -S "$sock" -O exit dummy`.
- The jump host section claimed ControlPersist applies to both the jump connection and target. OpenSSH documents that destination configuration is not generally applied to jump hosts, so the wording now says the target connection through the bastion is reused and notes that the bastion itself needs separate SSH config if it should be multiplexed across targets.
- The key exchange description implied Diffie-Hellman is the only key exchange family. Updated it to mention elliptic-curve methods as well.

## Review Notes
- The post remains technically relevant and useful.
- `pipelining = True` is valid, but Ansible documents that pipelining can conflict with sudo configurations that require a TTY.
- `ansible` was not installed in the local environment, so Ansible commands were checked against official documentation rather than executed locally.
