# Validation Summary: How to Use Ansible to Automate New Server Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Debian/Ubuntu package provisioning with apt
- SSH hardening
- UFW firewall configuration
- NTP/time synchronization
- fail2ban
- sysctl security parameters
- logrotate
- Prometheus Node Exporter

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible community.general timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general locale_gen module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/locale_gen_module.html
- Ansible ansible.posix authorized_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible ansible.posix sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible community.general ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Debian OpenSSH systemd service source: https://sources.debian.org/src/openssh/1%3A10.0p1-7/debian/systemd/ssh.service
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases

## Issues Found
- The SSH handler used the `sshd` systemd service name. Because the post's examples are Debian/Ubuntu-oriented through `apt`, `ufw`, and `locale_gen`, this would fail on standard Debian/Ubuntu OpenSSH installations where the service unit is `ssh.service`. Changed the handler and notification to `restart ssh` and `name: ssh`.
- The example Node Exporter version was pinned to `1.7.0`, which is outdated. Updated it to the current upstream release, `1.11.1`.

## Review Notes
- Several modules are shown with short names. This is valid when the relevant collections are installed, but `community.general` and `ansible.posix` modules are not part of `ansible-core`; a production role should include collection requirements or use fully qualified collection names.
- The snippets assume the referenced templates and included task files exist, including `sshd_config.j2`, `ntp.conf.j2`, `jail.local.j2`, and `monitoring.yml`.
