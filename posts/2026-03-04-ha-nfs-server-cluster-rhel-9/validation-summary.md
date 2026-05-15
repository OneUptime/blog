# Validation Summary: How to Configure a High Availability NFS Server Cluster on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFS
- Pacemaker / pcs
- OCF resource agents
- XFS
- iSCSI
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring an active/passive NFS server in a Red Hat High Availability cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-active-passive-nfs-server-in-a-cluster-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9: Resource monitoring operations and `pcs resource create` syntax: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_resource-monitoring-operations-configuring-and-managing-high-availability-clusters
- Linux `nfs(5)` manual page for NFS mount options: https://man7.org/linux/man-pages/man5/nfs.5.html
- OCF `exportfs` resource agent documentation: https://www.mankier.com/7/ocf_heartbeat_exportfs
- OCF `nfsserver` resource agent documentation: https://www.mankier.com/7/ocf_heartbeat_nfsserver

## Issues Found
- The original post configured the clustered export in `/etc/exports`. Changed this to let Pacemaker manage the export through the `exportfs` resource, matching the documented HA NFS pattern.
- The original storage layout mounted the shared filesystem directly at `/export/data`, which left no shared directory for NFS state and did not provide an NFSv4 pseudo-root. Changed the shared filesystem mount point to `/export`, with `/export/data` and `/export/.nfsinfo` created on the shared filesystem.
- The original post used `systemd:nfs-server` for the NFS server resource. Changed this to `ocf:heartbeat:nfsserver` with `nfs_shared_infodir` so NFS state follows the active node during failover.
- The original resource order started the VIP before the filesystem and NFS exports. Changed the resource group order to filesystem, NFS server, exports, VIP, and NFS notifications so clients only use the floating IP after the NFS service is ready.
- Added an NFSv4 pseudo-root `exportfs` resource with `fsid=0` and updated client mount examples to mount `192.168.1.100:/data` with NFSv4.
- Added an `nfsnotify` resource for NFSv3 reboot notifications, as documented by Red Hat for clustered NFS.
- The original client guidance recommended `soft` mounts for HA failover. Changed this to `hard` mounts because `soft` can return I/O errors to applications and can risk silent data corruption.

## Review Notes
- The iSCSI target name, shared device path, floating IP address, client specification, and node names remain examples and must be replaced for a real environment.
- The example still uses `no_root_squash` and `clientspec="*"`, which are valid but broad. A production deployment should usually restrict client access and avoid `no_root_squash` unless there is a specific operational requirement.
