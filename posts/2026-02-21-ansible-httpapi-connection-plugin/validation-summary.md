# Validation Summary: How to Use Ansible httpapi Connection Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.netcommon httpapi connection plugin
- ansible.netcommon network_cli connection plugin
- Arista EOS eAPI
- Cisco NX-OS NX-API
- Ansible network modules for Arista EOS and Cisco NX-OS
- YAML inventory and playbook configuration

## Sources Consulted
- Ansible ansible.netcommon.httpapi connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- Ansible EOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Ansible NXOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_nxos.html
- Ansible arista.eos.eos_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_command_module.html
- Ansible arista.eos.eos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- Ansible arista.eos.eos_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_facts_module.html
- Ansible arista.eos.eos_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_vlans_module.html
- Ansible arista.eos.eos_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_interfaces_module.html
- Ansible cisco.nxos.nxos_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_command_module.html
- Ansible cisco.nxos.nxos_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_vlans_module.html
- Ansible cisco.nxos.nxos_feature module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_feature_module.html
- Cisco NX-OS Programmability Guide, NX-API CLI: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/101x/programmability/cisco-nexus-9000-series-nx-os-programmability-guide-release-101x/m-n9k-nx-api-cli-101x.html

## Issues Found
- The post described httpapi as only REST API communication with always-structured JSON responses. Updated the wording to match Ansible's HTTP(S)-based API terminology and clarified that structured JSON depends on platform and module support.
- The EOS eAPI diagram used an inaccurate endpoint and payload shape. Updated it to show `/command-api` and a JSON-RPC-style `runCmds` request.
- The EOS playbook claimed resource modules work transparently over httpapi, but current EOS resource module docs list `network_cli` for modules such as `eos_vlans` and `eos_interfaces`. Replaced those examples with `arista.eos.eos_config`, which is documented to work with CLI or eAPI transports.
- The EOS `eos_command` example consumed the result as a dictionary without explicitly requesting JSON output. Added `output: json`.
- The generic httpapi variables used `ansible_persistent_connect_timeout`, `ansible_persistent_command_timeout`, and `ansible_httpapi_headers`, which are not the documented Ansible variables for this connection plugin. Replaced them with `ansible_connect_timeout`, `ansible_command_timeout`, and `ansible_httpapi_http_agent`.
- The token authentication section implied automatic token acquisition. Updated it to describe the documented `ansible_httpapi_session_key` option for platform plugins that support session keys.
- The `eos_facts` benchmark used `interfaces` and `vlans` under `gather_subset`, but those are resource facts. Moved them under `gather_network_resources` with `gather_subset: min`.

## Review Notes
The post is now technically aligned with the current Ansible community documentation as of 2026-05-27. The performance claims remain intentionally qualitative because actual httpapi versus network_cli speed depends on platform, module behavior, device load, and Ansible concurrency settings.
