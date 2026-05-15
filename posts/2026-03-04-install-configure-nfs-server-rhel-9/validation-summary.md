# Validation Summary: How to Install and Configure an NFS Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network File System (NFS)
- nfs-utils
- systemd
- firewalld
- SELinux
- /etc/exports
- /etc/nfs.conf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using network file services, Chapter 2, "Deploying an NFS server" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- nfs-utils exports(5) manual page - https://www.mankier.com/5/exports
- nfs-utils exportfs(8) manual page - https://www.mankier.com/8/exportfs

## Issues Found
- The export directory was owned by `nobody:nobody` with mode `755`, but the client test used `touch` as a regular user. That write test would usually fail unless the client user happened to have matching write permissions. Changed the example to use a writable group (`users`) with mode `2770`, matching Red Hat's documented pattern for group-writable NFS exports.
- The initial export example used `no_root_squash`, which is not needed for the documented write test and weakens the default root mapping behavior. Removed it from the basic export example so the share uses the default `root_squash` behavior.
- The post said "RHEL uses NFSv4 by default" and suggested disabling both v3 and v2. Red Hat documents that RHEL clients use the latest NFS version the server provides, and its RHEL 9 NFS server guidance documents `vers3=n` for disabling NFSv3. Updated the wording and removed the unsupported `vers2=n` instruction.

## Review Notes
- The firewall commands are valid for an NFSv3-capable setup. For a strictly NFSv4-only server, Red Hat's RHEL 9 documentation only requires the `nfs` firewalld service after disabling NFSv3-related services.
- `no_subtree_check` is valid, though modern nfs-utils defaults to `no_subtree_check`; keeping it explicit is acceptable.
- `showmount -e` depends on the mount daemon and is mainly useful when NFSv3 compatibility is available. For NFSv4-only environments, mounting the export directly is a better verification step.
