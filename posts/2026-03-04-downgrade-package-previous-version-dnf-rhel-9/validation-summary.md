# Validation Summary: How to Downgrade a Package to a Previous Version Using DNF on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- DNF history undo and rollback
- DNF versionlock plugin
- DNF configuration
- RPM packages
- RHEL kernel package management
- GRUB and grubby

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 documentation, "Managing, monitoring, and updating the kernel": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF versionlock Plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- Red Hat Customer Portal solution, "Restricting a Package to a Fixed Version Number with yum": https://access.redhat.com/solutions/98873

## Issues Found
- The original post described `dnf history undo` as a preferred way to roll back an entire update transaction and stated that it would downgrade all upgraded packages. Red Hat documents that `history undo` attempts package downgrades only when older packages are available and explicitly says using `history undo` or `history rollback` to downgrade RHEL system packages is unsupported. Updated the wording to reflect that limitation and added examples of system packages that should not be treated as supported downgrade targets through history rollback.
- The post said `dnf history list` shows the last 20 transactions. The official RHEL examples describe it as listing DNF history, without a fixed 20-transaction guarantee. Changed the comment to "Show recent DNF transactions."
- The cache section implied that cached packages remain generally available for downgrades after upstream removal. Clarified that the RPM files remain locally available, but may need to be installed by file path if repository metadata no longer contains that version.
- The download section used `dnf download` without mentioning that it is a plugin-provided command. Added the documented `dnf install 'dnf-command(download)'` command before using it.
- The local RPM install example used `dnf localinstall`, a compatibility alias. Updated it to the current documented `dnf install /path/to/package.rpm` form.
- The real-world scenario originally said "updated everything" and then recommended undoing the entire transaction. Changed the scenario to a web-stack update and added a caution that `history undo` should not be used for unsupported system package downgrades.

## Review Notes
The package versions shown for `httpd` and kernel examples are illustrative and may not exist in every enabled RHEL 9 repository set. The commands are valid, but successful downgrades still depend on repository metadata, subscription access, enabled repositories, and whether the older RPM versions are available.
