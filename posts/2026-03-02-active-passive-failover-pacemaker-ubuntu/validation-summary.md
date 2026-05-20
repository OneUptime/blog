# Validation Summary: How to Set Up Active-Passive Failover with Pacemaker on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04
- Pacemaker
- Corosync
- pcs
- OCF resource agents
- Apache HTTP Server
- STONITH/fencing
- Linux networking with a floating virtual IP

## Sources Consulted
- Ubuntu Server documentation: Pacemaker resource agents, https://documentation.ubuntu.com/server/explanation/high-availability/pacemaker-resource-agents/
- Ubuntu 22.04 pcs man page, https://manpages.ubuntu.com/manpages/jammy/man8/pcs.8.html
- Ubuntu ocf_heartbeat_IPaddr2 man page, https://manpages.ubuntu.com/manpages/noble/man7/ocf_heartbeat_IPaddr2.7.html
- Ubuntu ocf_heartbeat_apache man page, https://manpages.ubuntu.com/manpages/stonking/man7/ocf_heartbeat_apache.7.html
- ClusterLabs Pacemaker "Clusters from Scratch" Apache resource guide, https://clusterlabs.org/projects/pacemaker/doc/3.0/Clusters_from_Scratch/html/apache.html
- ClusterLabs Pacemaker Explained, https://clusterlabs.org/pacemaker/doc/2.1/Pacemaker_Explained/singlehtml/
- Red Hat High Availability pcs resource documentation, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_configuring-cluster-resources-configuring-and-managing-high-availability-clusters

## Issues Found
- The install command omitted Ubuntu's resource-agent packages. Added `resource-agents-base` and `resource-agents-extra` because `IPaddr2` is provided by the base package and the Apache OCF agent is provided by the extra package.
- The Apache setup did not explicitly enable the status module used by the Apache OCF resource agent. Added `sudo a2enmod status` before Pacemaker creates the Apache resource.
- `pcs resource show webservice` uses a command form that the Ubuntu 22.04 pcs man page says was replaced. Changed it to `pcs resource config webservice`.
- `pcs constraint location show` is deprecated in pcs 0.10. Changed it to `pcs constraint location config`.
- The per-group stickiness example used `pcs resource update`, which changes resource instance options. Changed it to `pcs resource meta webservice resource-stickiness=100`, which is the documented way to set a resource or group meta option.
- The STONITH section said "KVM/cloud environment" and "SBD" but showed `fence_ipmilan`, which is an IPMI fence agent example. Updated the wording to describe a bare-metal IPMI environment.

## Review Notes
- The guide uses `pcs` on Ubuntu 22.04. The package is available in Ubuntu 22.04, but Ubuntu documentation notes that `pcs` became the recommended Ubuntu cluster management tool starting with Ubuntu 23.04; this is a version-specific support caveat rather than a command error.
- The sample interface name `eth0` may need to be changed on systems using predictable network interface names such as `ens160` or `enp0s3`.
