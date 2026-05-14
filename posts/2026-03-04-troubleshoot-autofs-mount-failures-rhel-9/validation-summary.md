# Validation Summary: How to Troubleshoot autofs Mount Failures on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs / automount
- NFS
- firewalld
- SELinux
- Linux systemd and journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems, autofs configuration files and mount points: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Configuring and using network file services, NFS server services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 Securing networks, NFS firewall requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/securing-network-services_securing-networks
- Linux automount(8) manual page: https://www.man7.org/linux/man-pages/man8/automount.8.html
- Linux autofs(5) manual page: https://www.man7.org/linux/man-pages/man5/autofs.5.html
- Linux ausearch(8) manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Red Hat SELinux User's and Administrator's Guide, NFS-related booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-nfs-booleans

## Issues Found
- The manual NFS mount test mounted to `/tmp/test-mount` without first creating that directory. Added `sudo mkdir -p /tmp/test-mount` so the example works on a fresh system.
- The firewall guidance said "NFS requires several ports" under the client section and implied the server should always include `nfs`, `mountd`, and `rpc-bind`. Updated the client note to apply to restricted outbound policies, and clarified that NFSv4 requires `nfs` while NFSv3 also needs `rpc-bind` and `mountd`, matching Red Hat's NFS firewall guidance.

## Review Notes
The autofs map syntax, `automount -m`, foreground debug invocation, `/etc/auto.master` and `/etc/auto.master.d/*.autofs` usage, SELinux `use_nfs_home_dirs` boolean, and common NFS diagnostic commands are consistent with the consulted documentation. The post uses the generic `nfsserver` hostname and placeholder mount paths, which is appropriate for a troubleshooting guide.
