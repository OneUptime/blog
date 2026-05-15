# Validation Summary: How to Automate HA Cluster Setup Using the ha_cluster System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Pacemaker high availability clusters
- pcsd, pacemaker, and corosync services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a high-availability cluster by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat rhel_system_roles collection catalog, https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles

## Issues Found
- The playbook used the older `rhel-system-roles.ha_cluster` role name without the current Red Hat collection FQCN. Updated it to `redhat.rhel_system_roles.ha_cluster`, which matches current Red Hat examples and collection packaging.
- The playbook did not include required cluster variables for a working HA cluster example. Added `ha_cluster_cluster_name`, `ha_cluster_hacluster_password`, `ha_cluster_manage_firewall`, and `ha_cluster_manage_selinux` so the sample reflects Red Hat's documented minimal cluster configuration.
- The prerequisites did not mention active RHEL and RHEL High Availability Add-On subscription coverage for cluster hosts. Added this because Red Hat documents it as required when the role enables the needed repositories.
- The role documentation path pointed to `/usr/share/doc/rhel-system-roles/ha_cluster/README.md`, which does not match the documented role README path for the RPM-installed role. Updated it to `/usr/share/ansible/roles/rhel-system-roles.ha_cluster/README.md`.
- The verification commands used placeholders such as `<service>` and `<config-file>`. Replaced them with concrete HA cluster checks: `pcs status` and `systemctl status pcsd pacemaker corosync`.

## Review Notes
The sample stores the `hacluster` password directly in the playbook for brevity. In production, Red Hat examples commonly protect this value with Ansible Vault.
