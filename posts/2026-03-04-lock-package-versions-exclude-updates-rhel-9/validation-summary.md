# Validation Summary: How to Lock Package Versions and Exclude Packages from Updates on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- DNF versionlock plugin
- DNF configuration files
- Repository package exclusions
- Ansible `community.general.dnf_versionlock`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF configuration reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/versionlock.html
- Red Hat Customer Portal, "Restricting a Package to a Fixed Version Number with yum": https://access.redhat.com/solutions/98873
- Ansible `community.general.dnf_versionlock` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/dnf_versionlock_module.html

## Issues Found
- The post said versionlock prevents locked packages from being removed by DNF operations. I changed this to say it prevents updates and downgrades during DNF transaction operations, because the official plugin documentation describes filtering versions for transaction operations and Red Hat documents removal behavior as more nuanced.
- The post implied `dnf versionlock add` can lock any arbitrary not-yet-installed version. I clarified that the version must be available in enabled repositories unless using raw locklist entries, because the plugin documentation says `add` resolves installed packages first and then currently available packages.
- The post described `/etc/dnf/plugins/versionlock.list` as a strict full NEVRA file. I changed this to package specs, commonly NEVRA-style patterns, because the plugin documentation defines locklist entries as package specs and shows wildcarded NEVRA entries.
- The comparison table said versionlock does not block installation. I updated it to explain that versionlock blocks non-matching versions of the package, matching the plugin's package-filtering behavior.
- The post said the versionlock file does not support comments. I changed this to recommend tracking the reason for locks outside the locklist, because the original absolute statement is not a reliable rule for DNF-managed locklists.

## Review Notes
The main commands, `excludepkgs` configuration, repository-level exclusions, `--disableexcludes` values, plugin package name for RHEL 9, and Ansible module usage are technically valid for RHEL 9 / DNF 4. The monitoring shell pipeline is a lightweight example and may need refinement in production, especially for package names with unusual version-like suffixes.
