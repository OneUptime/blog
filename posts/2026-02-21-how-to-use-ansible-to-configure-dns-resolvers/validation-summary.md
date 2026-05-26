# Validation Summary: How to Use Ansible to Configure DNS Resolvers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd-resolved
- NetworkManager and nmcli
- community.general.nmcli
- /etc/resolv.conf
- Netplan
- Linux DNS resolver configuration

## Sources Consulted
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible community.general.nmcli module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- systemd resolved.conf manual: https://www.freedesktop.org/software/systemd/man/resolved.conf.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Linux resolv.conf(5) manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Netplan examples and DNS configuration documentation: https://netplan.readthedocs.io/en/1.1/examples/

## Issues Found
- The NetworkManager command example only restarted the connection when DNS servers or search domains changed, but not when `ipv4.ignore-auto-dns` changed. Updated the condition to include `ignore_auto.changed`.
- The `community.general.nmcli` example used `ansible_default_ipv4.alias` as the NetworkManager connection name. NetworkManager connection profile names do not always match interface aliases, and the module's `conn_name` expects the connection profile name. Added a task to read the active connection name with `nmcli` and use that value.
- The cross-distribution example checked `ansible_facts.services` without first gathering service facts. Added an `ansible.builtin.service_facts` task.
- The cross-distribution example checked for `systemd-resolved` instead of the systemd unit name commonly returned in service facts, `systemd-resolved.service`. Updated the condition.
- The cross-distribution NetworkManager example used `ansible_default_ipv4.alias` as the connection name. Added a task to read the active NetworkManager connection name and used it for both modification and restart.
- The internal DNS section described `FallbackDNS=` as public DNS fallback for corporate domains. In systemd-resolved, `FallbackDNS=` is used when no other DNS server information is known, not as a general fallback after a configured internal resolver fails or returns no answer. Updated the wording and example labels to match the documented behavior.

## Review Notes
- The direct `/etc/resolv.conf` example is technically valid for systems where no resolver manager owns the file, but making the file immutable with `chattr +i` can interfere with later Ansible updates unless automation removes the immutable bit before changing the file.
- The nmcli command examples use command tasks that will usually report changed whenever they run. The examples are functionally correct, but future improvements could make them more idempotent by checking current NetworkManager settings before modifying them.
