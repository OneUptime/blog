# Validation Summary: How to Perform a Minor Version Update (e.g., RHEL.2 to 9.4) on RHEL

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- Red Hat Subscription Manager
- RHEL BaseOS and AppStream repositories
- LVM snapshots

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9: Handling package management history: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_handling-package-management-history_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux Life Cycle: https://access.redhat.com/support/policy/updates/errata
- Red Hat Enterprise Linux Extended Update Support overview: https://access.redhat.com/articles/rhel-eus
- Red Hat Enterprise Linux for SAP Solutions 9: setting RHEL release locks and clearing DNF cache: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/proc_completing_post-installation_tasks_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index

## Issues Found
- The title contained `RHEL.2`, which appears to be a typo for `RHEL 9.2`. Updated the README title to use `RHEL 9.2`.
- The post implied that unsetting a release lock is the way to move specifically from RHEL 9.2 to RHEL 9.4. Unsetting the lock updates to the latest minor release available from the enabled repositories, which may be newer than 9.4. Updated the version-lock section to distinguish setting a specific target release from unsetting the lock for the latest available minor release.
- The release-lock commands did not clear cached DNF metadata after changing the release setting. Added `sudo dnf clean all` after `subscription-manager release --set` and `--unset`.
- The full-system update command used `dnf update`. Red Hat documentation accepts this wording in places, but `dnf upgrade` is the clearer command for upgrading installed packages to current repository versions. Updated the command and summary wording to `dnf upgrade`.
- The rollback section recommended `dnf history undo last` for a minor-version rollback. Red Hat documentation states that downgrading RHEL system packages with `dnf history undo` or `rollback` is not supported and can leave the system in an incorrect state. Removed that rollback command and kept the LVM snapshot restore path.

## Review Notes
The example repository IDs are correct for x86_64 RHEL 9 BaseOS and AppStream. The guide is still intentionally generic; production environments should also account for third-party repositories, EUS/E4S repository selection, application certification requirements, and tested backup/restore procedures before applying a RHEL minor update.
