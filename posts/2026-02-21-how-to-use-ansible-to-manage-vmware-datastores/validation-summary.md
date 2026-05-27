# Validation Summary: How to Use Ansible to Manage VMware Datastores

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware collection
- vmware.vmware collection
- VMware vSphere
- ESXi
- VMFS datastores
- NFS datastores
- vSAN
- Storage vMotion

## Sources Consulted
- Ansible community.vmware.vmware_host_datastore module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_host_datastore_module.html
- Ansible community.vmware.vmware_datastore_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_datastore_info_module.html
- Ansible community.vmware.vmware_host_scanhba module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_host_scanhba_module.html
- Ansible community.vmware.vmware_vm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_info_module.html
- Ansible community.vmware.vmware_vmotion module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vmotion_module.html
- Ansible vmware.vmware.cluster_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_info_module.html
- Ansible module_defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Ansible community.vmware.vmware_datastore_maintenancemode module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_datastore_maintenancemode_module.html
- Ansible community.vmware.vmware_cluster_vsan module documentation: https://docs.ansible.com/projects/ansible/10/collections/community/vmware/vmware_cluster_vsan_module.html

## Issues Found
- The datastore maintenance example used `community.vmware.vmware_datastore_info` as if its return data included `virtual_machines`. The documented return value is datastore metadata and does not include that field. I changed the example to gather VM data with `community.vmware.vmware_vm_info` and filter VMs by `datastore_url` before calling `community.vmware.vmware_vmotion`.
- The bulk host example used `community.vmware.vmware_host_info`, which is not a documented current module in the community.vmware collection. I changed it to use the documented `vmware.vmware.cluster_info` module and loop over the returned cluster `hosts` list using `item.name`.

## Review Notes
- The `community.vmware.vmware_cluster_info` module is deprecated in favor of `vmware.vmware.cluster_info`; the post now uses the newer module for dynamic cluster host discovery.
- The datastore maintenance section prepares a datastore for maintenance by moving VMs off it. The community.vmware collection also provides `vmware_datastore_maintenancemode` for explicitly entering or exiting datastore maintenance mode.
