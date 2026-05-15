# Validation Summary: How to Install and Set Up a Pacemaker High Availability Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat High Availability Add-On
- Pacemaker
- Corosync
- pcs
- firewalld
- STONITH fencing
- OCF IPaddr2 resource agent

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters
- Red Hat Enterprise Linux 9 documentation: Chapter 3, The pcs command-line interface: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_pcs-operation-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Managing cluster resources: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_managing-cluster-resources-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Resource monitoring operations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_resource-monitoring-operations-configuring-and-managing-high-availability-clusters

## Issues Found
No technical issues found.

## Review Notes
The commands align with the RHEL 9 High Availability Add-On workflow. Red Hat documents `pcs cluster setup my_cluster --start node1 node2` as a combined setup/start example, but the post's separate `pcs cluster setup`, `pcs cluster start --all`, and `pcs cluster enable --all` sequence is valid. The local environment did not have `pcs` or `firewall-cmd` installed, so command validation was performed against official Red Hat documentation rather than local CLI help output.
