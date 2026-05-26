# Validation Summary: How to Use Ansible to Manage VMware Port Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware Ansible collection
- VMware vSphere
- ESXi standard vSwitch port groups
- vSphere Distributed Switch port groups
- VLANs, security policies, and NIC teaming

## Sources Consulted
- Ansible community.vmware.vmware_portgroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_portgroup_module.html
- Ansible community.vmware.vmware_dvs_portgroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_dvs_portgroup_module.html
- Ansible community.vmware.vmware_portgroup_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_portgroup_info_module.html
- Ansible community.vmware.vmware_cluster_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_cluster_info_module.html
- Broadcom VMware vNetwork Distributed PortGroup configuration article: https://knowledge.broadcom.com/external/article/310573/vnetwork-distributed-portgroup-dvportgro.html

## Issues Found
- The distributed port group examples set `network_policy` values without the required `inherited` key. Added `inherited: false` so the specified `promiscuous`, `forged_transmits`, and `mac_changes` values are valid for `community.vmware.vmware_dvs_portgroup`.
- The distributed port group security-policy comment incorrectly described `network_policy` as a network resource pool for QoS. Updated the comment to identify it as a security policy.
- The standardization example used `community.vmware.vmware_host_info`, which is not a documented module in the current `community.vmware` collection. Replaced the dynamic host lookup with the documented `cluster_name` parameter on `community.vmware.vmware_portgroup`, which applies the port group configuration to all hosts in the cluster.

## Review Notes
The `community.vmware.vmware_cluster_info` module is documented as deprecated and moved to the newer `vmware.vmware` collection, but the final playbook no longer depends on it. The post remains focused on `community.vmware`; a future refresh could mention collection installation and version expectations explicitly.
