# Validation Summary: How to Use Ansible with Cisco NX-OS Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco NX-OS
- Cisco Nexus switches
- cisco.nxos Ansible collection
- ansible.netcommon network_cli and httpapi connections
- NX-API
- VLANs, SVIs, interfaces, vPC, OSPF, and configuration backup

## Sources Consulted
- Ansible NXOS Platform Options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_nxos.html
- cisco.nxos.nxos_facts module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_facts_module.html
- cisco.nxos.nxos_feature module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_feature_module.html
- cisco.nxos.nxos_nxapi module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_nxapi_module.html
- cisco.nxos.nxos_vlans module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_vlans_module.html
- cisco.nxos.nxos_interfaces module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_interfaces_module.html
- cisco.nxos.nxos_l2_interfaces module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_l2_interfaces_module.html
- cisco.nxos.nxos_config module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_config_module.html
- Cisco Nexus 9000 Series NX-OS vPC configuration documentation: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/configuration/interfaces/cisco-nexus-9000-series-nx-os-interfaces-configuration-guide-release-105x/m_configuring_vpcs_9x.pdf

## Issues Found
- The facts example displayed `ansible_net_platform`, but the current `cisco.nxos.nxos_facts` documentation lists `ansible_net_model` for the device model. Changed the example to use `ansible_net_model`.
- The prerequisites and tips stated that NX-OS has no need for Ansible enable-mode privilege escalation. Ansible's NXOS platform options document says enable-mode privilege escalation is supported for `network_cli`, while NX-API does not support it. Updated the wording to explain that `ansible_become` is optional when the login role already has sufficient privileges, but available when required.
- The feature enablement example included `nxapi` in the generic `nxos_feature` loop, while Ansible documents a dedicated `cisco.nxos.nxos_nxapi` module for configuring NX-API and HTTPS. Removed `nxapi` from the feature loop and added an `nxos_nxapi` task that enables HTTPS and disables HTTP to match the later `httpapi` SSL example.
- The vPC play targeted the entire `nxos_leaf` group even though the task logic and peer keepalive addresses were written for `nexus-leaf-01` and `nexus-leaf-02`. Changed the play host target to those two switches so peer-link and member port-channel configuration is not applied to unrelated leaf switches.

## Review Notes
The remaining examples use valid current cisco.nxos resource module option names and states. Some freeform `nxos_config` examples remain topology-specific and should be lab-tested before production use, especially the vPC peer-link, keepalive, and OSPF interface examples.
