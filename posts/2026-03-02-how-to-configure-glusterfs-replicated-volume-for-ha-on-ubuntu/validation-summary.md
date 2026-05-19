# Validation Summary: How to Configure GlusterFS Replicated Volume for HA on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- GlusterFS 10
- GlusterFS replicated volumes
- GlusterFS FUSE client mounting
- UFW firewall rules
- XFS brick storage

## Sources Consulted
- GlusterFS Install Guide: https://docs.gluster.org/en/main/Install-Guide/Install/
- GlusterFS Setting Up Volumes: https://docs.gluster.org/en/latest/Administrator-Guide/Setting-Up-Volumes/
- GlusterFS Setting Up Clients: https://docs.gluster.org/en/main/Administrator-Guide/Setting-Up-Clients/
- GlusterFS Automatic File Replication: https://docs.gluster.org/en/main/Administrator-Guide/Automatic-File-Replication/
- GlusterFS Arbiter Volumes and Quorum Options: https://docs.gluster.org/en/main/Administrator-Guide/arbiter-volumes-and-quorum/
- GlusterFS Troubleshooting Split-Brains: https://docs.gluster.org/en/main/Troubleshooting/resolving-splitbrain/
- GlusterFS Managing Volumes: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- GlusterFS Tuning Volume Options: https://docs.gluster.org/en/latest/Administrator-Guide/Tuning-Volume-Options/
- Launchpad GlusterFS 10 PPA: https://launchpad.net/~gluster/+archive/ubuntu/glusterfs-10
- Red Hat Gluster Storage client mount option reference: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.4/html/administration_guide/chap-accessing_data_-_setting_up_clients

## Issues Found
- The planning section incorrectly said replicated volumes require an even number of nodes. Updated it to say the brick count must match the replica count, or be a multiple of it for distributed-replicated volumes.
- The brick preparation commands ran `mount -a` before creating `/data/gluster`. Added `sudo mkdir -p /data/gluster` before the mount.
- The firewall rules omitted Gluster management port 24008 and used a brick port range that is too narrow for Gluster 10's randomized brick ports. Updated the rules to allow 24007:24008/tcp and 49152:60999/tcp.
- The client mount example repeated `backupvolfile-server` for multiple fallback servers. Updated it to the documented multi-server `backup-volfile-servers=gluster2:gluster3` form in both the manual mount and `/etc/fstab` examples.
- The HA test used `systemctl stop glusterd` to simulate a node failure. Stopping the management daemon alone does not reliably stop active brick service. Updated the example to describe powering off or disconnecting the node, or stopping the brick process for a lab failure test.
- The self-heal tuning section described `client.event-threads` as parallel heal threads. Replaced it with `cluster.background-self-heal-count`, which is the documented option for parallel background self-heal jobs.
- The performance tuning section enabled `performance.readdir-ahead` while describing sequential read-ahead. Replaced it with `performance.read-ahead`.

## Review Notes
GlusterFS 10 packages are available from the Gluster Launchpad PPA for several Ubuntu releases, including newer LTS releases, but upstream install documentation still shows older example PPA names in places. GlusterFS is also sensitive to workload type; database and VM image workloads need additional validation beyond the general replicated-volume setup shown here.
