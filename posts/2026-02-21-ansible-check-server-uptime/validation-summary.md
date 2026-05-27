# Validation Summary: How to Use Ansible to Check Server Uptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad-hoc commands
- Ansible playbooks and facts
- Jinja2 filters and conditionals in Ansible
- Linux uptime, who, uname, systemctl, date, journalctl, and /proc/loadavg commands
- CSV report generation with Ansible

## Sources Consulted
- Ansible ad-hoc commands documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- systemctl manual page: https://man7.org/linux/man-pages/man1/systemctl.1.html
- GNU Coreutils who documentation: https://www.gnu.org/software/coreutils/manual/html_node/who-invocation.html
- GNU Coreutils date documentation: https://www.gnu.org/software/coreutils/manual/html_node/Options-for-date.html

## Issues Found
- The fleet dashboard CSV referenced `kernel_version`, `last_boot`, and `uptime_status`, but the dashboard collection play only set `uptime_days`. I added the missing collection and categorization tasks so the generated report contains the fields it advertises.
- The dashboard play used `ansible_date_time.date` on `localhost` while `gather_facts` was disabled for that play. I changed the localhost play to gather facts so the filename timestamp is defined.
- The dashboard grouping used direct `selectattr` comparisons on values stored through templating, which can be string-like depending on Ansible version. I changed the grouping to explicit looped `set_fact` tasks with `| float` comparisons.
- The service-health example used the `systemd` module as a read-only status probe without required state-management parameters. I changed the checks to `ansible.builtin.command` with `systemctl is-active`, marked them unchanged, and kept `failed_when: false` so inactive services can be reported instead of aborting the play.
- The role-service check only evaluated the first group in `group_names`, which could miss services for hosts in multiple role groups. I changed the loop to collect services from all matching role groups.
- The maintenance verification example defined `maintenance_date` but ignored it, using `uptime_days < 2` instead. I added a timestamp conversion and boot-time calculation so the play actually checks whether the host booted after the configured maintenance date.
- The structured report IP expression could fail if both `ansible_host` and `ansible_default_ipv4.address` were unavailable. I added a nested default so the report remains renderable.

## Review Notes
- The examples are Linux-focused. Commands such as `who -b`, `/proc/loadavg`, `journalctl`, `systemctl`, and GNU `date -d` may need adjustments for non-Linux or non-GNU Unix targets.
- Ansible was not installed in the local environment, so I validated snippet syntax with Python YAML parsing and checked module behavior against official Ansible documentation rather than running the playbooks end to end.
