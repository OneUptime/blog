# Validation Summary: How to Use Ansible to Manage FortiGate Firewalls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Fortinet FortiOS Ansible collection (`fortinet.fortios`)
- FortiGate firewalls
- FortiOS REST API / `httpapi`
- FortiGate firewall policies, address objects, IPsec VPNs, configuration backup, static routes, and facts gathering

## Sources Consulted
- Ansible Community Documentation: `fortinet.fortios` collection index - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/index.html
- Ansible Community Documentation: `fortinet.fortios.fortios_firewall_policy` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_firewall_policy_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_firewall_address` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_firewall_address_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_firewall_addrgrp` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_firewall_addrgrp_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_vpn_ipsec_phase1_interface` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_vpn_ipsec_phase1_interface_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_vpn_ipsec_phase2_interface` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_vpn_ipsec_phase2_interface_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_monitor_fact` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_monitor_fact_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_configuration_fact` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_configuration_fact_module.html
- Ansible Community Documentation: `fortinet.fortios.fortios_router_static` module - https://docs.ansible.com/projects/ansible/latest/collections/fortinet/fortios/fortios_router_static_module.html
- Fortinet FortiOS Ansible Galaxy Collection guide: Run Your First Playbook - https://ansible-galaxy-fortios-docs.readthedocs.io/en/latest/playbook.html
- Fortinet FortiOS Ansible Galaxy Collection FAQ: backup and access token guidance - https://ansible-galaxy-fortios-docs.readthedocs.io/en/latest/faq.html
- Fortinet FortiOS Ansible Galaxy Collection: `fortios_monitor` module - https://ansible-galaxy-fortios-docs.readthedocs.io/en/latest/fortios_monitor.html

## Issues Found
- The installation section told readers to install `fortiosapi`. Current FortiOS Ansible collection guidance says legacy `fortiosapi` is deprecated and `httpapi` is the preferred way to run playbooks, so the deprecated dependency install command was removed.
- The API token example stored `fortigate_token`, but the inventory/playbooks did not use that variable. Updated the encrypted group vars example to use `ansible_httpapi_session_key` with the access token JSON format recommended by Fortinet for `httpapi` authentication.
- The VPN example referenced `vault_vpn_psk`, but the vaulted variables example did not define it. Added the variable to the encrypted group vars snippet so the example is internally consistent.
- The IPsec phase 1 and phase 2 examples used scalar strings for `proposal` and `dhgrp`. The current module schemas document both fields as lists of strings, so the examples were updated to list form.
- The backup playbook used `fortios_monitor_fact` with `system_config_backup` without a FortiOS version caveat. Official Fortinet collection docs note that this selector applies to FortiOS 7.0.1 and earlier, while FortiOS 7.0.2 and later should use `fortios_monitor` with `backup.system.config`; updated the prose and example accordingly.

## Review Notes
The remaining examples match current module names, major parameter names, and documented selectors. In real deployments, users should match the collection version to their FortiOS release and supply device-specific interface names, existing service/address objects, VPN parameters, and backup paths.
