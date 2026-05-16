# Validation Summary: How to Create a Two-Node High Availability Cluster with Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat High Availability Add-On
- Pacemaker
- Corosync votequorum
- pcs CLI
- STONITH fencing with fence_ipmilan
- firewalld
- Apache HTTP Server resource agent
- OCF resource agents IPaddr2 and apache

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters - creating a two-node Pacemaker cluster, installing HA packages, enabling firewalld services, cluster setup, and fencing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Configuring cluster quorum, including automatic wait_for_all behavior and pcs quorum commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#configuring-cluster-quorum
- Red Hat Enterprise Linux 9: Active/passive Apache HTTP server cluster resource examples using IPaddr2 and apache resource agents: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#configuring-an-active-passive-apache-http-server-in-a-red-hat-high-availability-cluster
- Red Hat Enterprise Linux 9: Location constraints and preventing a node from using a fencing device: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#preventing-a-node-from-using-a-fencing-device
- ClusterLabs Pacemaker Explained: fencing resource attributes, fence_ipmilan usage, pcmk_host_list, and stonith-enabled behavior: https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/fencing.html
- Corosync votequorum man page: two_node quorum behavior and wait_for_all relationship: https://manpages.debian.org/testing/corosync/votequorum.5.en.html

## Issues Found
- The post said to verify two-node quorum with `pcs quorum config` and expected a `two_node: 1` option there. RHEL documentation shows the relevant runtime verification is `pcs quorum status`, where the two-node behavior appears as quorum status such as `Quorum: 1` and the `2Node` flag. I changed the command to `sudo pcs quorum status` and updated the explanation to match RHEL's documented behavior.
- The original explanation said `two_node: 1` enables `wait_for_all` to prevent split-brain on simultaneous startup. Red Hat documents that `wait_for_all` is automatically enabled for a two-node cluster without a quorum device when `auto_tie_breaker` is disabled, and that it prevents startup quorum races. I updated the wording to avoid overstating `wait_for_all` as a complete split-brain prevention mechanism.

## Review Notes
The remaining commands and snippets are consistent with the RHEL 9 HA documentation and upstream Pacemaker behavior. In production, the example IP addresses and IPMI credentials must be replaced with environment-specific values, fencing should be tested before relying on the cluster, and a quorum device is worth considering for two-node clusters where deterministic split handling is required.
