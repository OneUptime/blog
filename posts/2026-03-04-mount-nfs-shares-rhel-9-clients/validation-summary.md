# Validation Summary: How to Mount NFS Shares on RHEL Clients

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network File System (NFS)
- nfs-utils
- Linux mount and umount commands
- NFS mount options

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Mounting NFS shares": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Services required on an NFS client": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Knowledgebase, "NFS mounts do not honor the 'intr' or 'nointr' mount options in RHEL 6 and later": https://access.redhat.com/solutions/157873
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux findmnt(8) manual page: https://man7.org/linux/man-pages/man8/findmnt.8.html

## Issues Found
- The NFSv4 browse example mounted `/mnt/nfs-browse` without first creating the mount point. Added `sudo mkdir -p /mnt/nfs-browse` before the mount command so the example works on a clean client.
- The mount-options example used `intr`, and the table described it as allowing interruption of hung NFS operations. On RHEL 9, `intr`/`nointr` are provided only for backward compatibility and are ignored. Removed `intr` from the example command and corrected the option description.

## Review Notes
The remaining commands and explanations are consistent with RHEL 9 NFS client documentation. Future improvements could mention that NFSv3 may require additional RPC-related firewall handling, while NFSv4 normally uses TCP port 2049.
