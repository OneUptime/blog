# Validation Summary: How to Use Ansible Ad Hoc Commands to Check Uptime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible command, shell, and setup modules
- Ansible inventory
- Linux uptime and /proc/uptime
- Bash shell scripting

## Sources Consulted
- Ansible ad hoc command documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI reference: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Linux uptime manual page: https://www.man7.org/linux/man-pages/man1/uptime.1.html
- Linux /proc/uptime manual page: https://www.man7.org/linux/man-pages/man5/proc_uptime.5.html

## Issues Found
- Fixed shell quoting in the hostname/pretty uptime example. The original double-quoted command used `$(hostname)` and `$(uptime -p)`, which would be evaluated by the local shell before Ansible ran. The command now uses single quotes around the module argument so command substitution happens on the managed host.
- Corrected the `ansible_date_time` wording. The original text said date/time facts include uptime info, but uptime is provided separately as `ansible_uptime_seconds`; `ansible_date_time` is useful for timestamp correlation.
- Fixed shell quoting in the "less than 1 day" filter example. The original command used local `$(awk ...)` command substitution inside double quotes. The command now passes the substitution to the remote shell while preserving the awk `$1` field reference.

## Review Notes
- The post is Linux-focused for examples that use `/proc/uptime`; the post already labels those examples as Linux-only.
- The local environment did not have Ansible installed, so CLI behavior was verified against official Ansible documentation rather than local `ansible --help` output.
