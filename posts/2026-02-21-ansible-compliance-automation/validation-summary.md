# Validation Summary: How to Use Ansible for Compliance Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: `include_role`, `lineinfile`, `file`, `template`, `apt`, `stat`, `command`, `service_facts`, `cron`
- `community.general.mail`
- OpenSSH server configuration
- CIS-style Linux compliance automation
- Cron-based scheduling

## Sources Consulted
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `stat` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible `command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.mail` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/mail_module.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config.5
- CIS Ubuntu Linux Benchmark page: https://www.cisecurity.org/benchmark/ubuntu_linux
- Ubuntu CIS hardening guidance for Ubuntu 22.04: https://documentation.ubuntu.com/aws/aws-how-to/instances/cis-hardening/

## Issues Found
- The original Ubuntu 22.04 CIS section included `Protocol 2` for OpenSSH. Current OpenSSH `sshd_config` documentation no longer lists `Protocol` as a valid daemon configuration keyword, and Ubuntu 22.04 uses OpenSSH 8.9. Replaced that task with a valid SSH configuration file permission task.
- The original post presented exact CIS control numbers that did not align cleanly with current Ubuntu 22.04 CIS benchmark versions. Changed the section wording to describe the tasks as a CIS-style baseline instead of a precise benchmark implementation.
- The SSH `lineinfile` examples only matched uncommented directives, so they could append duplicate settings when the default file had commented directives. Updated the regular expressions to match optional comments and whitespace.
- The SSH configuration edits did not validate `sshd_config` before writing. Added `validate: /usr/sbin/sshd -t -f %s` to the SSH `lineinfile` tasks.
- The audit and remediation examples used task-level keywords on `include_role` as though they applied to all tasks inside the role. Updated the examples to pass `check_mode` and `diff` through the `apply` option, matching Ansible's documented behavior.
- The audit example attempted to read `cis_results.results` from `include_role`, which is not a reliable per-task findings list. Removed that derived findings list and directed readers to the check-mode changed tasks.
- The reporting example used `approved_services` without defining it. Added an example `approved_services` variable.
- The SSH root login check searched for the substring `no` anywhere in `sshd -T` output, which could produce false positives. Updated it to match the specific `permitrootlogin no` line.
- The file permission check only verified that `stat.mode` existed. Added an expected permissions map and a findings list that compares each file's actual mode to the expected mode.
- The report template wrote into `./reports` without creating that directory. Added a directory creation task.
- The `community.general.mail` `attach` parameter was provided as a string, but the module documents it as a list of paths. Changed it to a list.
- The remediation logging example attempted to loop over `remediation_result.results` from `include_role`. Replaced it with a single remediation run log entry.

## Review Notes
- Ansible was not installed in the local environment, so module behavior was validated against official Ansible documentation rather than by executing `ansible-playbook`.
- The examples remain illustrative. Production CIS automation should pin the exact CIS benchmark version and profile, account for distribution-specific paths and service names, and test SSH changes in a separate session before closing existing access.
