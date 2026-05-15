# Validation Summary: How to Perform Cluster Maintenance Without Downtime on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs command-line interface
- Corosync quorum / votequorum
- RHEL High Availability Add-On maintenance workflows

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters, Chapter 32, Performing cluster maintenance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_cluster-maintenance-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters, Chapter 20, Managing cluster nodes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_clusternode-management-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters, Chapter 18, Managing cluster resources: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_managing-cluster-resources-configuring-and-managing-high-availability-clusters
- Pacemaker Administration 2.1, Administrative Modes: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Administration/html/administrative.html
- Red Hat Customer Portal references on unmanaged resources and monitor behavior, including solutions 5721201 and 2147031: https://access.redhat.com/solutions/5721201 and https://access.redhat.com/solutions/2147031

## Issues Found
- The post implied that node standby alone is sufficient before applying software updates. Red Hat's RHEL 9 HA documentation warns that nodes undergoing High Availability or Resilient Storage software updates must not be active cluster members. I updated the maintenance and rolling upgrade examples to stop cluster services on the node before running `dnf upgrade` and rebooting, then start cluster services before removing standby.
- The cluster-wide maintenance section said all monitoring stops. Pacemaker documentation is more specific: recurring monitors for active affected resources are paused while resource start and stop management is paused. I updated the wording to avoid overstating the behavior.
- The resource-level maintenance section said `pcs resource unmanage` stops monitoring. Pacemaker documentation states that recurring actions are not affected by unmanaging a resource. I corrected the explanation to say Pacemaker will not start, stop, restart, or move the resource, and that monitor operations must be disabled explicitly if that is required.
- The quorum section said expected votes auto-adjust when nodes rejoin. A manual expected-votes change should be restored to the normal full-cluster value after maintenance. I changed the restore example to explicitly set the full expected vote count before checking quorum.

## Review Notes
The guide is technically relevant and generally aligned with RHEL 9 Pacemaker maintenance workflows. The exact expected-votes value is environment-specific, so the restored value should match the cluster's full node count.
