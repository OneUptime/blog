# Validation Summary: How to Use Ansible to Configure Tuned Profiles for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- TuneD and `tuned-adm`
- Linux sysctl, CPU, VM, disk, and network tuning
- Cron-based operational automation
- PostgreSQL and MySQL database host tuning considerations

## Sources Consulted
- TuneD project manual: https://tuned-project.org/docs/manual.html
- Red Hat Enterprise Linux 10 TuneD documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/monitoring_and_managing_system_status_and_performance/optimizing-system-performance-with-tuned
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.yum` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/yum_module.html
- PostgreSQL resource consumption documentation: https://www.postgresql.org/docs/17/runtime-config-resource.html
- MySQL large page support documentation: https://dev.mysql.com/doc/refman/9.5/en/large-page-support.html
- Linux Transparent Hugepage documentation: https://docs.kernel.org/admin-guide/mm/transhuge.html

## Issues Found
- The custom profile playbook wrote profiles under `/etc/tuned/{{ item.name }}`. Current TuneD documentation uses `/etc/tuned/profiles/<profile-name>` for custom profiles, with distribution profiles under `/usr/lib/tuned/profiles`. Updated both the directory creation and template destination paths to `/etc/tuned/profiles/{{ item.name }}`.
- The tip about database servers stated that both PostgreSQL and MySQL documentation recommend disabling transparent huge pages. PostgreSQL explicitly discourages THP on Linux, but the MySQL manual documents explicit HugeTLB large-page support rather than a direct THP disable recommendation. Reworded the tip to avoid overstating the MySQL documentation.

## Review Notes
The TuneD commands (`tuned-adm list`, `active`, `recommend`, `profile`, and `verify`) and the TuneD profile options shown in the template are valid in current TuneD documentation. The Ansible examples use valid built-in module names and parameters. The benchmark commands are illustrative and basic; future improvements could make the disk device and benchmark path configurable for systems that do not use `/dev/sda` or have limited `/tmp` space.
