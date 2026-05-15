# Validation Summary: How to Manage Cluster Resources with pcs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- pcs
- Pacemaker
- Corosync high availability clusters
- OCF resource agents
- systemd resources

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Chapter 11, Configuring cluster resources: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-cluster-resources-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Chapter 18, Managing cluster resources: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_managing-cluster-resources-configuring-and-managing-high-availability-clusters
- pcs(8) manual page: https://www.mankier.com/8/pcs

## Issues Found
- The start/stop wording described `pcs resource enable` and `pcs resource disable` as direct starts and stops. Updated the text to match the documented behavior: disable prevents the cluster from starting the resource, and enable allows the cluster to start it depending on the rest of the configuration.
- The `pcs resource move` explanation said the move creates a temporary location constraint that should be manually removed after the move. Updated it for RHEL 9 behavior, where `pcs resource move` automatically removes the move constraint by default, while `pcs resource clear` is still useful when a move or ban constraint remains.
- The meta attribute description said `migration-threshold` and `failure-timeout` set how long to wait before moving a resource after a failure. Updated it to clarify that `migration-threshold` is a failure count and `failure-timeout` controls how long failure counts are retained.
- The `resource-stickiness` description said it makes a resource prefer a specific node. Updated it to state that stickiness makes a resource prefer staying on its current node.

## Review Notes
The command examples are generally valid for RHEL 9 pcs/Pacemaker clusters. Some commands have optional `--wait` behavior and version-specific additions in later RHEL 9 minor releases, but the post's examples do not depend on those newer options.
