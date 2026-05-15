# Validation Summary: How to Automate GRUB2 Config Using the bootloader RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux System Roles
- `redhat.rhel_system_roles.bootloader`
- Ansible playbooks and ad hoc commands
- GRUB2 and `grubby`
- Linux kernel command-line parameters
- DNF reboot checks

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring the GRUB boot loader by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-the-grub-2-boot-loader-by-using-rhel-system-roles_managing-monitoring-and-updating-the-kernel
- Red Hat Automation Hub catalog: Red Hat Enterprise Linux System Roles collection: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Linux System Roles bootloader role documentation: https://linux-system-roles.github.io/bootloader/
- Linux kernel documentation: kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel documentation: Transparent Hugepage Support: https://docs.kernel.org/admin-guide/mm/transhuge.html
- Red Hat Enterprise Linux 9 documentation: Managing transparent huge pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance/
- Ansible documentation: Introduction to ad hoc commands: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates, `dnf needs-restarting`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates

## Issues Found
- The examples used the legacy standalone role name `rhel-system-roles.bootloader`. I changed the playbooks to the current Red Hat collection FQCN, `redhat.rhel_system_roles.bootloader`, matching Red Hat's documented collection usage.
- The installation verification listed `/usr/share/ansible/roles/` even though the examples now use the collection role name. I changed it to `ansible-galaxy collection list redhat.rhel_system_roles`.
- The database examples used `numa_balancing=0`. The Linux kernel documentation lists `numa_balancing=` allowed values as `enable` and `disable`, so I changed the value to `disable`.
- The verification section implied `cat /proc/cmdline` confirms changes immediately after the playbook run. I changed the wording and order so `grubby --info=DEFAULT` verifies updated boot loader entries, while `/proc/cmdline` is checked after reboot.
- The reboot-check command used `needs-restarting -r` directly. Red Hat RHEL 9 documentation shows the DNF subcommand form, so I changed it to `dnf needs-restarting -r`.

## Review Notes
The bootloader role examples intentionally leave reboots under operator control. If future versions of the post want the role to reboot automatically, add `bootloader_reboot_ok: true` and clearly call out that behavior.
