# Validation Summary: How to Use Ansible to Migrate VMs with vMotion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware Ansible collection
- vmware.vmware Ansible collection
- VMware vSphere
- VMware vMotion and Storage vMotion
- VMware ESXi maintenance mode

## Sources Consulted
- Ansible community.vmware.vmware_vmotion module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vmotion_module.html
- Ansible community.vmware.vmware_vm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_info_module.html
- Ansible community.vmware.vmware_host_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_host_facts_module.html
- Ansible community.vmware.vmware_maintenancemode module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_maintenancemode_module.html
- Ansible vmware.vmware.esxi_maintenance_mode module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/esxi_maintenance_mode_module.html
- VMware vSphere Web Services API HostRuntimeInfo documentation: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.host.RuntimeInfo.html

## Issues Found
- The post description claimed the guide covered cross-vCenter moves, but the examples use `community.vmware.vmware_vmotion`, whose documented parameters cover migrations within a vCenter connection rather than a cross-vCenter operation. Removed the cross-vCenter promise from the description.
- The compute vMotion debug task referenced `vmotion_result.vm_name` and `vmotion_result.destination_host`, which are not documented return values. Updated it to use `vmotion_result.running_host`.
- The storage vMotion debug task referenced `svmotion_result.vm_name`, which is not a documented return value. Updated it to report `svmotion_result.datastore`.
- The host evacuation example used deprecated `community.vmware.vmware_maintenancemode`, which is documented for removal in community.vmware 7.0.0. Replaced it with `vmware.vmware.esxi_maintenance_mode` and current parameter names.
- The pre-migration validation example used `community.vmware.vmware_host_info`, which is not present in the current community.vmware collection documentation. Replaced it with `community.vmware.vmware_host_facts` using the documented `schema: vsphere` and `runtime.connectionState` / `runtime.inMaintenanceMode` properties.
- The validation section said it checked capacity, but the code checked host availability. Updated the wording and task name to match the actual validation.

## Review Notes
- `ansible-doc` was not installed in the local environment, so module verification was performed against the official online Ansible collection documentation.
- The `community.vmware.vmware_vmotion` module remains current in community.vmware 6.2.0, but some other community.vmware modules are being moved to the `vmware.vmware` collection.
