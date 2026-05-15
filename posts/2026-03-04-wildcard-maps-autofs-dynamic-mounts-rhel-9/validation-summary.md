# Validation Summary: How to Use Wildcard Maps in autofs for Dynamic Mounts on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs / automount
- NFS
- Wildcard automount maps
- Multi-mount map entries
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Mounting file systems on demand": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-file-systems-on-demand_managing-file-systems
- Linux autofs(5) manual page: https://man7.org/linux/man-pages/man5/autofs.5.html
- Linux auto.master(5) manual page: https://man7.org/linux/man-pages/man5/auto.master.5%40%40autofs.html
- Linux kernel autofs documentation: https://docs.kernel.org/filesystems/autofs.html
- Linux kernel autofs mount control documentation, multi-mount offset example: https://www.kernel.org/doc/html/v5.9/filesystems/autofs-mount-control.html

## Issues Found
- The "Wildcard with Multiple Servers" example created `/etc/auto.servers` but did not show the corresponding master map entry. Added `/etc/auto.master.d/servers.autofs` with `/mnt /etc/auto.servers` so the later `/mnt/server1` example is complete and executable.
- The "Wildcard with Subdirectory Mounts" multi-mount example listed only subdirectory offsets. Updated it to include the root offset `/ nfsserver:/export/projects/&` before `/code`, `/docs`, and `/builds`, matching the documented multi-mount/offset-map structure.

## Review Notes
- The RHEL 9 documentation confirms the master map and map file formats, the default NFS behavior, `systemctl reload autofs`, and the wildcard home-directory pattern using `&`.
- `systemctl restart autofs` is valid, although Red Hat's procedure uses `systemctl reload autofs` after configuration changes.
- The use of `-rw,soft` is syntactically valid for NFS map entries, but production NFS clients often prefer `hard` mounts depending on workload and failure semantics.
