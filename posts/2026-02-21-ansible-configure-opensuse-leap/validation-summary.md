# Validation Summary: How to Use Ansible to Configure openSUSE Leap

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and inventory
- openSUSE Leap
- Zypper package and repository management
- AppArmor
- firewalld
- Chrony
- SSH hardening
- sysctl tuning

## Sources Consulted
- Ansible community.general.zypper module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_module.html
- Ansible community.general.zypper_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_repository_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- openSUSE Leap 16.0 release notes: https://doc.opensuse.org/release-notes/x86_64/openSUSE/Leap/16.0/html/release-notes-leap-160/
- openSUSE zypper man page for repository variables: https://manpages.opensuse.org/Leap-15.6/zypper/zypper.8.en.html

## Issues Found
- The post described the playbook as applying to openSUSE Leap 15.5+, but Leap 16.0 new installations use SELinux by default and cannot select AppArmor during installation. I narrowed the guide text and the playbook assertion to Leap 15.5 and 15.6, and added a Leap 16.0 caveat.
- The generic provisioning example used `ansible.builtin.timezone`, which is not the current fully qualified module name in the latest Ansible documentation. I changed it to `community.general.timezone`.
- The Packman repository example hard-coded an openSUSE Leap 15.5 URL even though the guide also applies to 15.6. I changed the URL to use zypper's `$releasever` repository variable.
- The summary implied AppArmor generally applies across openSUSE Leap versions. I clarified that the AppArmor guidance is for Leap 15.x.

## Review Notes
The Ansible modules and parameters for `community.general.zypper`, `community.general.zypper_repository`, `community.general.timezone`, `ansible.posix.firewalld`, `ansible.posix.sysctl`, and `community.general.ufw` match the current documented module names and options. I could not run `ansible-playbook --syntax-check` because Ansible is not installed in the local workspace.
