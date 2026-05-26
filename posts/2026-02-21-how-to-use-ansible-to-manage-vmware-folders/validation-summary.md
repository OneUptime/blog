# Validation Summary: How to Use Ansible to Manage VMware Folders

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- VMware vSphere
- VMware Ansible collections
- vSphere folders
- Ansible dynamic inventory

## Sources Consulted
- Ansible `vmware.vmware.folder` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/folder_module.html
- Ansible `community.vmware.vcenter_folder` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vcenter_folder_module.html
- Ansible `community.vmware.vmware_guest` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible `community.vmware.vmware_guest_move` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_move_module.html
- Ansible `community.vmware.vmware_folder_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_folder_info_module.html
- Ansible `vmware.vmware.vms` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vms_inventory.html
- Ansible `community.vmware.vmware_vm_inventory` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_inventory_inventory.html

## Issues Found
- The post used `community.vmware.vmware_folder`, which is not the current supported folder-management module. Updated folder creation and removal examples to use `vmware.vmware.folder`.
- The folder examples used `folder_name`, which belongs to the deprecated `community.vmware.vcenter_folder` module. Updated examples to use `relative_path` with `datacenter` and `folder_type`, matching `vmware.vmware.folder`.
- The nested-folder explanation implied a separate parent-path parameter. Updated the examples to pass nested folder paths as `relative_path`; the supported module creates missing folders in the specified path.
- The dynamic inventory example used the deprecated `community.vmware.vmware_vm_inventory` plugin. Updated it to `vmware.vmware.vms`.
- The inventory grouping expressions used partial paths against `path`. Updated them to full vSphere folder paths and enabled `group_by_paths`.
- The removal section said folders must be empty before removal. Updated the wording because `vmware.vmware.folder` removes the specified folder tree and can affect contained inventory objects.

## Review Notes
The remaining `community.vmware.vmware_guest`, `community.vmware.vmware_guest_move`, and `community.vmware.vmware_folder_info` examples match documented parameters. Some `community.vmware` content is being migrated into the newer `vmware.vmware` collection, so this post may need another pass when replacement modules are available for all examples.
