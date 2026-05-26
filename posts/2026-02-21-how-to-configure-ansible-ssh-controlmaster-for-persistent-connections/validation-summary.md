# Validation Summary: How to Configure Ansible SSH ControlMaster for Persistent Connections

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ansible
- OpenSSH
- SSH ControlMaster
- SSH ControlPersist
- SSH ControlPath
- Ansible pipelining
- Ansible asynchronous tasks

## Sources Consulted
- Ansible latest documentation: ansible.builtin.ssh connection plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible latest documentation: ansible.builtin.async_status module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- OpenBSD/OpenSSH ssh_config(5) manual, https://man.openbsd.org/OpenBSD-7.7/ssh_config.5
- OpenBSD/OpenSSH ssh(1) manual, https://man.openbsd.org/OpenBSD-7.7/ssh.1
- OpenSSH 6.7 release note reference for %C token, https://www.openssh.com/releasenotes.html

## Issues Found
- The introduction implied every Ansible task always creates a fresh SSH connection. Current Ansible's SSH connection plugin defaults to `-C -o ControlMaster=auto -o ControlPersist=60s`, so the wording was changed to describe behavior without persistent SSH connections.
- The basic configuration section implied ControlMaster must be enabled from scratch. It was corrected to state that Ansible enables ControlMaster and 60-second ControlPersist by default, while still showing how to tune the settings.
- The "Default Ansible Control Path" section showed the older host/user/port template as the default. Current Ansible leaves `control_path` unset by default and generates a unique hash, so the section was corrected and the explicit example now uses `%%C`.
- The `%%C` explanation listed the older OpenSSH hash tuple and omitted the jump-host token now documented by OpenSSH. It was generalized to "connection parameters" to remain accurate across OpenSSH versions.
- The raw `ssh -O check` example used `%%C`, which is appropriate inside `ansible.cfg` interpolation but not as a direct OpenSSH command-line token. It was changed to `%C`.
- A host reboot cleanup comment described removing a specific host socket, but the command removed all Ansible control sockets. The comment was corrected.
- The stale socket cleanup command searched only for `*.sock` files, but Ansible's default hashed socket names do not use that suffix. It was changed to use `find ... -type s`.
- The async task example referenced `result.ansible_job_id` without registering the long-running task. Added `register: result`.

## Review Notes
- Enabling Ansible pipelining is technically valid, but it can conflict with privilege escalation on systems that require `requiretty`.
