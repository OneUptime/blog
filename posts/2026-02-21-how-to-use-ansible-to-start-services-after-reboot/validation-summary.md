# Validation Summary: How to Use Ansible to Start Services After Reboot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.systemd_service
- ansible.builtin.service_facts
- ansible.builtin.reboot
- ansible.builtin.uri
- systemd unit files
- systemd targets and timers
- Linux service management

## Sources Consulted
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- systemd network target documentation: https://systemd.io/NETWORK_ONLINE/
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- Local systemctl and systemd-analyze help output from systemd 255

## Issues Found
- The examples used `ansible.builtin.systemd`. This still works as a backward-compatible alias, but the current Ansible module name is `ansible.builtin.systemd_service`. Updated all examples and the summary wording to use the current FQCN.
- The explanation of `network.target` said it means interfaces are configured, and the explanation of `network-online.target` said it waits until the network is actually reachable. systemd documents `network.target` as a passive target for the network management stack, not a guarantee of configured interfaces, and `network-online.target` depends on the network manager's online definition rather than proving arbitrary remote reachability. Updated the wording to reflect that distinction.
- The Mermaid dependency diagram showed `network-online.target` before `multi-user.target`, which is not a general systemd relationship. Updated the diagram so the ordering applies to a network-dependent service instead.

## Review Notes
The snippets assume distribution-specific service names such as `sshd`, `redis-server`, and `postgresql`; these names can differ across Linux distributions. The post already uses examples rather than claiming universal service names, so no content change was required.
