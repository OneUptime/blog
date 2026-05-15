# Validation Summary: How to Set Up a High-Availability NFS Cluster on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat High Availability Add-On
- Pacemaker and Corosync
- pcs CLI
- NFS server and NFS clients
- LVM on shared storage
- XFS
- firewalld
- Fencing / STONITH

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing high availability clusters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/
- Red Hat Enterprise Linux 9 documentation, "Configuring an active/passive NFS server in a Red Hat High Availability cluster": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index#assembly_configuring-active-passive-nfs-server-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation, "Configuring and using network file services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/
- Red Hat Enterprise Linux 9 documentation, "Securing networks" NFS firewall guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/
- Red Hat Customer Portal solution, "NFS mounts do not honor the 'intr' or 'nointr' mount options in RHEL 6 and later": https://access.redhat.com/solutions/157873
- Linux nfs(5) manual page: https://www.man7.org/linux/man-pages/man5/nfs.5.html
- ClusterLabs resource-agents exportfs manual page: https://manpages.debian.org/testing/resource-agents/ocf_heartbeat_exportfs.7.en.html

## Issues Found
- The shared LVM setup was shown as `pvcreate`, `vgcreate`, and `lvcreate` on both nodes. Red Hat documents creating the volume group and logical volume on one node only, with LVM system IDs configured and VG autoactivation disabled for Pacemaker-managed active/passive storage. I updated the commands to set `system_id_source`, create the VG on one node with `--setautoactivation n`, and mention adding the shared device to the LVM devices file on the other node when that feature is enabled.
- The cluster resource group mounted the XFS filesystem directly without an `LVM-activate` resource. Red Hat's HA LVM pattern requires Pacemaker to activate the volume group before mounting it. I added an `ocf:heartbeat:LVM-activate` resource before the filesystem resource.
- The NFS server state directory was outside the Pacemaker-managed filesystem. Red Hat recommends `nfs_shared_infodir` live under shared storage so stateful NFS information follows the resource group during failover. I moved it to `/srv/nfs/shared/nfsinfo`.
- The resource order placed the virtual IP before the NFS server and exports, and omitted `nfsnotify`. Red Hat's active/passive NFS example starts LVM, filesystem, nfsserver, exportfs resources, then the floating IP and `nfsnotify`. I adjusted the order and added an `ocf:heartbeat:nfsnotify` resource.
- The client `/etc/fstab` example used the `intr` NFS mount option. Red Hat documents that `intr` and `nointr` are ignored on RHEL 6 and later. I removed `intr`.
- The failover recovery note gave a broad 30-90 second estimate. Red Hat documents that NFSv4 clients may take up to 90 seconds due to the server grace period, while NFSv3 often recovers faster. I updated the wording to avoid implying a guaranteed lower bound.

## Review Notes
The example still uses `no_root_squash`, which is valid but risky for production environments unless explicitly required and tightly restricted by client network and host controls. The fencing example uses placeholder IPMI credentials; real deployments should use environment-appropriate fencing agents and protected credentials.
