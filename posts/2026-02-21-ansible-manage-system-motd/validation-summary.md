# Validation Summary: How to Use Ansible to Manage System Motd (Message of the Day)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux MOTD files and dynamic MOTD scripts
- PAM `pam_motd`
- OpenSSH `sshd_config`
- Debian/Ubuntu and RHEL-family Linux administration
- Jinja2 templates
- Bash shell scripting

## Sources Consulted
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ubuntu `pam_motd` manual page: https://manpages.ubuntu.com/manpages/focal/en/man8/pam_motd.8.html
- Ubuntu Server `pam_motd` documentation: https://ubuntu.com/server/docs/reference/other-tools/pam-motd/
- Ubuntu `update-motd` manual page: https://manpages.ubuntu.com/manpages/focal/man5/update-motd.5.html
- Ubuntu OpenSSH `sshd_config` manual page: https://manpages.ubuntu.com/manpages/questing/man5/sshd_config.5.html
- OpenBSD/OpenSSH `sshd_config` manual page: https://man.openbsd.org/sshd_config
- Debian MOTD wiki reference: https://wiki.debian.org/motd

## Issues Found
- The post attributed the multi-part MOTD system to systemd-based systems. This is not specifically a systemd feature; dynamic MOTD behavior is primarily provided by PAM/distribution integration such as Debian/Ubuntu `pam_motd`. Updated the wording to describe modern Linux distributions, especially Debian/Ubuntu systems using `pam_motd`.
- The static MOTD playbook restarted the `sshd` service unconditionally. Debian/Ubuntu commonly use the `ssh` service name, while RHEL-family systems commonly use `sshd`. Added an `ssh_service_name` variable and used it in the handler.
- The static MOTD playbook set `PrintMotd yes`, which can duplicate MOTD output on systems where PAM also displays `/etc/motd`. Changed the SSH configuration to `PrintMotd no` and added `UsePAM yes` so PAM session modules can handle login messages consistently.
- The handler used `ansible.builtin.systemd`, which remains a backward-compatible alias, but Ansible documentation now recommends the `ansible.builtin.systemd_service` FQCN. Updated the handler to use `ansible.builtin.systemd_service`.

## Review Notes
- The examples are intentionally simple and assume common Linux defaults, such as PAM being configured to call `pam_motd` for SSH/login sessions.
- Some Ubuntu MOTD script names vary by release and installed packages, but the examples use plausible current names and safely tolerate missing files.
- The Ansible `copy` examples with inline `content` are acceptable for small snippets, though Ansible documentation recommends `template` for more advanced variable interpolation.
