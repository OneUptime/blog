# Validation Summary: How to Use Ansible become_method with doas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation and become plugins
- community.general.doas become plugin
- OpenBSD doas and doas.conf
- OpenBSD pkg_add and rc.conf.local
- Linux doas/OpenDoas package installation
- Ansible Vault variables for become passwords

## Sources Consulted
- Ansible Become plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/become.html
- Ansible privilege escalation guide: https://docs.ansible.com/projects/ansible-core/2.17/playbook_guide/playbooks_privilege_escalation.html
- community.general.doas become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/doas_become.html
- OpenBSD doas(1) manual: https://man.openbsd.org/doas.1
- OpenBSD doas.conf(5) manual: https://man.openbsd.org/doas.conf.5
- OpenBSD 5.8 release notes: https://www.openbsd.org/58.html
- OpenBSD pkg_add(1) manual: https://man.openbsd.org/pkg_add
- OpenBSD rc.conf(8) manual: https://man.openbsd.org/rc.conf
- Debian package information for doas: https://packages.debian.org/bullseye/doas
- Debian/OpenDoas doas.conf(5) manual: https://manpages.debian.org/bookworm/opendoas/doas.conf.5.en.html
- Fedora package information for opendoas: https://packages.fedoraproject.org/pkgs/opendoas/opendoas/
- Alpine Linux package information for doas: https://pkgs.alpinelinux.org/packages?name=doas

## Issues Found
- The post described Ansible doas support as native and used `become_method: doas` throughout. Current Ansible documentation places doas in the `community.general` collection, not `ansible-core`, and recommends `community.general.doas`. Updated the text and examples to install/use `community.general.doas`.
- The post claimed doas stands for "dedicated openbsd application subexecutor." Official OpenBSD manuals describe `doas` as "execute commands as another user"; the name is commonly "do as." Updated the explanation.
- The OpenBSD playbook labeled `pkg_add -u` as updating a package list. OpenBSD `pkg_add -u` updates installed packages. Updated the task name and change condition.
- The post said doas configuration syntax is the same across all platforms. Portable doas implementations use the same common rule syntax, but platform details can vary. Narrowed the claim.
- The closing comparison said doas and sudo are functionally interchangeable for Ansible and only the `become_method` changes. Updated this to note the collection and pipelining requirements of `community.general.doas`.

## Review Notes
Ansible is not installed in the local workspace, so `ansible-doc` and playbook syntax checks could not be run locally. The review was completed against official Ansible documentation and OpenBSD manuals.
