# Validation Summary: How to Use Ansible Automation Mesh for Distributed RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Ansible Automation Platform
- Ansible Automation Mesh
- Automation controller instance groups
- Receptor
- RHEL firewalld

## Sources Consulted
- Red Hat Ansible Automation Platform 2.5, Automation mesh for VM environments: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/automation_mesh_for_vm_environments/automation_mesh_for_vm_environments
- Red Hat Ansible Automation Platform 2.5, Planning for automation mesh: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/automation_mesh_for_vm_environments/assembly-planning-mesh
- Red Hat Ansible Automation Platform 2.5, Automation mesh design patterns: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/automation_mesh_for_vm_environments/design-patterns
- Red Hat Ansible Automation Platform 2.5, Instance and container groups: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/using_automation_execution/controller-instance-and-container-groups
- Red Hat Ansible Automation Platform 2.6, Add execution nodes: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6/install-ref_adding_execution_nodes
- Receptor documentation, receptorctl status command: https://docs.ansible.com/projects/receptor/en/latest/receptorctl/receptorctl_status.html
- Red Hat Customer Portal solution for AAP execution-node Receptor connectivity diagnostics: https://access.redhat.com/solutions/7067801

## Issues Found
- The post described automation mesh as having only three node types. Red Hat documents control and hybrid node types in the control plane, plus execution and hop node types in the execution plane. Updated the wording to mention all four node types while preserving the distributed topology focus.
- The control node description said control nodes "run the automation controller." Red Hat documents that control nodes run persistent controller services, project and inventory updates, and system jobs, but not regular jobs. Updated the description accordingly.
- The inventory example used a custom `[remote_execution_nodes]` group for grouped remote execution nodes. Red Hat documents that installer-created instance groups must use the `instance_group_` prefix. Renamed it to `[instance_group_remote]` and updated its vars stanza.
- The inventory example implicitly targeted a VM/RPM-style installer but did not say so. Added a short note clarifying that the shown `node_type` and `peers` inventory style is for VM-based or RPM-based installations. Current containerized installations use `receptor_type` and `receptor_peers`.

## Review Notes
The Receptor socket path `/var/run/receptor/receptor.sock`, `receptorctl status`, `receptorctl ping`, `awx-manage list_instances`, the instance-group API association pattern, and TCP port 27199 firewall guidance were consistent with the consulted documentation for current AAP 2.x usage. For containerized AAP deployments, the inventory variables differ from the VM/RPM example shown in the post.
