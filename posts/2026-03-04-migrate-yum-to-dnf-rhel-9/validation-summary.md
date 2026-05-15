# Validation Summary: How to Migrate from Yum to DNF on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 7, 8, and 9
- DNF package manager
- Yum compatibility
- DNF modules and Application Streams
- DNF configuration and repository files
- DNF plugins
- Ansible package modules
- Puppet package resources

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- dnf-plugins-core config-manager plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/config_manager.html
- dnf-plugins-core system-upgrade plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/system-upgrade.html
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.yum module documentation: https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/yum_module.html
- Puppet package resource documentation: https://www.puppet.com/docs/puppet/7/package.html

## Issues Found
- The timeline had an incomplete "RHEL" entry. Changed it to "RHEL 9" and clarified that DNF is the primary package manager while yum remains available as an alias or symlink for compatibility, matching Red Hat's RHEL 9 documentation.
- The post described `dnf check-upgrade` as the correct DNF command. The DNF command reference documents `check-update` as the command and `check-upgrade` as an alias, so the command table, gotcha, and verification example were changed to use `dnf check-update`.
- The post used `dnf plugin list`, which is not a documented DNF command. Changed the example to use `dnf list installed 'dnf-plugin*' 'python3-dnf-plugin*'` to list installed plugin packages.
- The post recommended `dnf-plugin-system-upgrade` as a common RHEL plugin. That plugin is documented for DNF system upgrades and is primarily associated with Fedora-style major version upgrades; RHEL major upgrades are not handled that way. Replaced it with `dnf-plugins-core`, which provides common DNF plugin commands such as `config-manager`.

## Review Notes
The remaining examples and configuration snippets are consistent with RHEL 9 and DNF documentation. `dnf update` remains a deprecated alias for `dnf upgrade`, so the post's recommendation to prefer `dnf upgrade` is accurate. RHEL 9 Application Streams are version-specific; future updates should re-check module stream examples such as `nodejs:18` against the active RHEL 9 Application Stream lifecycle.
