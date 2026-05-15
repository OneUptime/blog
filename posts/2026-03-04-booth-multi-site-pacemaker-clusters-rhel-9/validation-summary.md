# Validation Summary: How to Configure Booth for Multi-Site Pacemaker Clusters on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- Booth cluster ticket manager
- pcs CLI
- firewalld
- Linux systemd and journald

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Multi-site Pacemaker clusters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-multisite-cluster-configuring-and-managing-high-availability-clusters
- pcs(8) manual page, Booth command syntax: https://manpages.debian.org/bookworm/pcs/pcs.8.en.html
- boothd(8) manual page, Booth configuration and ticket behavior: https://www.mankier.com/8/boothd
- SUSE Linux Enterprise High Availability Geo Clustering Guide, before-acquire-handler and service-runnable behavior: https://documentation.suse.com/sle-ha/12-SP5/html/SLE-HA-all/cha-ha-geo-booth.html

## Issues Found
- The post installed `booth-site` on the arbitrator. Red Hat documents `booth-site` for cluster nodes and `pcs booth-core booth-arbitrator` for the arbitrator, so the install commands were corrected.
- The post manually wrote `/etc/booth/booth.conf`. On RHEL 9, Red Hat documents creating and distributing Booth configuration with `pcs booth setup`, `pcs booth ticket add`, `pcs booth sync`, and `pcs booth pull`, so the configuration step was updated.
- The post used direct firewall port commands. Red Hat documents enabling the `high-availability` firewalld service on cluster nodes and the arbitrator, so the firewall commands were updated.
- The post manually created `booth-ip` and `ocf:pacemaker:booth-site` resources. Red Hat documents `pcs booth create ip <address>` for creating the Booth cluster resource group, so the startup commands were corrected.
- The post used raw `booth client grant`, `booth client revoke`, and `booth client list` examples. RHEL's documented administrative workflow uses `pcs booth ticket grant`, `pcs booth ticket revoke`, and `pcs booth status`, so those commands were updated.
- The `before-acquire-handler` example used `/usr/share/booth/service-runnable.sh` without a protected resource argument. The documented helper is `/usr/share/booth/service-runnable`, typically followed by the protected resource name, so the handler example now references `WebGroup`.

## Review Notes
The post is now aligned with the RHEL 9 `pcs booth` workflow. In a production runbook, users should replace placeholder node names such as `cluster1-node1` and validate that `WebGroup` is the actual protected Pacemaker resource or group name in both independent clusters.
