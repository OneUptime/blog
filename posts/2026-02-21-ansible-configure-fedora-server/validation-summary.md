# Validation Summary: How to Use Ansible to Configure Fedora Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Fedora Server
- DNF and DNF5 automatic updates
- Cockpit web console
- SELinux
- firewalld
- SSH hardening
- sysctl tuning
- Cron-based automation

## Sources Consulted
- Fedora Docs: Fedora release lifecycle and supported releases, https://docs.fedoraproject.org/en-US/releases/
- Fedora Docs: Fedora Server installation and storage layout guidance, https://docs.fedoraproject.org/en-US/fedora-server/latest/installation/
- Fedora Docs: Fedora Server Cockpit management documentation, https://docs.fedoraproject.org/en-US/fedora-server/latest/virtualization/vm-management-cockpit/
- Fedora Project Change: Retire Modularity, https://fedoraproject.org/wiki/Changes/RetireModularity
- Fedora Project Change: DNF5 as default package manager, https://fedoraproject.org/wiki/Changes/ReplaceDnfWithDnf5
- Fedora Packages: nodejs20 package listing, https://packages.fedoraproject.org/pkgs/nodejs20/
- Fedora Packages: postgresql16 package listing, https://packages.fedoraproject.org/pkgs/postgresql16/
- Fedora Packages: dnf5-plugin-automatic package listing, https://packages.fedoraproject.org/pkgs/dnf5/dnf5-plugin-automatic/
- DNF5 documentation: automatic plugin and timer behavior, https://dnf5.readthedocs.io/en/stable/dnf5_plugins/automatic.8.html
- Cockpit Project documentation: cockpit.conf options, https://cockpit-project.org/guide/latest/cockpit.conf.5
- Ansible documentation: ansible.builtin.dnf, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.builtin.systemd_service, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: community.general.timezone, https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: community.general.ini_file, https://docs.ansible.com/ansible/latest/collections/community/general/ini_file_module.html
- Ansible documentation: ansible.posix.firewalld, https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: ansible.posix.selinux, https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html

## Issues Found
- The post described Fedora Server as the direct upstream distribution for RHEL and CentOS. Updated the wording to clarify Fedora's upstream community role and CentOS Stream's closer relationship to active RHEL development.
- The post claimed Cockpit web management is enabled by default. Updated this to say Cockpit is installed by default on Fedora Server and firewall access is opened, which matches Fedora Server documentation more closely.
- The post said Btrfs is Fedora Server's default filesystem option. Updated this to XFS on LVM as the default Fedora Server storage layout, with Btrfs available as an option.
- The post presented Fedora module streams for Node.js 20 and PostgreSQL 16. Fedora 39 and newer retired Fedora-provided module streams, so the section now uses regular versioned Fedora packages where available.
- The automatic updates example used the DNF4 `dnf-automatic` package and `dnf-automatic.timer` while the article targets Fedora 41+ DNF5. Updated it to `dnf5-plugin-automatic` and `dnf5-automatic.timer`, and changed the configuration task to use `community.general.ini_file` for the INI-formatted config.
- The generic provisioning example used nonexistent `ansible.builtin.timezone`. Replaced it with `community.general.timezone`.
- The Fedora provisioning example used UFW modules even though Fedora Server uses firewalld by default. Replaced the UFW tasks with firewalld service rules and a `firewalld` systemd service task.
- Updated `ansible.builtin.systemd` examples to `ansible.builtin.systemd_service`, the current documented module name.
- Updated the Cockpit handler to use `systemctl try-restart cockpit`, matching Cockpit's socket-activated service behavior.

## Review Notes
The YAML snippets parse successfully as YAML fences. `ansible-playbook` is not installed in this environment, so a full Ansible syntax check could not be run locally.
