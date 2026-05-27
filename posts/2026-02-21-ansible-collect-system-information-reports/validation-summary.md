# Validation Summary: How to Use Ansible to Collect System Information Reports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and the `setup` module
- Ansible `shell`, `command`, `copy`, `set_fact`, `debug`, and `cron` modules
- Linux system inventory commands (`lsblk`, `df`, `ip`, `ss`, `systemctl`, `ps`, `dmidecode`, `rpm`, `dpkg`)
- Linux security audit commands (`getenforce`, `awk`, `find`, `grep`, `lastb`)
- Cron scheduling
- Mermaid diagrams

## Sources Consulted
- Ansible `setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- GNU Coreutils `df` documentation: https://www.gnu.org/software/coreutils/df
- Linux `lsblk(8)` manual page: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Local command help/man-page checks for `ip`, `ss`, `lsblk`, and `df`

## Issues Found
- The fleet inventory package-count command used `rpm -qa | wc -l 2>/dev/null || dpkg ...`. On Debian systems without `rpm`, the pipeline could still succeed because `wc -l` exits successfully, producing `0` and preventing the `dpkg` branch from running. Changed it to test `command -v rpm` and `command -v dpkg` explicitly before running the appropriate package manager command.
- The comprehensive report referenced package-count variables with chained defaults from OS-specific tasks. Replaced that with an explicit `installed_package_count` fact based on `ansible_os_family`, avoiding reliance on skipped-task registered variables having a usable `stdout`.
- The playbook collected `lsblk` block-device information but did not include it in the saved text report. Added a `BLOCK DEVICES` section using `disk_info.stdout` so the generated report matches the described storage coverage.
- The security report comment mentioned SELinux/AppArmor, but the task only checks SELinux on Red Hat-family systems. Updated the comment to say SELinux only.

## Review Notes
Ansible was not installed in the local workspace, so the playbooks could not be executed with `ansible-playbook --syntax-check`. Review was performed against official Ansible documentation and Linux command documentation/help output. The examples target Linux hosts and assume common tools such as `iproute2`, `systemd`, `ss`, and package-manager CLIs are installed on managed nodes.
