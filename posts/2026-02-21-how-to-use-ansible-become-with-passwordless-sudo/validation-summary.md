# Validation Summary: How to Use Ansible become with Passwordless sudo

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation with `become`
- Ansible playbooks and ad hoc commands
- sudo and sudoers configuration
- Linux service management
- UFW, fail2ban, unattended-upgrades, and SSH hardening

## Sources Consulted
- Ansible become documentation: https://docs.ansible.com/ansible/latest/user_guide/become.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible CLI documentation for `ansible`: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- sudoers manual: https://www.sudo.ws/docs/man/sudoers.man/
- visudo manual: https://www.sudo.ws/docs/man/visudo.man/
- Local `sudo`/`visudo` manual output for sudo 1.9.15p5

## Issues Found
- The bootstrap verification task used `become: false` together with `become_user`, but Ansible documents that `become_user` does not imply privilege escalation and is ignored unless become is enabled. Changed the task to `become: true` so the command is actually run as the deploy user before testing `sudo -n whoami`.
- The server-hardening playbook used the `sshd` service name while the surrounding example is Debian/Ubuntu-specific (`apt`, UFW, `/var/log/auth.log`). Changed the handler to restart the `ssh` service, which is the usual Debian/Ubuntu service name.
- The ad hoc verification command used `--become=false`, which is not a documented `ansible` CLI option. Replaced it with `-e ansible_become=false`, using the documented `ansible_become` connection variable to override the enabled-by-default become configuration.
- The secure sudo example used `Defaults !authenticate` while claiming all other users would require a password. In sudoers, `!authenticate` disables authentication and would make sudo passwordless more broadly. Replaced it with `Defaults authenticate` and adjusted the comment/task wording.
- The SSH key task used `ansible.builtin.authorized_key`, but the current documented module is `ansible.posix.authorized_key`. Updated the module FQCN.
- The troubleshooting command used `journalctl -u sudo`, but sudo is not normally a systemd unit. Replaced it with `journalctl -t sudo -n 20` to query journal entries by syslog identifier.

## Review Notes
The sudoers snippets were syntax-checked locally with `visudo -cf -`. The post is primarily Debian/Ubuntu-oriented because it uses `apt`, UFW, and `/var/log/auth.log`; future revisions could call that out explicitly if cross-distro examples are added.
