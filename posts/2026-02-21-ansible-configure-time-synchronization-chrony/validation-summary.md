# Validation Summary: How to Use Ansible to Configure Time Synchronization (chrony)

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible
- chrony / chronyd
- NTP time synchronization
- systemd services
- firewalld
- Linux timezone configuration
- Amazon Time Sync Service

## Sources Consulted
- chrony 4.8 chrony.conf(5): https://chrony-project.org/doc/4.8/chrony.conf.html
- chrony 4.8 chronyc(1): https://chrony-project.org/doc/4.8/chronyc.html
- Ansible ansible.builtin.systemd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- AWS EC2 documentation for Amazon Time Sync Service with chrony: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-ec2-ntp.html

## Issues Found
- The main playbook used `/etc/chrony.conf`, `chronyd`, and the `chrony` user/group for all distributions. AWS and distro documentation show Ubuntu/Debian-style systems use `/etc/chrony/chrony.conf` and `chrony.service`; Debian chrony commonly runs as `_chrony`. Added distro-specific variables for the config path, service name, and runtime user/group, and used those variables in the template, log directory, and systemd tasks.
- The internal NTP server example used the shared `chrony.conf.j2` template but did not define `chrony_max_offset` or `chrony_log_dir`, which the template requires. Added those variables and the same distro-specific config path and service name variables to the server playbook.
- The monitoring example parsed `chronyc -c tracking` field index 4 as the offset and field index 3 as `chrony_last_update`. In chrony CSV output, field 3 is the reference time and field 5 is the last offset. Updated the offset index and renamed the timestamp fact to `chrony_ref_time`.

## Review Notes
The examples are technically valid after the fixes. The `ansible.builtin.systemd` FQCN is still accepted as an ansible-core redirect to `ansible.builtin.systemd_service`. The post assumes the `ansible.posix` and `community.general` collections are available for the `firewalld` and `timezone` modules. I could not run an Ansible syntax check in this workspace because `ansible-playbook` is not installed.
