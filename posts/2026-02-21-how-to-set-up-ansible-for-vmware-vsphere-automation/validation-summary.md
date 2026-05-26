# Validation Summary: How to Set Up Ansible for VMware vSphere Automation

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Ansible Core
- Ansible collections
- community.vmware collection
- vmware.vmware collection
- VMware vSphere and vCenter
- pyVmomi
- Ansible Vault
- Ansible inventory and ansible.cfg

## Sources Consulted
- Ansible community.vmware collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/index.html
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vmware_datacenter_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_datacenter_info_module.html
- Ansible community.vmware.vmware_host_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_host_facts_module.html
- Ansible vmware.vmware.cluster_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_info_module.html
- Ansible module_defaults documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_module_defaults.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible release and maintenance support matrix: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- Ansible community.vmware.vmware_vm_inventory inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_inventory_inventory.html
- pyVmomi project documentation: https://github.com/vmware/pyvmomi

## Issues Found
- The prerequisites listed Python 3.9 or later, but Ansible Core 2.19 supports Python 3.11 through 3.13 on the control node. Updated the prerequisite to align Python support with the Ansible Core release in use.
- The prerequisites listed Ansible Core 2.14 or later, but the latest community.vmware collection documentation lists support for Ansible Core 2.19 or later. Updated the prerequisite to tell readers to use a core version supported by the VMware collections they install.
- The dependency install command included both `pyVmomi` and `pyvmomi`, which are the same package name normalized by pip. Removed the duplicate package entry.
- The install command only installed `community.vmware`, but the corrected cluster example uses the non-deprecated `vmware.vmware.cluster_info` module. Added `vmware.vmware` to the collection install command and verification text.
- The project tree omitted `roles/vmware-base/defaults/main.yml` even though the post later instructs readers to create it. Added the defaults directory and file to the tree.
- The `ansible.cfg` snippet set `[inventory] enable_plugins = community.vmware.vmware_vm_inventory`. That inventory plugin is deprecated, and setting only that plugin would also disable the default YAML inventory parser needed for the shown `inventory/hosts.yml`. Removed the unnecessary inventory plugin override.
- The first playbook used deprecated `community.vmware.vmware_cluster_info`. Replaced it with `vmware.vmware.cluster_info` and supplied a datacenter loop, because the current module requires at least a datacenter or cluster selector.
- The first playbook used `community.vmware.vmware_host_info`, which is not a current module in the community.vmware collection index. Replaced it with `community.vmware.vmware_host_facts` and looped over ESXi hosts discovered from cluster information.
- The pyVmomi version check used `pyVim.__version__`, which is not the reliable package version API. Replaced it with `importlib.metadata.version('pyvmomi')`.

## Review Notes
Several community.vmware modules remain valid, but some VMware content has moved into the newer `vmware.vmware` collection. Future updates should consider whether the guide should fully standardize on `vmware.vmware` where replacements exist.
