# Validation Summary: How to Use Ansible to Manage VMware vSAN

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `community.vmware` collection
- VMware vSphere/vCenter
- VMware vSAN
- ESXi ESXCLI
- vSphere storage policies

## Sources Consulted
- Ansible `community.vmware` collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/index.html
- Ansible `community.vmware.vmware_cluster_vsan` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_cluster_vsan_module.html
- Ansible `community.vmware.vmware_vsan_cluster` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vsan_cluster_module.html
- Ansible `community.vmware.vmware_vm_storage_policy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_storage_policy_module.html
- Ansible `community.vmware.vmware_vm_storage_policy_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_storage_policy_info_module.html
- Ansible `community.vmware.vmware_guest_storage_policy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_storage_policy_module.html
- Ansible `community.vmware.vmware_vsan_health_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vsan_health_info_module.html
- Broadcom ESXCLI vSAN command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_vsan.html
- VMware/Broadcom vSAN architecture documentation and technical articles: https://www.vmware.com/docs/vmw-infographic-vsan-express-storage-architecture-introduction and https://blogs.vmware.com/virtualblocks/2019/04/18/vsan-disk-groups/

## Issues Found
- The prerequisites listed Ansible 2.12+ without a collection-version caveat. Updated this to require an Ansible version supported by the installed `community.vmware` collection, because the current collection documents ansible-core 2.19+ support.
- The prerequisites omitted the VMware vSAN Management SDK required by vSAN-specific modules. Added that requirement and clarified that it is distributed separately from PyPI.
- The architecture refresher described all vSAN hosts as using cache/capacity disk groups. Updated it to distinguish vSAN OSA disk groups from vSAN ESA storage pools.
- The vSAN enablement example claimed to enable deduplication and compression, but the module parameters shown did not do that. Changed the comment to match the actual task.
- The disk-group example used `community.vmware.vmware_vsan_cluster` with unsupported disk-group parameters. Replaced that task with an ESXCLI-based command using `esxcli vsan storage add -s ... -d ...`.
- The storage-policy example used unsupported `subprofiles` and vSAN rule fields with `community.vmware.vmware_vm_storage_policy`, which only creates tag-based policies. Changed the section to verify existing vSAN SPBM policies with `vmware_vm_storage_policy_info`.
- The VM policy assignment examples used incorrect parameter names (`vm_name`, `vm_home_policy`, and `disk_policy`). Replaced them with the documented `name`, `vm_home`, and `disk` parameters.
- The health-check playbook used an unrelated permission module for object health and checked a non-documented `overall_health` field. Removed the unrelated task and changed the condition to use `vsan_health_info.clusterStatus.status`.
- The stretched-cluster example referenced a nonexistent `community.vmware.vmware_vsan_stretch_cluster` module. Replaced the example with a supported health-validation workflow and noted that stretched-cluster creation needs vCenter/API or PowerCLI outside this collection.
- The networking guidance said vSAN traffic always needs at least 10 GbE. Updated it to distinguish all-flash/ESA requirements from hybrid environments where 10 GbE is still strongly beneficial.

## Review Notes
The corrected disk-group example uses ESXCLI through `ansible.builtin.command`, which is accurate but not fully idempotent. A production role should add existence checks around `esxcli vsan storage list` before creating disk groups.
