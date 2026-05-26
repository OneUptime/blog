# Validation Summary: How to Use Ansible to Manage VMware VM Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `community.vmware` collection
- VMware vSphere / vCenter
- VMware virtual disks, datastores, SCSI controllers, and Storage vMotion
- Linux LVM filesystem expansion

## Sources Consulted
- Ansible `community.vmware.vmware_guest_disk` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_disk_module.html
- Ansible `community.vmware.vmware_vmotion` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vmotion_module.html
- Ansible `community.vmware.vmware_guest_disk_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_disk_info_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `community.general.lvol` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/lvol_module.html
- Ansible module defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Broadcom VMware vSphere Configuration Maximums overview: https://knowledge.broadcom.com/external/article/317882/configuration-maximums.html

## Issues Found
- The guest filesystem rescan task used `ansible.builtin.command` with shell redirection (`>`). The `command` module does not process shell metacharacters, so the task would not write to `/sys/class/block/sdc/device/rescan`. Changed it to `ansible.builtin.shell`.
- The Storage vMotion confirmation message referenced `svmotion_result.vm_name`, but the documented return values for `community.vmware.vmware_vmotion` include `datastore` for Storage vMotion, not `vm_name`. Changed the message to use `svmotion_result.datastore`.
- The description and introduction claimed the post covered storage policies, but no storage policy workflow or module example was present. Changed those scope statements to say storage migrations instead.

## Review Notes
The examples are broadly aligned with current `community.vmware` module parameters and return structures. The post uses the current fully qualified collection names and valid disk provisioning values. The Linux guest filesystem expansion example remains intentionally environment-specific; device names, LVM volume group names, and filesystem support must be adjusted for the target VM.
