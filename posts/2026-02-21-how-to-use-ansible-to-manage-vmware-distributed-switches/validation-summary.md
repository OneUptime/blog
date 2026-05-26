# Validation Summary: How to Use Ansible to Manage VMware Distributed Switches

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.vmware Ansible collection
- VMware vSphere
- vSphere Distributed Switches
- Distributed port groups
- Network I/O Control
- YAML playbooks

## Sources Consulted
- Ansible community.vmware.vmware_dvswitch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvswitch_module.html
- Ansible community.vmware.vmware_dvs_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvs_host_module.html
- Ansible community.vmware.vmware_dvs_portgroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvs_portgroup_module.html
- Ansible community.vmware.vmware_dvswitch_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvswitch_info_module.html
- Ansible community.vmware.vmware_dvs_portgroup_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvs_portgroup_info_module.html
- Ansible community.vmware.vmware_dvswitch_nioc module documentation: https://docs.ansible.com/ansible/latest/collections/community/vmware/vmware_dvswitch_nioc_module.html
- Ansible module defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Broadcom vSphere Distributed Switch concepts and version compatibility references: https://knowledge.broadcom.com/external/article?legacyId=1010555 and https://knowledge.broadcom.com/external/article/416520/vds-improvements-and-features-per-versio.html

## Issues Found
- The distributed port group examples set `network_policy` values without the required `inherited` suboption. Added `inherited: false` so the security policy values are applied explicitly.
- The uplink teaming example said it used all uplinks actively but only set `inbound_policy`. Added `active_uplinks` with the example uplink names so the snippet matches the stated behavior.
- The dvSwitch info debug task used return fields that do not match the current `vmware_dvswitch_info` summary return structure. Updated the Jinja paths to the documented nested `configure.settings.properties` and `configure.hosts` fields.
- The port group info task displayed `vlan_info` but did not request VLAN data. Added `show_vlan_info: true`.
- The Network I/O Control example used `community.vmware.vmware_dvswitch` with unsupported `network_policy` resource allocation keys. Replaced it with `community.vmware.vmware_dvswitch_nioc` and the documented `resources` list format.

## Review Notes
The examples assume the `community.vmware` collection and a vCenter-backed environment with API write access. The selected distributed switch version `7.0.3` is version-specific and should match the ESXi hosts being attached.
