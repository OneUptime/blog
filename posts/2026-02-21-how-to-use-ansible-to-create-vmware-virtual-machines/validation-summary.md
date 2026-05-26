# Validation Summary: How to Use Ansible to Create VMware Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible collections
- community.vmware.vmware_guest
- VMware vSphere and vCenter
- VMware guest OS customization
- pyVmomi
- YAML playbooks

## Sources Consulted
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible module_defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Ansible ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible ansible.builtin.add_host module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/add_host_module.html
- Broadcom vSphere Web Services API GuestOsIdentifier reference: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.GuestOsDescriptor.GuestOsIdentifier.html
- Ansible VMware introduction and pyVmomi requirements: https://docs.ansible.com/ansible/5/collections/community/vmware/docsite/vmware_scenarios/vmware_intro.html

## Issues Found
- The full-configuration example used non-existent `hardware` keys `cpu_hot_add_enabled`, `cpu_hot_remove_enabled`, and `mem_hot_add_enabled`. Changed them to the documented `hotadd_cpu`, `hotremove_cpu`, and `hotadd_memory` parameters.
- The examples that configured static guest IP addresses implied that guest networking could be applied to a blank VM. The `vmware_guest` documentation states that network `ip`, `netmask`, `gateway`, `domain`, and `dns_servers` values are guest customization settings and require an installed guest OS with VMware Tools. Updated those examples to clone from a template and clarified the VMware Tools requirement.
- The bulk VM example set per-VM IP addresses without a customization block. Added `template`, per-VM `domain`, and `customization` fields so the static IP settings are applied through guest customization.
- The cleanup task in the error-handling example omitted `folder`, which can be needed to uniquely identify a VM when names are not unique in vCenter. Added the same folder path used by the creation task.

## Review Notes
The examples use `validate_certs: false` for lab simplicity. In production, certificate validation should be enabled with a trusted CA bundle. The local review environment did not have Ansible installed, so syntax checking with `ansible-playbook --syntax-check` could not be run.
