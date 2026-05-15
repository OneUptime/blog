# Validation Summary: How to Configure Quorum and Voting in Multi-Node RHEL Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- Corosync votequorum
- pcs CLI
- Corosync qdevice/qnetd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9, "Configuring and managing high availability clusters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9, "Configuring cluster quorum": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-cluster-quorum-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9, "Configuring quorum devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-quorum-devices-configuring-and-managing-high-availability-clusters
- corosync-quorumtool(8) manual page: https://manpages.debian.org/testing/corosync/corosync-quorumtool.8.en.html
- corosync-cmapctl(8) manual page: https://manpages.debian.org/unstable/corosync/corosync-cmapctl.8.en.html
- votequorum(5) manual page: https://manpages.debian.org/unstable/corosync/votequorum.5.en.html

## Issues Found
- The node vote example used `corosync-cmapctl` and an invalid `pcs quorum update node1 votes=2` command. Replaced it with `corosync-quorumtool -v 2 -n <nodeid>`, which is the documented command for changing a node's votes in the running cluster.
- The qdevice server installation omitted the `pcs` package even though the next commands use `pcsd` and `pcs qdevice`. Added `pcs` to the install command.
- The qdevice cluster-side setup omitted the `corosync-qdevice` client package on cluster nodes. Added the install command and clarified it should be installed on each cluster node.
- The LMS algorithm description implied any single remaining node can continue. Clarified that the remaining node must still be able to see the qnetd server.
- The quorum option commands did not mention that `pcs quorum update` requires Corosync to be stopped for these options on RHEL 9. Added stop and restart commands around the quorum option examples.
- The `last_man_standing` and `auto_tie_breaker` sections omitted compatibility constraints. Added that `last_man_standing` requires `wait_for_all` and is incompatible with quorum devices, and that `auto_tie_breaker` is incompatible with quorum devices.

## Review Notes
The corrected post is technically valid for RHEL 9. In production, changing vote weights and expected votes should be treated as an advanced operation because incorrect voting layouts can weaken split-brain protection.
