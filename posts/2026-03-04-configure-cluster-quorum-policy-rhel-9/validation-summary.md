# Validation Summary: How to Configure a Cluster Quorum Policy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 High Availability Add-On
- Pacemaker
- Corosync votequorum
- pcs CLI
- corosync-quorumtool

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters, Chapter 27 "Configuring cluster quorum" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Pacemaker cluster properties - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_controlling-cluster-behavior-configuring-and-managing-high-availability-clusters
- Pacemaker Explained 3.0: Cluster-wide configuration and no-quorum-policy values - https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/cluster-options.html
- corosync-quorumtool(8) manual page - https://manpages.debian.org/testing/corosync/corosync-quorumtool.8.en.html

## Issues Found
- The `pcs quorum update` examples implied the command could be run against a running cluster. Red Hat documents that this command requires the cluster to be stopped, and shows that it errors while Corosync is running. Added `pcs cluster stop --all` and `pcs cluster start --all` around the quorum option update examples.
- The `last_man_standing` example omitted its `wait_for_all` requirement and quorum-device incompatibility. Updated the command to enable `wait_for_all` with `last_man_standing` and added the documented compatibility note.
- The `last_man_standing` explanation implied immediate recalculation. Updated it to state that expected votes can adjust after `last_man_standing_window`.
- The `auto_tie_breaker` explanation only mentioned the lowest node ID. Updated it to include `auto_tie_breaker_node` when configured, and added the documented quorum-device incompatibility note.
- The `suicide` policy description said it fences the remaining nodes. Updated this to the more precise RHEL/Pacemaker behavior: fencing all nodes in the inquorate partition.

## Review Notes
The post is technically relevant and the command names, property names, and expected-votes examples are consistent with the checked documentation after the edits. Upstream Pacemaker documentation has newer `no-quorum-policy` values such as `fence`, but the RHEL 9 documentation still lists `suicide`, so the post retains the RHEL 9 documented value.
