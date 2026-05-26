# Validation Summary: How to Use Ansible to Manage VMware Resource Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware Ansible collection
- VMware vSphere
- VMware resource pools
- vMotion
- YAML playbooks

## Sources Consulted
- Ansible community.vmware.vmware_resource_pool module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_resource_pool_module.html
- Ansible community.vmware.vmware_resource_pool_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_resource_pool_info_module.html
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vmware_guest_move module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_move_module.html
- Ansible community.vmware.vmware_vmotion module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vmotion_module.html
- Broadcom vSphere Web Services API ResourcePool documentation: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.ResourcePool.html

## Issues Found
- The custom share examples used non-existent `cpu_shares_value` and `mem_shares_value` keys. Changed them to the documented `cpu_allocation_shares` and `mem_allocation_shares` module parameters.
- The resource pool information example referenced return keys such as `cpu_reservation`, `cpu_limit`, `mem_reservation`, and `mem_limit`. Changed them to the documented `cpu_allocation_reservation`, `cpu_allocation_limit`, `mem_allocation_reservation`, and `mem_allocation_limit` return keys.
- The VM move example used `community.vmware.vmware_guest_move` with `dest_resource_pool`, but that module moves VMs between folders and requires `dest_folder`. Changed the example to use `community.vmware.vmware_vmotion` with `destination_resourcepool`.
- The explanation of VM contention and guaranteed resources was overstated. Adjusted it to describe reservations and contention control more accurately.
- The share explanation implied the same numeric share levels for CPU and memory. Clarified that the listed values apply to CPU resource pools and that memory share values scale differently.

## Review Notes
All YAML snippets parse successfully. `ansible-doc` was not installed in the local workspace, so module parameter verification was performed against the current official Ansible collection documentation.
