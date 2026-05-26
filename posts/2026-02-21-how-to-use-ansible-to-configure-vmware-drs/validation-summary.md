# Validation Summary: How to Use Ansible to Configure VMware DRS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- VMware vSphere
- VMware Distributed Resource Scheduler (DRS)
- VMware vMotion
- `vmware.vmware` Ansible collection
- `community.vmware` Ansible collection
- PyVmomi

## Sources Consulted
- Ansible documentation: `vmware.vmware.cluster_drs` module: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_drs_module.html
- Ansible documentation: `vmware.vmware.cluster_info` module: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_info_module.html
- Ansible documentation: `community.vmware.vmware_drs_group` module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_drs_group_module.html
- Ansible documentation: `community.vmware.vmware_vm_host_drs_rule` module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_host_drs_rule_module.html
- Ansible documentation: `community.vmware.vmware_vm_vm_drs_rule` module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_vm_drs_rule_module.html
- Ansible documentation: `community.vmware.vmware_drs_override` module: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_drs_override_module.html
- Broadcom/VMware documentation: Using Virtual Machine Affinity Rules without vSphere DRS: https://www.vmware.com/docs/using-virtual-machine-affinity-rules-without-vsphere-drs

## Issues Found
- The post used `community.vmware.vmware_cluster_drs`, but the current `community.vmware` documentation says this module was removed in version 6.0.0. Updated DRS cluster configuration examples to use `vmware.vmware.cluster_drs` and added the `vmware.vmware` collection to the prerequisites and install command.
- The verification example used deprecated `community.vmware.vmware_cluster_info`. Updated it to `vmware.vmware.cluster_info`, which returns the documented `clusters` dictionary with DRS fields.
- The VM-host affinity rule examples used a non-existent `community.vmware.vmware_drs_rule` module. Updated them to `community.vmware.vmware_vm_host_drs_rule`, which supports `vm_group_name`, `host_group_name`, `mandatory`, and `affinity_rule`.
- The VM-to-VM anti-affinity examples used `community.vmware.vmware_drs_rule`, but VM-to-VM rules are handled by `community.vmware.vmware_vm_vm_drs_rule`. Updated the module name and changed the datacenter parameter to the documented `datacenter` field.
- The per-VM DRS override example incorrectly used `community.vmware.vmware_vm_vm_drs_rule` with unsupported `drs_behavior`, `enabled`, and single-string `vms` parameters. Updated it to `community.vmware.vmware_drs_override` with `vm_name` and `drs_behavior`.
- The prerequisite Ansible version was listed as 2.10+, but the latest official collection docs list higher supported ansible-core versions for current collection releases. Updated the prerequisite to Ansible 2.19+ to match the latest `community.vmware` collection used by the examples.

## Review Notes
The practical DRS explanations, automation level descriptions, DRS migration threshold range, VM/host group examples, and HA/affinity-rule caveats align with the consulted Ansible and VMware documentation. The examples still use `validate_certs: false` for lab simplicity; production environments should use trusted certificates.
