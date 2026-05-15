# Validation Summary: How to Configure Automatic Crash Dumps with kdump Using RHEL System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- kdump
- Ansible
- kexec-tools
- makedumpfile
- NFS dump targets

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring automatic crash dumps by using the kdump RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-automatic-crash-dumps-by-using-the-kdump-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 10 documentation: Configuring automatic crash dumps by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/configuring-automatic-crash-dumps-by-using-rhel-system-roles
- Red Hat Enterprise Linux 8 documentation: Configuring kdump on the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-on-the-command-line_managing-monitoring-and-updating-the-kernel
- Red Hat Ecosystem Catalog: redhat.rhel_system_roles collection: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Upstream linux-system-roles kdump README: https://github.com/linux-system-roles/kdump/blob/main/README.md

## Issues Found
- The local dump target example incorrectly used `kdump_target` with `type: local` and `path: /var/crash`. The kdump role uses `kdump_path` for the vmcore path; `kdump_target` is for non-root filesystem targets such as raw devices, filesystems, SSH, or NFS. Changed the local example to `kdump_path: /var/crash`.
- The same example set `kdump_system_action: dump` under a comment about reserving 256 MB for the crash kernel. `kdump_system_action` controls the fallback action when saving the dump fails, and valid values are actions such as `reboot`, `halt`, `poweroff`, or `shell`. Removed the incorrect variable.
- The final paragraph claimed the role adjusts SELinux contexts for the dump target. The official role documentation and current upstream role implementation do not support that claim. Updated the sentence to state only that the role handles the crashkernel boot parameter when required.

## Review Notes
The post uses the legacy role name `rhel-system-roles.kdump`, which is still documented in RHEL package paths. Current Red Hat examples also show the collection-qualified role name `redhat.rhel_system_roles.kdump`, which would be a useful future modernization.
