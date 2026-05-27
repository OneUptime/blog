# Validation Summary: How to Use Ansible to Configure Automatic Security Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ubuntu/Debian unattended-upgrades
- APT periodic updates
- RHEL/CentOS dnf-automatic
- systemd timers
- Linux reboot detection

## Sources Consulted
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible reboot module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ubuntu Server automatic updates documentation: https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- Red Hat RHEL DNF Automatic documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/automating-software-updates-in-rhel
- Red Hat RHEL DNF package exclusion documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index#proc_excluding-packages-from-dnf-operations_assembly_handling-package-management-history
- DNF Automatic upstream documentation: https://dnf.readthedocs.io/en/stable/automatic.html
- Red Hat needs-restarting guidance: https://access.redhat.com/solutions/27943

## Issues Found
- The rolling reboot example placed `serial: 1` under a task. `serial` is a play-level Ansible keyword, so the snippet would not be valid as written. Changed the example to a small play with `serial: 1` at play scope.
- The rolling reboot condition only checked Debian's `/var/run/reboot-required` result even though the previous section also showed a RHEL reboot check. Updated the condition to handle both Debian and RedHat families.
- The RHEL reboot check used `needs-restarting -r` without ensuring the helper package was present. Added a package task to install `yum-utils`, which provides the command on RHEL-family systems according to Red Hat guidance.
- The RHEL package exclusion example inserted `exclude = ...` under `[commands]` in `/etc/dnf/automatic.conf`. DNF package filtering uses `excludepkgs`, and `dnf-automatic` supports DNF main configuration overrides in its `[base]` section. Updated the example to set `excludepkgs = postgresql*,mysql*,redis*` under `[base]`.

## Review Notes
- The Ubuntu unattended-upgrades configuration, APT periodic schedule, allowed origins, package blacklist, email notification, and reboot settings align with Ubuntu documentation.
- The dnf-automatic installation, `upgrade_type = security`, `download_updates`, `apply_updates`, email emitter settings, and `dnf-automatic-install.timer` usage align with Red Hat and upstream DNF documentation.
- `ansible-doc` was not installed in the local environment, so Ansible details were verified against official online Ansible documentation.
