# Validation Summary: How to Use Ansible to Configure Static IP Addresses

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Netplan YAML configuration
- NetworkManager and `community.general.nmcli`
- NetworkManager keyfile connection profiles
- Debian ifupdown `/etc/network/interfaces`
- Linux static IPv4 addressing, routes, DNS, and VLANs

## Sources Consulted
- Ansible `community.general.nmcli` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/1.1/examples/
- Netplan `try` command documentation: https://netplan.readthedocs.io/en/1.1.2/netplan-try/
- NetworkManager keyfile reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Debian ifupdown `interfaces(5)` man page: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html

## Issues Found
- The multi-interface Netplan example placed `nameservers` after the loop, which rendered it under only the last generated interface rather than the intended interface. I changed the example to attach DNS servers to `eth0` via an optional per-interface `dns` field.
- The safe reconfiguration example used `netplan apply` as the confirmation step for an asynchronous `netplan try` run. Netplan documents confirmation as interactive confirmation or `SIGUSR1`; I changed the task to send `SIGUSR1` to the running `netplan try` process after the new IP is reachable.
- The safe reconfiguration example defined `old_ip` but never used it. I removed the unused variable.

## Review Notes
The ifupdown example uses `dns-nameservers`, which is commonly supported through resolvconf-style integration but is not one of the core static address options listed in the base `interfaces(5)` address-family section. This is acceptable for an older Debian ifupdown tutorial, but future revisions could mention the resolver package dependency explicitly.
