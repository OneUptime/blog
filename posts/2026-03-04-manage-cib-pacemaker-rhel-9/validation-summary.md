# Validation Summary: How to Manage the Cluster Information Base (CIB) in Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- Cluster Information Base (CIB)
- pcs
- cibadmin
- crm_shadow
- crm_verify

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "The pcs command-line interface": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_pcs-operation-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing high availability clusters": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters
- ClusterLabs Pacemaker cibadmin(8) manual: https://clusterlabs.org/projects/pacemaker/man/cibadmin.8.html
- ClusterLabs Pacemaker crm_shadow(8) manual: https://clusterlabs.org/projects/pacemaker/man/crm_shadow.8.html
- ClusterLabs Pacemaker crm_verify(8) manual: https://clusterlabs.org/projects/pacemaker/man/crm_verify.8.html
- ClusterLabs Pacemaker Administration guide: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Administration/html/tools.html

## Issues Found
- The post described `pcs cluster cib` as a readable pcs view. Red Hat documents this command as displaying raw cluster XML, so the command was changed to `pcs config` for the readable cluster configuration view.
- The shadow CIB example created a shadow copy and then showed a normal `pcs resource create` command without indicating it must run in the shadow shell. The example now includes the `shadow[my-changes] #` prompt to make clear that the command is operating against the shadow CIB.
- The batch CIB workflow pushed the full edited CIB directly. Red Hat recommends keeping an original copy and using `diff-against` so only the intended changes are pushed and parallel changes are not overwritten. The example was updated accordingly.
- The `crm_verify -V` command used only the verbose flag and did not specify a data source. The validation command was changed to `crm_verify --live-check --verbose`, matching the current Pacemaker manual for checking the running cluster configuration.

## Review Notes
The remaining commands and claims are consistent with current RHEL 9 and upstream Pacemaker documentation. Direct XML modification with `cibadmin` is valid as an advanced Pacemaker workflow, but routine RHEL administration should still prefer `pcs` or `pcsd` where possible.
