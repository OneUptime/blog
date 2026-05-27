# Validation Summary: How to Use Ansible to Configure SSH Server Settings

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and modules
- OpenSSH server configuration
- SSH authorized keys
- Linux service management
- UFW firewall rules
- SELinux port labeling
- Jinja2 templates
- Mermaid diagrams

## Sources Consulted
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible POSIX `authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible Community General `ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible Community General `seport` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/seport_module.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `sshd(8)` manual: https://man.openbsd.org/sshd
- OpenSSH release notes for `ChallengeResponseAuthentication` deprecation: https://www.openssh.com/releasenotes.html

## Issues Found
- Replaced `ChallengeResponseAuthentication no` with `KbdInteractiveAuthentication no`. OpenSSH keeps the old name as a deprecated alias, but current OpenSSH documentation and release notes prefer `KbdInteractiveAuthentication`.
- Changed the SFTP subsystem example from `/usr/lib/openssh/sftp-server` to `internal-sftp`. The original path is distribution-specific; `internal-sftp` is documented by OpenSSH and avoids path differences such as `/usr/libexec/openssh/sftp-server`.
- Made the service name configurable with `ssh_service_name`, using `ssh` on Debian-family hosts and `sshd` elsewhere. The original snippets used only `sshd`, which is not correct for common Debian and Ubuntu systems.
- Updated validation and verification commands to use `/usr/sbin/sshd`. This matches the OpenSSH daemon location used by common Linux distributions and the Ansible module example for safe sshd configuration updates.
- Guarded the SELinux port update with `ansible_selinux is defined` so the task does not fail before `ignore_errors` can help on hosts where that fact is unavailable.

## Review Notes
The examples are technically sound after the corrections. In a production role, the remaining portability details worth considering are distro-specific drop-in files under `/etc/ssh/sshd_config.d`, firewall systems other than UFW, and testing the new SSH port in a separate connection before restarting or closing the current session.
