# Validation Summary: How to Perform Cluster Maintenance Without Downtime on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Pacemaker
- pcs CLI
- RHEL High Availability clusters
- DNF package updates

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Performing cluster maintenance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_cluster-maintenance-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 8 documentation: Managing cluster resources: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_managing-cluster-resources-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 10 documentation: Performing cluster maintenance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_high_availability_clusters/cluster-maintenance
- Pacemaker Administration: Administrative Modes: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Administration/html/administrative.html

## Issues Found
- The standby example said all resources should be running on `node2`. This is only guaranteed in a simple two-node cluster where `node2` is eligible to host every resource. Updated the wording to say resources should be running on another eligible node.
- The single-resource maintenance example used `pcs resource cleanup my_resource` to force a probe after re-enabling management. On current RHEL documentation, `pcs resource cleanup` operates on resources with failed actions, while `pcs resource refresh` re-detects current resource state regardless of failure status. Replaced the command with `pcs resource refresh my_resource`.

## Review Notes
The remaining `pcs node standby`, `pcs node unstandby`, `pcs property set maintenance-mode=true|false`, `pcs resource unmanage`, `pcs resource manage`, `pcs status`, `pcs status --full`, `pcs resource status`, and `pcs resource cleanup` usages match current RHEL HA documentation for modern RHEL releases. Older RHEL 7 documentation also shows `pcs cluster standby` and `pcs cluster unstandby`; the post uses the current RHEL 8/9/10 form.
