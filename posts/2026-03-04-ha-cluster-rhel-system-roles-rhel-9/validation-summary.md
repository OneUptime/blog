# Validation Summary: How to Configure a High Availability Cluster Using RHEL System Roles on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles
- Ansible
- Pacemaker
- pcs
- STONITH fencing
- Apache HTTP Server resource agents
- Ansible Vault

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a high-availability cluster by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-a-high-availability-cluster-by-using-the-ha-cluster-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Automating system administration by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/automating_system_administration_by_using_rhel_system_roles
- Ansible documentation: ansible-vault CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html

## Issues Found
- The prerequisites did not mention active RHEL and High Availability Add-On subscriptions. Red Hat documents this as required when enabling the repositories needed by the `ha_cluster` role, so this prerequisite was added.
- The Apache resource example did not state that Apache must already be installed and configured on each target node. The `apache` resource agent manages an existing Apache configuration, so this prerequisite was added.
- The main playbook omitted `ha_cluster_manage_firewall: true` and `ha_cluster_manage_selinux: true`. Red Hat documents these as needed when the target systems run `firewalld` and SELinux, so both variables were added to the example.
- The fencing example used a non-existent `ha_cluster_fence_agents` variable and specified fencing agents without the required `stonith:` prefix. Red Hat documents fencing devices under `ha_cluster_resource_primitives` with agents such as `stonith:fence_xvm`, so the example was changed to use `ha_cluster_resource_primitives` and `stonith:fence_ipmilan`.
- The location constraint example placed `score` at the top level. Red Hat documents location constraint scores under the `options` list, so the example was corrected to use `options: [{ name: score, value: "-INFINITY" }]`.
- The idempotency section said rerunning the role would not disrupt an already configured cluster. Red Hat warns that the role replaces existing cluster configuration and unspecified settings are lost, so the wording was changed to say the role is idempotent for the declared state and requires the playbook to contain the complete desired configuration.

## Review Notes
- The remaining examples are intentionally minimal. A production deployment should avoid plaintext passwords in the playbook and should define environment-specific fencing, firewall, SELinux, Apache, and network details.
