# Validation Summary: How to Use Ansible to Manage Meraki Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco Meraki
- Cisco Meraki Dashboard API
- cisco.meraki Ansible collection
- YAML playbooks
- Ansible Vault

## Sources Consulted
- Ansible `cisco.meraki` collection index: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/index.html
- Ansible `cisco.meraki.networks` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_module.html
- Ansible `cisco.meraki.networks_wireless_ssids` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_wireless_ssids_module.html
- Ansible `cisco.meraki.networks_appliance_firewall_l3_firewall_rules` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_appliance_firewall_l3_firewall_rules_module.html
- Ansible `cisco.meraki.networks_appliance_vlans` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_appliance_vlans_module.html
- Ansible `cisco.meraki.networks_appliance_vlans_settings` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_appliance_vlans_settings_module.html
- Ansible `cisco.meraki.networks_devices_claim` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_devices_claim_module.html
- Ansible `cisco.meraki.devices` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/devices_module.html
- Ansible `cisco.meraki.networks_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/networks_info_module.html
- Ansible `cisco.meraki.organizations_devices_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/meraki/organizations_devices_info_module.html
- Cisco Meraki Dashboard API documentation: https://documentation.meraki.com/Platform_Management/Operate_and_Maintain/How-Tos/Cisco_Meraki_Dashboard_API
- Cisco Meraki Dashboard API rate limit documentation: https://developer.cisco.com/meraki/api-v1/rate-limit

## Issues Found
- The post used deprecated legacy modules such as `meraki_network`, `meraki_mr_ssid`, `meraki_mx_l3_firewall`, `meraki_vlan`, and `meraki_device`. Updated examples to current resource and info modules such as `cisco.meraki.networks`, `cisco.meraki.networks_wireless_ssids`, `cisco.meraki.networks_appliance_firewall_l3_firewall_rules`, and related modules.
- The examples used legacy parameters such as `auth_key`, `org_name`, `net_name`, `type`, `timezone`, `dest_port`, `dest_cidr`, and `src_cidr`. Updated them to current module parameters such as `meraki_api_key`, `organizationId`, `networkId`, `productTypes`, `timeZone`, `destPort`, `destCidr`, and `srcCidr`.
- The VLAN setup used `meraki_network` with `enable_vlans`; updated it to `cisco.meraki.networks_appliance_vlans_settings` with `vlansEnabled`.
- The device claim example combined claiming and device metadata updates in one legacy module task. Updated it to claim devices with `cisco.meraki.networks_devices_claim` and then update device metadata with `cisco.meraki.devices`.
- The information-gathering example used `state: query` on deprecated modules and read `.data`; updated it to current `_info` modules and `meraki_response`.
- The API key dashboard path was outdated. Updated it to the current API & Webhooks path documented by Cisco Meraki.

## Review Notes
The YAML snippets were parsed locally for syntax. `ansible-doc` could not be run because Ansible is not installed in the workspace, so module verification was done against official online documentation.
