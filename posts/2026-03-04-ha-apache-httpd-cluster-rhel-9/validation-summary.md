# Validation Summary: How to Configure a High Availability Apache HTTPD Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server
- Pacemaker and pcs
- OCF resource agents: IPaddr2, apache, Filesystem
- firewalld
- rsync and cron
- Shared storage for clustered web content

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring an active/passive Apache HTTP server in a Red Hat High Availability cluster, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-active-passive-http-server-in-a-cluster-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Configuring cluster resources, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-cluster-resources-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Determining which nodes a resource can run on, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_determining-which-node-a-resource-runs-on-configuring-and-managing-high-availability-clusters
- Apache HTTP Server 2.4 documentation: mod_status, https://httpd.apache.org/docs/current/mod/mod_status.html

## Issues Found
- The Apache installation command installed only `httpd`. Red Hat's RHEL 9 HA Apache procedure also installs `wget`, which the Apache resource agent needs to check the server status URL. Changed the command to install `httpd wget`.
- The post correctly said Pacemaker should manage Apache instead of systemd, but it omitted Red Hat's required logrotate adjustment. Added the replacement command that reloads Apache directly with the Pacemaker resource PID file.
- The firewall step opened both HTTP and HTTPS even though the post does not configure TLS. Removed the unconditional HTTPS firewall command and added a note to open HTTPS only when Apache TLS is configured.
- The post did not state that resource creation commands should be run from only one cluster node. Added that note before the `pcs resource` commands.
- The shared-storage example attempted to add `WebVIP` and `WebServer` to `WebGroup` again after they were already in the group. Changed the command to add only `WebFS` before `WebServer`, preserving the intended start order.

## Review Notes
The `server-status` configuration, `IPaddr2` resource, Apache resource, resource grouping behavior, positive resource stickiness, and standby/unstandby failover test commands are consistent with the consulted RHEL and Apache documentation. For production clusters, storage ordering may need extra resources such as LVM activation for shared block devices, as shown in the Red Hat reference procedure.
