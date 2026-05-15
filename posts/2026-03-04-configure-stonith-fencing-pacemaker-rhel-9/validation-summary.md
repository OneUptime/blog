# Validation Summary: How to Configure STONITH Fencing in a Pacemaker Cluster on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs
- STONITH / fencing
- fence agents
- IPMI / iLO / DRAC fencing
- KVM/libvirt fencing
- VMware fencing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring fencing in a Red Hat High Availability cluster - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Displaying available fence agents and their options - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Testing a fence device - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Configuring fencing levels - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Manually fencing a cluster node - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-fencing-configuring-and-managing-high-availability-clusters
- fence_ipmilan(8) man page - https://www.mankier.com/8/fence_ipmilan
- Pacemaker Explained: Fencing - https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/fencing.html

## Issues Found
- The testing section described `pcs stonith fence node2 --off` as a way to test without actually fencing. Red Hat documents `pcs stonith fence node [--off]` as a manual fencing command, where `--off` turns the node off instead of rebooting it. I changed the non-disruptive test to a manual `fence_ipmilan -P -o status` check, then kept a separate `pcs stonith fence node2` command for testing the configured cluster fencing path.

## Review Notes
- The `pcs stonith list`, `pcs stonith describe`, `pcs stonith create`, `pcs constraint location ... avoids`, `pcs property set stonith-enabled=true`, `pcs stonith level add`, `pcs stonith status`, and `pcs stonith config` commands are consistent with current RHEL 9 / pcs documentation.
- The examples use placeholder credentials and node names. Real deployments should quote shell-sensitive passwords and confirm the exact required parameters with `pcs stonith describe <agent>` or the fence agent man page for the hardware or hypervisor in use.
