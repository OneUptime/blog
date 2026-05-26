# Validation Summary: How to Use Ansible to Clone VMware Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.vmware collection
- vmware.vmware collection
- VMware vSphere / vCenter
- VM cloning, linked clones, snapshots, and guest OS customization

## Sources Consulted
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vmware_guest_snapshot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_snapshot_module.html
- Ansible vmware.vmware.vm_snapshot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_snapshot_module.html
- Ansible module_defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- VMware vSphere guest customization API reference for time zone handling: https://dp-downloads-pstg.broadcom.com/api-content/apis/API_VAA_003/7.0U1/html/structures/com/vmware/vcenter/guest/customization_spec-structure.html

## Issues Found
- The linked-clone snapshot example used `community.vmware.vmware_guest_snapshot`, which is deprecated in the current community.vmware documentation and scheduled for removal in version 8.0.0. Changed it to the documented replacement, `vmware.vmware.vm_snapshot`, and added explicit vCenter connection parameters because the existing `community.vmware` module defaults group does not cover modules from the `vmware.vmware` collection.
- The cross-cluster clone example said it would convert thin disks to thick by using `disk[].type`. The `community.vmware.vmware_guest` documentation defines the top-level `convert` parameter for disk type conversion while cloning. Replaced the disk list with `convert: thick`.
- The guest customization section stated that cloned VMs have the same IP address as the source. That is only reliably true for retained static guest network settings; DHCP environments can receive a different address. Reworded the sentence to refer to retained hostname, static network settings, and other identity.

## Review Notes
The remaining examples match the documented `community.vmware.vmware_guest` parameters for cloning, network customization, linked clones, `wait_for_ip_address`, Windows Sysprep customization fields, and VM removal. The post uses example credentials and `validate_certs: false`; production playbooks should prefer trusted vCenter certificates and Ansible Vault or an external secret manager for sensitive values.
