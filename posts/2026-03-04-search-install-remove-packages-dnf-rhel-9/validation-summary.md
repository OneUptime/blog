# Validation Summary: How to Search, Install, and Remove Packages with DNF on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- RPM packages and repositories
- Linux command-line package management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html

## Issues Found
- The introduction said DNF is "the only game in town" on RHEL. Red Hat documents that RHEL 9 still provides `yum` as a compatibility alias for `dnf`, so the sentence was changed to state that accurately.
- `dnf list updates` was changed to `dnf list --upgrades`, matching the documented DNF list option for packages with available upgrades.
- `sudo dnf update` examples were changed to `sudo dnf upgrade`. DNF documents `update` as a deprecated alias for `upgrade`, so the post now uses the current command form.
- The `sudo dnf makecache` example was described as forcing a metadata refresh. DNF documents `makecache` as avoiding downloads when possible, while `--refresh` marks metadata expired before the command runs, so the command was changed to `sudo dnf --refresh makecache`.
- The `--downloadonly` example was described as a dry run. It does not install packages, but it can download package files into the cache, so the comment was changed to describe that behavior accurately.
- The reinstall section implied package configuration corruption is reliably fixed by reinstalling. RPM configuration file handling can preserve modified config files, so the wording was narrowed to package-owned files.
- The `--showduplicates` example comment was adjusted because the option shows duplicate available package versions in repositories, not just repository names.

## Review Notes
Most DNF commands in the article are correct for RHEL 9. `dnf check-update` remains appropriate for scripting because it returns 100 when updates are available and 0 when no updates are available. Security updates are correctly handled with `dnf upgrade --security` when advisory metadata is available from enabled repositories.
