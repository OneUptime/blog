# Validation Summary: How to Use Ansible to Manage VMware VM Power State

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- VMware vSphere and vCenter
- vmware.vmware collection
- community.vmware collection
- Cron scheduling

## Sources Consulted
- Ansible documentation: vmware.vmware.vm_powerstate module: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_powerstate_module.html
- Ansible documentation: community.vmware.vmware_guest_powerstate module deprecation notice: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_powerstate_module.html
- Ansible documentation: community.vmware.vmware_guest module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible documentation: community.vmware.vmware_guest_info module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_info_module.html
- Ansible documentation: module defaults and action groups: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_module_defaults.html
- vmware.vmware collection runtime metadata for the vmware action group: https://raw.githubusercontent.com/ansible-collections/vmware.vmware/main/meta/runtime.yml

## Issues Found
- The post used `community.vmware.vmware_guest_powerstate` as the primary power-state module. The current Ansible documentation marks that module as deprecated and scheduled for removal in community.vmware 7.0.0, with `vmware.vmware.vm_powerstate` as the replacement. Updated the examples and explanatory text to use `vmware.vmware.vm_powerstate`.
- The replacement `vmware.vmware.vm_powerstate` module requires `datacenter`. Added `vcenter_datacenter` to the examples that use `module_defaults`, and added `datacenter: "DC01"` to the standalone safe-shutdown task fragment.
- The module defaults action group was still `group/community.vmware.vmware` in examples that now use the `vmware.vmware` collection. Updated it to `group/vmware.vmware.vmware`, which is the action group defined by the vmware.vmware collection metadata.
- The batch shutdown example said it waited between groups, but the playbook pauses only after the flattened loop completes. Updated the comment to say it waits after sending shutdown requests.

## Review Notes
The `community.vmware.vmware_guest` examples remain technically valid for combining VM configuration and power-state changes. The cron examples are syntactically valid, but production deployments should still account for controller timezone, credential handling, and scheduler failure notifications.
