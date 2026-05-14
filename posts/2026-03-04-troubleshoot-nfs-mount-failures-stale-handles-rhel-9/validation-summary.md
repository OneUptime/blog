# Validation Summary: How to Troubleshoot NFS Mount Failures and Stale Handles on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network File System (NFS)
- nfs-utils commands: mount, umount, exportfs, showmount, nfsstat, rpcdebug, nfsidmap
- firewalld
- SELinux
- systemd services for NFS and RPC

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying an NFS server - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation: Mounting NFS shares - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Configuring and using network file services - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/index
- Red Hat Enterprise Linux 9 documentation: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- nfs(5), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man5/nfs.5.html
- umount(8), Linux util-linux manual page - https://man7.org/linux/man-pages/man8/umount.8.html
- exportfs(8), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man8/exportfs.8.html
- exports(5), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man5/exports.5.html
- nfsstat(8), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man8/nfsstat.8.html
- rpcdebug(8), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man8/rpcdebug.8.html
- nfsidmap(8), Linux nfs-utils manual page - https://man7.org/linux/man-pages/man8/nfsidmap.8.html

## Issues Found
- The `showmount -e` diagnostic was presented as generally applicable. On RHEL 9, NFSv4-only deployments can operate without the NFSv3 mount protocol path that `showmount` relies on, so the command was clarified as applying to NFSv3 or mixed-version servers.
- The hung-mount prevention example recommended `hard,intr` and said `intr` allows interruption with Ctrl+C. The Linux NFS client ignores `intr` after kernel 2.6.25, so the example was changed to use `hard,timeo=600,retrans=2` and the explanation now reflects hard-mount retry behavior.
- The `soft` mount recommendation did not mention the data-integrity risk documented by nfs(5). The wording now says to use `soft` only when the application can safely handle I/O errors.
- The UID/GID mismatch section said `nfs-idmapd` is required on the client. RHEL 9 clients use the on-demand `nfsidmap` helper for NFSv4 ID mapping, while `rpc.idmapd` is the server-side daemon. The commands were changed to inspect the request-key helper configuration and clear cached mappings with `nfsidmap -c`.
- The Domain statement was too absolute. It was changed to clarify that explicitly configured `Domain` values must match across the server and clients; otherwise the system can derive the NFSv4 domain from DNS-related defaults.

## Review Notes
The remaining commands and explanations are technically valid for common RHEL 9 NFS troubleshooting. Future improvements could add separate NFSv3 and NFSv4 diagnostic paths, because firewall ports, RPC services, and export discovery differ between those modes.
