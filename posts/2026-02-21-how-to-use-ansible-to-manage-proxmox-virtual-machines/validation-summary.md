# Validation Summary: How to Use Ansible to Manage Proxmox Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.proxmox Ansible collection
- Proxmox VE
- KVM/QEMU virtual machines
- LXC containers
- cloud-init
- Proxmox API tokens

## Sources Consulted
- Ansible community.proxmox collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/proxmox/index.html
- Ansible community.proxmox.proxmox_kvm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/proxmox/proxmox_kvm_module.html
- Ansible community.proxmox.proxmox module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/proxmox/proxmox_module.html
- Ansible community.proxmox.proxmox_snap module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/proxmox/proxmox_snap_module.html
- Ansible community.general Proxmox redirect/deprecation documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/proxmox_kvm_module.html
- Proxmox VE pveum command documentation: https://pve.proxmox.com/pve-docs/pveum.1.html
- Proxmox VE qm command documentation: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE pct command documentation: https://pve.proxmox.com/pve-docs/pct.1.html
- Proxmox VE QEMU/KVM migration documentation: https://pve.proxmox.com/wiki/Qemu/KVM_Virtual_Machines

## Issues Found
- The post used `community.general` Proxmox modules and installed `community.general`. Current Ansible documentation marks these as deprecated redirects because Proxmox content moved to `community.proxmox`. Updated the prerequisite, install command, module names, and supported ansible-core/proxmoxer versions.
- Clone examples used `vmid` as the new VM ID. The current `proxmox_kvm` module uses `vmid` for the source VM when cloning and `newid` for the cloned VM. Updated clone tasks to use `vmid` for the template ID and `newid` for the target VM ID.
- The cloud-init DNS fields were shown as scalar strings. Current documentation defines `nameservers` and `searchdomains` as lists. Updated the example to use YAML lists.
- The LXC `netif` value was a JSON string. The current `proxmox` module documents `netif` as a dictionary. Updated it to a YAML dictionary.
- The migration example used a non-existent `migrate_target` parameter. The current `proxmox_kvm` module migrates to the node specified by `node` when `migrate: true`. Updated the task accordingly.
- The live migration tip said local storage requires offline migration. Proxmox supports live local disk migration when explicitly enabled, and the Ansible module exposes this as `with_local_disks`. Updated the wording.

## Review Notes
The post now targets the current `community.proxmox` collection. Existing examples still use placeholder hostnames, storage names, ISO paths, and credentials that must match the reader's Proxmox environment.
