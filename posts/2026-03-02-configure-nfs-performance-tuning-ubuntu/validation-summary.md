# Validation Summary: How to Configure NFS Performance Tuning on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux NFS client and kernel server
- nfs-utils / nfs-common
- `/etc/exports`
- `/etc/nfs.conf`
- NFS mount options and `/etc/fstab`
- Linux sysctl network tuning
- Linux block I/O scheduler tuning
- fio, nfsstat, nfsiostat, iostat

## Sources Consulted
- Ubuntu Server documentation: Network File System (NFS): https://ubuntu.com/server/docs/how-to/networking/install-nfs/
- Ubuntu package page for `nfs-common` on Noble: https://packages.ubuntu.com/noble/net/nfs-common
- Ubuntu `nfs-common` file list showing `nfsstat` and `nfsiostat`: https://packages.ubuntu.com/noble/amd64/nfs-common/filelist
- Linux `nfs(5)` manual from nfs-utils: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `exports(5)` manual from nfs-utils: https://man7.org/linux/man-pages/man5/exports.5.html
- Linux `nfs.conf(5)` manual from nfs-utils: https://man7.org/linux/man-pages/man5/nfs.conf.5.html
- Linux `rpc.nfsd(8)` manual from nfs-utils: https://man7.org/linux/man-pages/man8/nfsd.8.html
- Linux kernel nfsd administrative interfaces: https://www.kernel.org/doc/html/v6.13/admin-guide/nfs/nfsd-admin-interfaces.html
- Ubuntu `nfsstat(8)` man page: https://manpages.ubuntu.com/manpages/xenial/man8/nfsstat.8.html
- Ubuntu `iostat(1)` man page: https://manpages.ubuntu.com/manpages/jammy/man1/iostat.1.html

## Issues Found
- The post referred to installing `nfs-utils` as a binary package on Ubuntu. Ubuntu uses `nfs-utils` as the source package, while the relevant user-facing binary package is `nfs-common`; updated the benchmark and monitoring install commands accordingly.
- The `[nfsd]` configuration snippet included `vers2=no`, but current `nfs.conf(5)` documents `vers3`, `vers4`, `vers4.0`, `vers4.1`, and `vers4.2` as recognized NFS server version keys. Removed the unsupported key.
- The client mount examples used `intr`, but Linux `nfs(5)` documents `intr`/`nointr` as backward-compatibility options ignored after kernel 2.6.25. Removed `intr` from mount and fstab examples.
- The performance-oriented mount example used `sync`, which forces NFS client writes to be flushed to the server before returning and carries a significant performance cost. Removed it from the performance mount example and clarified its tradeoff in the write-heavy notes.
- The `rsize`/`wsize` explanations and summary table described `131072` and NFS `4.0` as fixed defaults. Current Linux clients negotiate NFS version and transfer sizes by default, and `1048576` is the maximum Linux NFS client payload size. Updated the wording and table.
- The `retrans` explanation said the client gives up after the configured count. For hard mounts, the client logs a timeout and starts recovery rather than simply giving up. Updated the explanation.
- The `nordirplus` explanation was overly specific to NFSv4 directory-plus calls. Updated it to describe READDIRPLUS behavior for NFS v3/v4.
- The I/O scheduler example said it applied to SSDs and NVMe while showing `/sys/block/sda` and `sd[a-z]` udev rules. Narrowed the wording to SATA/SCSI SSDs.
- The monitoring section said `iostat` sees NFS as a block device, which is not accurate. Updated it to recommend using `iostat` on the server to observe backing disk activity.
- The post referenced `watchnfsd`, which is not present in Ubuntu's `nfs-common` file list and was not found as a standard Ubuntu NFS utility. Replaced it with the existing `/proc/net/rpc/nfsd` monitoring loop.

## Review Notes
The remaining tuning values are workload- and environment-dependent. The post correctly frames tuning as iterative, but future revisions could mention `nconnect` for modern multi-connection client workloads and could add stronger cautions around `no_root_squash`.
