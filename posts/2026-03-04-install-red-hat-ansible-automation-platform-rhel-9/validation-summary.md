# Validation Summary: How to Install Red Hat Ansible Automation Platform on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- DNF
- Ansible inventory files
- Ansible playbooks
- ansible.builtin.dnf
- ansible.builtin.systemd_service

## Sources Consulted
- Red Hat Customer Portal: Scope of support for the Ansible Core package included in the RHEL 9 and RHEL 8.6 and later AppStream repositories: https://access.redhat.com/articles/6325611
- Red Hat Ansible Automation Platform 2.5 RPM installation documentation: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/rpm_installation/assembly-platform-install-scenario
- Red Hat Ansible Automation Platform 2.5 RPM installation overview: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html-single/rpm_installation/index
- Ansible documentation: Building an inventory: https://docs.ansible.com/ansible/latest/getting_started/get_started_inventory.html
- Ansible documentation: ansible.builtin.dnf module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.builtin.systemd_service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The post claimed to install Red Hat Ansible Automation Platform, but the command shown installs `ansible-core`. Red Hat's Ansible Automation Platform installation requires the platform installer, an installer inventory, and `setup.sh`, while `ansible-core` is the RHEL AppStream package for running Ansible automation. I updated the title, tags, description, overview, and summary to describe Ansible Core accurately.
- The prerequisites did not mention repository access. I added access to the RHEL 9 AppStream repository because Red Hat documents `ansible-core` as being included there.
- The inventory instructions referenced a local inventory file but did not name the `inventory.ini` file used by later commands. I clarified that the local file can be named `inventory.ini`.
- The playbook used `ansible.builtin.systemd`, which is retained as a backward-compatible alias. I updated it to the current documented FQCN, `ansible.builtin.systemd_service`.
- The package example installed and verified `htop`, which is commonly provided outside the standard RHEL repositories. I changed the example verification package to `rsync`, a package used in Red Hat's Ansible Automation Platform installation documentation examples for RHEL systems.

## Review Notes
The corrected post is now an Ansible Core tutorial, not an Ansible Automation Platform installation guide. A future post about Red Hat Ansible Automation Platform should cover subscriptions, supported deployment scenarios, the platform installer inventory, and running `setup.sh`.
