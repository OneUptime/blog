# Validation Summary: How to Resolve 'Transaction Check Error' with DNF on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package manager
- RPM package manager and RPM database
- dnf-utils/package-cleanup

## Sources Consulted
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Red Hat Enterprise Linux 10 documentation, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/index
- RPM manual page: https://rpm.org/docs/6.0.x/man/rpm.8
- rpmdb manual page: https://rpm.org/docs/6.0.x/man/rpmdb.8
- package-cleanup manual page for dnf-utils: https://www.mankier.com/1/package-cleanup

## Issues Found
- The post used `sudo dnf list --duplicates` to check for duplicate packages. DNF documents duplicate-package checks under `dnf repoquery --duplicates`, while `dnf list` documents modes such as `--installed`, `--available`, `--extras`, `--obsoletes`, `--recent`, `--upgrades`, and `--autoremove`. Changed the command to `sudo dnf repoquery --duplicates`.
- The RPM database section described `rpm -qa | wc -l` as "Verify the database." That command only verifies that the RPM database can be queried and counts matching installed-package records. Updated the comment to "Verify that the database can be queried."

## Review Notes
The remaining commands and options are consistent with the consulted DNF, RPM, rpmdb, and package-cleanup documentation. `rpm --replacefiles` is valid but remains appropriately labeled as a last-resort action because it can overwrite files owned by another installed package.
