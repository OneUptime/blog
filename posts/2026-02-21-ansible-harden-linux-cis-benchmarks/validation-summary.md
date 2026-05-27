# Validation Summary: How to Use Ansible to Harden Linux Servers (CIS Benchmarks)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: copy, file, lineinfile, package, service
- ansible.posix.sysctl
- OpenSSH server configuration
- Linux sysctl hardening
- Linux modprobe.d configuration
- Linux login.defs password aging defaults
- cron access control
- CIS Benchmark Linux hardening concepts

## Sources Consulted
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible playbook tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- sshd_config(5) Linux manual page: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- modprobe.d(5) Linux manual page: https://www.man7.org/linux/man-pages/man5/modprobe.d.5.html
- login.defs(5) Linux manual page: https://www.man7.org/linux/man-pages/man5/login.defs.5.html
- Ubuntu CIS Benchmark overview: https://ubuntu.com/security/cis

## Issues Found
- Removed the `Protocol 2` OpenSSH task. Modern OpenSSH removed SSH protocol 1 support and associated configuration options, and current `sshd_config(5)` no longer documents `Protocol`, so adding it can break validation or restart on current distributions.
- Changed the cron allow task from `template` to `copy` with generated content. The article referenced `cron.allow.j2` but did not provide that template, so the playbook would fail as written.
- Updated the SSH restart handler to use `ssh` on Debian-family systems and `sshd` elsewhere. Ubuntu documentation uses `ssh.service`, while Red Hat-family systems conventionally use `sshd`.
- Added role tags in `site.yml` so the documented `ansible-playbook ... --tags cis-network` command actually selects the network role.
- Clarified the `login.defs` password aging tasks as defaults for newly created accounts. The `login.defs(5)` manual states these settings do not affect existing accounts.

## Review Notes
- The post remains a simplified example and does not implement a full CIS benchmark. Production use should include distro-specific conditionals for package and service names, validation with `sshd -t`, and explicit handling for existing user password aging.
- The `ansible.posix.sysctl` module is in the `ansible.posix` collection, which may need to be installed separately when using `ansible-core`.
- Local Ansible validation was not run because `ansible-playbook` and `ansible-doc` are not installed in this workspace.
