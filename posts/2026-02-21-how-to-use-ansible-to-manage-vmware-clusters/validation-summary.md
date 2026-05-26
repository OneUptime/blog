# Validation Summary: How to Use Ansible to Manage VMware Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- vmware.vmware Ansible collection
- VMware vSphere
- VMware ESXi
- vSphere HA
- vSphere DRS
- vMotion

## Sources Consulted
- Ansible `vmware.vmware.cluster` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_module.html
- Ansible `vmware.vmware.cluster_ha` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_ha_module.html
- Ansible `vmware.vmware.cluster_drs` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_drs_module.html
- Ansible `vmware.vmware.cluster_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_info_module.html
- Ansible `vmware.vmware.esxi_host` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/esxi_host_module.html
- Ansible `vmware.vmware.esxi_maintenance_mode` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/esxi_maintenance_mode_module.html
- Ansible `community.vmware.vmware_cluster` removal notice: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_cluster_module.html
- Ansible `community.vmware.vmware_maintenancemode` deprecation notice: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_maintenancemode_module.html
- `vmware.vmware` collection runtime action group metadata: https://github.com/ansible-collections/vmware.vmware/blob/main/meta/runtime.yml
- Broadcom VMware vSphere HA knowledge base article: https://knowledge.broadcom.com/external/article/413987/vsphere-ha-restarted-this-virtual-machin.html

## Issues Found
- The post used `community.vmware.vmware_cluster`, which current Ansible documentation marks as removed from `community.vmware` 6.0.0. Updated examples to use `vmware.vmware.cluster`.
- The create-cluster examples used removed cluster-module options such as `enable_ha`, `enable_drs`, and `enable_vsan`. Split cluster creation from HA and DRS configuration using `vmware.vmware.cluster_ha` and `vmware.vmware.cluster_drs`.
- The HA examples used old `community.vmware.vmware_cluster_ha` parameter names such as `ha_host_monitoring`, `ha_vm_monitoring`, `ha_restart_priority`, and `slot_based_admission_control`. Updated them to current `vmware.vmware.cluster_ha` parameters including `host_failure_response`, `vm_monitoring`, `admission_control_policy`, and `admission_control_failover_level`.
- The host-add example used the deprecated `community.vmware.vmware_host` module and `esxi_hostname` parameter. Updated it to `vmware.vmware.esxi_host` with `esxi_host_name`.
- The maintenance example used deprecated `community.vmware.vmware_maintenancemode` and `state: present/absent`. Updated it to `vmware.vmware.esxi_maintenance_mode` with `enable_maintenance_mode: true/false`.
- The maintenance comment implied DRS always migrates VMs off the host. Updated it to note that `evacuate` applies to powered-off VMs and DRS can migrate running VMs when configured.

## Review Notes
The examples use `validate_certs: false` for simplicity, which is common in examples but should be replaced with proper certificate validation in production environments. The YAML code blocks were parsed successfully after the edits.
