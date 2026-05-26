# Validation Summary: How to Use Ansible to Configure VMware VM Hardware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware Ansible collection
- vmware.vmware Ansible collection
- VMware vSphere / ESXi / ESX
- VMware virtual machine hardware configuration

## Sources Consulted
- Ansible `community.vmware.vmware_guest` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible `community.vmware.vmware_guest_boot_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_boot_manager_module.html
- Ansible `community.vmware.vmware_guest_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_info_module.html
- Ansible `community.vmware.vmware_guest_powerstate` deprecation notice: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_powerstate_module.html
- Ansible `vmware.vmware.vm_powerstate` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_powerstate_module.html
- Ansible `module_defaults` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Broadcom VMware virtual machine hardware versions knowledge base: https://knowledge.broadcom.com/external/article/315655/virtual-machine-hardware-versions.html

## Issues Found
- The post used non-existent `community.vmware.vmware_guest` hardware keys: `cpu_hot_add_enabled`, `cpu_hot_remove_enabled`, and `mem_hot_add_enabled`. I changed them to the documented keys `hotadd_cpu`, `hotremove_cpu`, and `hotadd_memory`.
- The full reconfiguration example placed `boot_order` and `boot_delay` under `vmware_guest.hardware`, but those settings are managed by `community.vmware.vmware_guest_boot_manager`. I moved them into a separate boot manager task and adjusted the surrounding sentence.
- The post used deprecated `community.vmware.vmware_guest_powerstate` tasks. I changed those tasks to the documented replacement, `vmware.vmware.vm_powerstate`, and added the required connection and datacenter parameters.
- The VM hardware version diagram stopped at version 21. Broadcom's current hardware version table lists virtual hardware version 22 for ESX 9.0, so I added it.
- The hardware upgrade section said the upgrade cannot be reversed. Broadcom documents limited downgrade paths outside vSphere, so I narrowed the statement to say it cannot be reversed directly in vSphere.
- The hardware upgrade example used a fixed `pause` after requesting guest shutdown. I replaced that with the `vm_powerstate` module's `timeout` parameter so the task waits for the powered-off state instead of assuming 60 seconds is enough.

## Review Notes
The examples are still environment-dependent: VM names, folders, datacenter names, credentials, VMware Tools state, guest OS support, and host/vCenter compatibility must match the target vSphere environment. `validate_certs: false` is technically valid but should be avoided in production when proper CA trust is available.
