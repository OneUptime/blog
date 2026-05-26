# Validation Summary: How to Use Ansible to Configure VMware HA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-core
- vmware.vmware Ansible collection
- community.vmware Ansible collection
- VMware vSphere HA
- VMware vCenter Server
- ESXi clusters
- pyVmomi

## Sources Consulted
- Ansible documentation: `vmware.vmware.cluster_ha` module, https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_ha_module.html
- Ansible documentation: `vmware.vmware.cluster_info` module, https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/cluster_info_module.html
- Ansible documentation: `community.vmware.vmware_cluster_ha` module deprecation notice, https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_cluster_ha_module.html
- Ansible documentation: `community.vmware.vmware_datastore_info` module, https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_datastore_info_module.html
- Ansible documentation: `vmware.vmware` collection index, https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/index.html
- Ansible documentation: `community.vmware` collection index, https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/index.html
- Broadcom VMware vSphere Availability documentation, vSphere HA concepts and admission control, https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-availability.html

## Issues Found
- The post used `community.vmware.vmware_cluster_ha`, which current Ansible documentation marks as deprecated and moved to `vmware.vmware.cluster_ha`. Updated the collection prerequisite, install command, module references, and examples to use `vmware.vmware.cluster_ha`.
- The HA examples used old flat parameters such as `ha_host_monitoring`, `ha_vm_monitoring`, `ha_vm_min_up_time`, `ha_vm_max_failures`, `ha_vm_failure_interval`, `ha_restart_priority`, `ha_admission_control`, and `ha_failover_level`. Updated them to the current nested `host_failure_response`, `vm_monitoring`, and `admission_control_*` options.
- The VM monitoring failure window was set to `24`, but the module expects seconds. Updated it to `86400` for a 24-hour window.
- The post referenced `community.vmware.vmware_vm_ha`, which is not present in the current documented collection index. Replaced the example with the supported cluster default restart priority configuration and noted that per-VM HA overrides require vCenter, PowerCLI, or the vSphere API.
- The heartbeat datastore example used unsupported `ha_datastore_heartbeating` and `ha_heartbeat_datastore` options. Replaced it with an Ansible verification example using `community.vmware.vmware_datastore_info` and clarified that heartbeat datastore selection is not exposed by the current HA module.
- The verification playbook used the deprecated `community.vmware.vmware_cluster_info` module. Updated it to `vmware.vmware.cluster_info` and current parameter names.
- The architecture section used older "master/slave" terminology. Updated it to "primary/secondary" host terminology.
- The advanced settings example configured isolation response through an advanced setting. Updated it to use the documented `host_isolation_response` parameter and left isolation addresses under `advanced_settings`.

## Review Notes
YAML snippets were parsed successfully locally. Ansible is not installed in this workspace, so live `ansible-playbook --syntax-check` and module introspection could not be run. The examples were validated against official Ansible documentation and source documentation, but they were not executed against a vCenter environment.
