# Validation Summary: How to Use Ansible to Configure Alpine Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Alpine Linux
- apk package management
- OpenRC service management
- iptables firewall rules
- ifupdown-style network configuration
- SSH hardening
- sysctl configuration
- cron automation

## Sources Consulted
- Ansible `community.general.apk` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apk_module.html
- Ansible `ansible.builtin.raw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Alpine Linux OpenRC documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Working/openrc.html
- Alpine Linux OpenRC wiki: https://wiki.alpinelinux.org/wiki/OpenRC
- Alpine Linux iptables wiki: https://wiki.alpinelinux.org/wiki/Iptables
- Alpine Linux network configuration wiki: https://wiki.alpinelinux.org/wiki/Configure_Networking

## Issues Found
- The Python bootstrap task always reported changed. Updated it to test for `/usr/bin/python3` before running `apk add --no-cache python3`, and to set `changed_when` from command output.
- The hostname task only wrote `/etc/hostname`, which does not reliably set the active hostname. Replaced it with `ansible.builtin.hostname` using the Alpine strategy.
- The networking service was added to the default OpenRC runlevel. Alpine networking documentation adds `networking` to the `boot` runlevel, so the service task now sets `runlevel: boot`.
- The separate `rc-update` command duplicated what `ansible.builtin.service` can manage for OpenRC and was forced changed on every run. Replaced it with service-module based OpenRC tasks.
- The iptables handler used `ansible.builtin.command` with shell redirection. Ansible command documentation states shell metacharacters such as `<` are not processed, so the handler now uses `ansible.builtin.shell`.
- The common workflow used `ansible.builtin.timezone`, but current Ansible documentation places the timezone module in `community.general.timezone`. Updated the module name.
- The common workflow switched to UFW even though the post focuses on Alpine iptables and did not install UFW. Replaced that example with an iptables rules file and matching handler.
- The firewall section said Alpine uses iptables rather than nftables or firewalld. Reworded it to describe the example more accurately, since Alpine can support multiple firewall tools.

## Review Notes
The post is technically relevant and salvageable. Some examples are still simplified and assume a full Alpine host with OpenRC available; container environments may not run OpenRC services normally.
