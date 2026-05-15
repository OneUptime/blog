# Validation Summary: How to Configure Basic System Settings on RHEL

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd tools: `hostnamectl`, `timedatectl`, `localectl`
- Chrony / `chronyd` / `chronyc`
- NetworkManager / `nmcli`
- DNF packages and RHEL language packs
- Ansible automation modules and RHEL system roles

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring basic system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9: Changing a hostname: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_changing-a-hostname_configuring-and-managing-networking
- Red Hat Enterprise Linux 9: Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/hostname_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.nmcli` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/nmcli_module.html
- Ansible `community.general.locale_gen` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/locale_gen_module.html
- Local command help output for `hostnamectl`, `timedatectl`, `localectl`, and `nmcli connection modify`.

## Issues Found
- The locale package paragraph said to "generate" a missing locale while the example installs `glibc-langpack-en`. On RHEL 9, installing the appropriate `glibc-langpack-*` package is the accurate action, so the wording and comment were corrected.
- The NetworkManager introduction said RHEL uses NetworkManager for "all" network configuration. RHEL 9 uses NetworkManager by default, but also documents other tools and RHEL system roles. The wording was changed to "by default."
- The Ansible tip listed `locale_gen` as a corresponding module for this RHEL baseline. Current `community.general.locale_gen` documentation says it manages locales on Debian and Ubuntu systems, so the example list was replaced with RHEL-appropriate automation options.

## Review Notes
The command examples for `hostnamectl`, `timedatectl`, `localectl`, Chrony, and `nmcli connection modify` match RHEL 9 documentation. The `/etc/hosts` loopback example is usable for local name resolution, but in production environments the host's FQDN should normally resolve through DNS or to the system's actual static address when other machines need to reach it.
