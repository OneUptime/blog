# Validation Summary: How to Use Ansible to Configure Gentoo Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible community.general collection
- Gentoo Linux
- Portage and emerge
- USE flags and /etc/portage/make.conf
- OpenRC services
- SSH daemon configuration

## Sources Consulted
- Ansible community.general.portage module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/portage_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Gentoo make.conf documentation: https://devmanual.gentoo.org/eclass-reference/make.conf/
- Gentoo wiki /etc/portage/make.conf reference: https://wiki.gentoo.org/wiki/Make.conf
- Gentoo Handbook, Portage repository sync, USE flags, @world update, and timezone configuration: https://wiki.gentoo.org/wiki/Handbook:Parts/Installation/Base/en
- Gentoo OpenRC documentation: https://wiki.gentoo.org/wiki/OpenRC

## Issues Found
- The playbook wrote global USE flags to `/etc/portage/make.conf.d/use-flags.conf`, which is not a documented Portage configuration path. Gentoo documents `/etc/portage/make.conf` as the primary file, and `make.conf` itself may be a directory. Changed the example to manage `USE="ssl threads nls -X -gtk -kde"` directly in `/etc/portage/make.conf`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current Ansible documentation places the timezone module in `community.general` and says to use `community.general.timezone` in playbooks. Updated the module FQCN.
- The generic SSH hardening example matched only uncommented `PermitRootLogin` and `PasswordAuthentication` lines, so it would not replace the common commented defaults in `sshd_config`. Updated the regular expressions to match optional leading `#`, consistent with the earlier Gentoo-specific SSH example.

## Review Notes
The core Gentoo claims about source-based builds, Portage, `emerge --sync`, `emerge --update --deep --newuse @world`, USE flags in `/etc/portage/make.conf`, OpenRC, and `/etc/timezone` plus `emerge --config sys-libs/timezone-data` are consistent with Gentoo documentation. The `community.general.portage` package example uses documented parameters and valid Gentoo package atoms. The broader "Common Use Cases" examples are generic Ansible patterns rather than Gentoo-specific workflows.
