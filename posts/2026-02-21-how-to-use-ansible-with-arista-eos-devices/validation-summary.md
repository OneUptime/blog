# Validation Summary: How to Use Ansible with Arista EOS Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Arista EOS
- Arista eAPI
- Ansible `arista.eos` collection
- Ansible `ansible.netcommon` connection plugins
- EOS VLANs, interfaces, MLAG, BGP EVPN, VXLAN, and configuration backup

## Sources Consulted
- Ansible EOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Ansible Platform Index: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_index.html
- Ansible `arista.eos.eos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- Ansible `arista.eos.eos_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_command_module.html
- Ansible `arista.eos.eos_vlans` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_vlans_module.html
- Ansible `arista.eos.eos_interfaces` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_interfaces_module.html
- Ansible `arista.eos.eos_l2_interfaces` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_l2_interfaces_module.html
- Ansible `arista.eos.eos_l3_interfaces` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_l3_interfaces_module.html
- Ansible `arista.eos.eos_eapi` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_eapi_module.html
- Arista EOS Session Management Commands: https://www.arista.com/en/um-eos/eos-session-management-commands
- Arista EOS Multi-Chassis Link Aggregation documentation: https://www.arista.com/en/um-eos/eos-multi-chassis-link-aggregation
- Arista EOS Border Gateway Protocol documentation: https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Arista EOS EVPN Overview: https://www.arista.com/en/um-eos/eos-evpn-overview
- Arista EOS VXLAN Configuration documentation: https://www.arista.com/en/um-eos/eos-vxlan-configuration
- Arista EOS Programmability overview: https://www.arista.com/products/eos/open-and-programmable

## Issues Found
- The introduction described eAPI as a RESTful API. Arista documents eAPI as a JSON-based RPC interface over HTTP/HTTPS, so the wording was corrected to "JSON-RPC API over HTTP or HTTPS."
- The eAPI inventory example omitted `ansible_become` and `ansible_become_method`, while Ansible's EOS platform options document enable mode for the `httpapi` connection. These variables were added to keep privileged configuration tasks working consistently.
- The BGP EVPN example referenced `router_id` without defining it in the playbook. A default `router_id: "{{ ansible_host }}"` variable was added so the example is self-contained.
- The BGP EVPN example configured eBGP neighbors with `update-source Loopback0` but did not configure eBGP multihop. Arista documents `neighbor ebgp-multihop` for external peers not on directly connected networks, so `ebgp-multihop 3` was added.

## Review Notes
The examples remain intentionally simplified for a blog tutorial. A production EVPN fabric would normally also include explicit loopback interface configuration, underlay routing, peer groups, route-map policy, and platform-specific validation before deployment.
