# Validation Summary: How to Resolve 'NFS Stale File Handle' Errors on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- NFS/NFSv4
- Linux mount and umount commands
- exportfs
- /etc/fstab
- Linux kernel cache controls

## Sources Consulted
- Red Hat Enterprise Linux 7 Storage Administration Guide, "The exportfs Command": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/nfs-serverconfig
- Red Hat Enterprise Linux 8 Managing file systems, "Mounting NFS shares": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Linux man-pages, nfs(5): https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux man-pages, mount.nfs(8): https://www.man7.org/linux/man-pages/man8/mount.nfs.8.html
- Linux man-pages, exportfs(8): https://www.man7.org/linux/man-pages/man8/exportfs.8.html
- Linux man-pages, exports(5): https://man7.org/linux/man-pages/man5/exports.5.html
- Linux kernel documentation, /proc/sys/vm/drop_caches: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Red Hat Customer Portal, "What causes stale NFS file handles?": https://access.redhat.com/solutions/2674

## Issues Found
- The post used `sudo exportfs -u nfs-server:/export/share`, but `exportfs` expects a client or client specification on the left side of `client:/path`, not the NFS server name. Changed it to `192.168.1.0/24:/export/share` to match the re-export example.
- The post recommended `soft,timeo=50,retrans=3` as a general resilient `/etc/fstab` configuration. This is risky for data workloads because soft mounts can return I/O errors to applications. Changed the example to keep the default hard mount behavior and `_netdev`.
- The post stated that `drop_caches` clears the NFS attribute cache. Kernel documentation describes dropping clean page cache, dentries, and inodes, not a reliable stale NFS handle repair. Reworded the section and kept remounting as the reliable handle replacement step.
- The post suggested `mount -o remount,noac` as the alternative noac workflow. NFS client documentation notes that NFS-specific options are not reliably changed during remount. Changed the example to unmount and mount with `noac`.
- The introduction described server restarts as a common cause of stale file handles. Reworded this to server failovers and underlying filesystem/export changes, which better matches documented stale handle causes.

## Review Notes
- The corrected commands are valid examples, but administrators should adapt client specifications, export paths, and mount options to their environment.
- `actimeo=0`, shorter attribute cache timers, and `noac` can reduce metadata caching but may increase server load and do not fix every stale handle scenario.
