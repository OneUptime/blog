# Validation Summary: How to Set Up an Active-Passive Cluster with Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat High Availability Add-On
- Pacemaker
- pcs
- STONITH fencing
- OCF resource agents
- systemd-managed cluster resources

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing high availability clusters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation, creating a high availability cluster with Pacemaker: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_creating-high-availability-cluster-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation, configuring fencing in a Red Hat High Availability cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation, configuring cluster resources and resource groups: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-cluster-resources-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation, resource stickiness and node placement: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_determining-which-node-a-resource-runs-on-configuring-and-managing-high-availability-clusters

## Issues Found
- The resource group originally listed the virtual IP before the filesystem. Pacemaker starts grouped resources in the listed order and stops them in reverse order, so the filesystem should be available before the IP and application service are started. Changed the example to create and group `SharedFS`, then `ClusterVIP`, then `AppService`.
- The migration threshold explanation said the resource moves after 3 failures "within 120 seconds." Red Hat documents `failure-timeout` as the time after which the failure count expires, not a fixed sliding window. Updated the wording to say the resource moves after 3 failures before the failure count expires.
- The monitoring section described `pcs resource failcount show` as failover history. This command shows current failure counts and limits, not a full history. Updated the label accordingly.

## Review Notes
- The `pcs host auth`, `pcs cluster setup`, `pcs cluster start --all`, `pcs cluster enable --all`, `pcs stonith create`, location constraints for fence devices, `pcs node standby`, `pcs node unstandby`, `pcs resource move`, `pcs resource clear`, `pcs resource defaults update resource-stickiness=100`, and `pcs resource meta` examples match current RHEL 9 `pcs` documentation.
- The sample `fence_ipmilan` credentials and IP addresses are placeholders. In production, the fence agent options must match the actual BMC or power device, and fencing should be tested before relying on the cluster.
