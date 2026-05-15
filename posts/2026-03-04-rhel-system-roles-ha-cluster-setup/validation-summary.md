# Validation Summary: How to Use RHEL System Roles for HA Cluster Setup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL system roles
- `ha_cluster` system role
- Pacemaker
- Corosync
- pcs
- Ansible
- Apache HTTP Server resource agent
- STONITH/fencing

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring a high-availability cluster by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Configuring an Apache HTTP server in a high availability cluster with the ha_cluster RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles

## Issues Found
- Added a RHEL 9.5+ caveat for `ha_cluster_node_options`, because Red Hat documents that variable as available in RHEL 9.5 and later.
- Added `ha_cluster_manage_firewall: true` and `ha_cluster_manage_selinux: true` to the playbooks, matching Red Hat guidance for current RHEL 9 systems when firewalld and SELinux are in use.
- Clarified that the demo `hacluster` password should be stored with Ansible Vault in real deployments, matching Red Hat's secure playbook examples.
- Clarified that the Apache resource example assumes Apache is already installed and configured on both nodes, including the local `server-status` endpoint required by the Apache OCF resource.
- Reworded the `no-quorum-policy: ignore` comment to describe the actual behavior for a fenced two-node cluster instead of broadly saying resources should not stop on quorum loss.

## Review Notes
The playbook YAML snippets were parsed successfully after the edits. The article uses the legacy role name `rhel-system-roles.ha_cluster`, which remains consistent with the role path installed by the `rhel-system-roles` package, while current Red Hat examples commonly show `redhat.rhel_system_roles.ha_cluster` through `include_role`.
