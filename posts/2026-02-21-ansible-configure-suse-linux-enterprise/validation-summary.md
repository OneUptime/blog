# Validation Summary: How to Use Ansible to Configure SUSE Linux Enterprise

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- community.general Ansible collection
- ansible.posix Ansible collection
- SUSE Linux Enterprise Server 15 SP5
- SUSEConnect registration and modules/extensions
- zypper package and repository management
- AppArmor
- firewalld
- chrony
- OpenSSH hardening
- Linux sysctl tuning

## Sources Consulted
- SUSE SLES 15 SP5 Deployment Guide, registering with SUSEConnect: https://documentation.suse.com/sles/15-SP5/html/SLES-all/cha-register-sle.html
- SUSE SLES 15 SP5 Modules and Extensions Quick Start: https://documentation.suse.com/sles/15-SP5/single-html/SLES-modules/index.html
- SUSE SLES 15 SP5 Security and Hardening Guide, firewalld: https://documentation.suse.com/en-us/sles/15-SP5/html/SLES-all/cha-security-firewall.html
- SUSE SLES 15 SP5 Security and Hardening Guide, AppArmor: https://documentation.suse.com/sles/15-SP5/html/SLES-all/cha-apparmor-start.html
- SUSE SLES 15 SP5 Administration Guide, NetworkManager and wicked support notes: https://documentation.suse.com/sles/15-SP5/html/SLES-all/cha-nm.html
- SUSE SLES 15 SP7 release notes and documentation index for current-version context: https://www.suse.com/releasenotes/x86_64/SUSE-SLES/15-SP7/
- Ansible community.general.zypper module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_module.html
- Ansible community.general.zypper_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_repository_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible ansible.builtin.setup, hostname, uri, cron, command, copy, lineinfile, service, and systemd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/

## Issues Found
- The introduction described the playbook as covering "SLES 15 SP5+" while the SUSEConnect module identifiers are hardcoded for 15.5/SP5. Changed the scope to "SLES 15 SP5" so the text matches the examples.
- The repository refresh task used `auto_import_keys: true` with `repo: '*'`. Official `community.general.zypper_repository` docs state `auto_import_keys` only affects new or changed repositories, while `repo: '*'` with `runrefresh: true` is the documented refresh-all pattern. Removed `auto_import_keys` from that task.
- The "Common Use Cases" text referred to "this module" even though the post is about a playbook, not a single Ansible module. Changed it to "this playbook."
- The infrastructure workflow used `ansible.builtin.timezone`, but the documented current FQCN for timezone management is `community.general.timezone`. Updated the task accordingly.
- The infrastructure workflow used UFW firewall tasks, which do not match the SLES guidance in the post or SUSE's firewalld default. Replaced the UFW tasks with `ansible.posix.firewalld` service rules and a `systemd` task enabling `firewalld`.

## Review Notes
The SP5 examples are technically consistent with SUSE's SLES 15 SP5 documentation. As of the review date, SLES 15 SP7 is the current SLES 15 service pack, so readers using newer service packs should update SUSEConnect product strings such as `15.5` to the service pack they are actually running.
