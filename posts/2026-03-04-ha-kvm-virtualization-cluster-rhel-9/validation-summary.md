# Validation Summary: How to Set Up a High-Availability KVM Virtualization Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt and virsh
- virt-install
- Pacemaker and pcs
- OCF VirtualDomain resource agent
- NFS/shared storage
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters, "Configuring a virtual domain as a resource": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Configuring and managing virtualization, "Enabling virtualization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9: Monitoring and managing system status and performance, "Optimizing libvirt daemons": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- libvirt documentation, "Connection URIs": https://libvirt.org/uri.html
- libvirt documentation, "Guest migration": https://libvirt.org/migration.html
- ClusterLabs Pacemaker Explained, "Resource Operations": https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Explained/html/operations.html
- OCF heartbeat VirtualDomain resource agent manual: https://www.mankier.com/7/ocf_heartbeat_VirtualDomain

## Issues Found
- The post started the legacy monolithic `libvirtd` service. On fresh RHEL 9 installs, modular libvirt daemons are the documented default, and Red Hat recommends modular daemons because `libvirtd` will become unsupported in a future major RHEL release. I changed the startup command to enable and start the documented modular libvirt sockets.
- The migration section configured unauthenticated libvirt TCP access with `listen_tcp = 1` and `auth_tcp = "none"` in `/etc/libvirt/libvirtd.conf`. This was unnecessary for `migration_transport="ssh"`, did not match RHEL 9 modular libvirt guidance, and exposed a read-write libvirt API without authentication. I replaced it with a `virsh -c qemu+ssh://root@node2/system uri` verification command.
- The firewall commands opened TCP port 16509 for unauthenticated libvirt TCP. Because the corrected procedure uses SSH for the remote libvirt connection, I changed this to allow the SSH service and kept the QEMU migration port range `49152-49215/tcp`, which libvirt documents as the default range used for migration data.

## Review Notes
- The remaining Pacemaker `VirtualDomain` resource command, `config` and `migration_transport` parameters, and `meta allow-migrate=true` usage match Red Hat and resource-agent documentation.
- The post assumes the VM XML and disks are accessible at the same path on every node, which is required for this resource type. In a production cluster, storage permissions, SELinux labels, CPU compatibility, and fencing configuration should be validated separately before relying on live migration or failover.
