# Validation Summary: How to Use Ansible to Deploy VMs from Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- community.vmware collection
- vmware.vmware collection
- VMware vSphere and vCenter
- VMware VM templates and guest customization
- RHEL package and service configuration

## Sources Consulted
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vcenter_folder module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vcenter_folder_module.html
- Ansible vmware.vmware.folder module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/folder_module.html
- Ansible module defaults documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_module_defaults.html

## Issues Found
- The multi-tier stack example used `community.vmware.vmware_folder`, which is not the current documented folder-management module. Replaced it with `vmware.vmware.folder`, using `absolute_path` values as documented by the current vmware.vmware collection.
- The guest customization description said it sets "domain membership." In the Linux/RHEL examples shown, the module parameters configure DNS domain settings, not Windows Active Directory domain joining. Updated the wording to "DNS domain settings."

## Review Notes
- The `community.vmware.vmware_guest` examples use documented parameters such as `template`, `state`, `datacenter`, `cluster`, `folder`, `datastore`, `hardware`, `networks`, `customization`, `customization_spec`, and `wait_for_ip_address`.
- `wait_for_ip_address` depends on VMware Tools reporting an address to vCenter, and Linux guest customization depends on the guest OS and vCenter support matrix. The examples assume templates are prepared accordingly.
