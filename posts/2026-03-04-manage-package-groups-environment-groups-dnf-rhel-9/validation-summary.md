# Validation Summary: How to Manage Package Groups and Environment Groups with DNF on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- DNF package groups and environment groups
- RPM package queries
- systemd boot targets

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- DNF Command Reference, group/list/install/remove/upgrade/mark behavior and install shorthand: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference, `group_package_types`: https://dnf.readthedocs.io/en/stable/conf_ref.html
- systemd `systemctl` manual, `set-default TARGET`: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- RPM manual, query mode: https://rpm.org/docs/4.19.x/man/rpm.8.html

## Issues Found
- The `@` shorthand section said environment groups use an `@^` prefix, but the example installed `"Development Tools"`, which is a package group, not an environment group. Updated the example to show `sudo dnf install @"Server with GUI"`, matching DNF's documented `@<group-spec>` install shorthand for groups and environment groups.
- The `dnf group upgrade` explanation said it installs newly added mandatory/default packages "without touching what is already there." Upstream DNF documentation states group upgrade can also remove packages that were removed from the group definition, provided they were not explicitly installed by the user. Updated the sentence to include that behavior.
- The post used `dnf group info --installed "Development Tools"` in two places. RHEL 9 and DNF4 documentation list `dnf group info <group-spec>` for group package details and document `--installed` for `dnf group list`, not for `dnf group info`. Removed `--installed` from those examples and adjusted the related heading/comment.

## Review Notes
- The local review environment did not have the `dnf` binary installed, so command validation was performed against official Red Hat RHEL 9 documentation and upstream DNF documentation rather than local `dnf --help` output.
- RHEL group names and group contents can vary by enabled repositories, architecture, subscription state, and minor release. The post already recommends checking `dnf group info` before installation, which is the right operational caveat.
