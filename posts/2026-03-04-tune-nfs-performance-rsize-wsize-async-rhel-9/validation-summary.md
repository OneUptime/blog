# Validation Summary: How to Tune NFS Performance with rsize, wsize, and async Options on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux NFS client and server
- nfs-utils configuration
- /etc/fstab and /etc/exports
- nfsstat, mount, dd, fio, nmcli, sysctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Mounting NFS shares: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Customer Portal: How to increase the number of threads created by the NFS daemon in RHEL: https://access.redhat.com/solutions/2216
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux exports(5) manual page: https://www.man7.org/linux/man-pages/man5/exports.5.html
- Linux nfs.conf(5) manual page: https://man7.org/linux/man-pages/man5/nfs.conf.5.html
- GNU Coreutils dd manual: https://www.gnu.org/software/coreutils/manual/html_node/dd-invocation.html
- NetworkManager nmcli documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- fio documentation: https://fio.readthedocs.io/

## Issues Found
- The post recommended `noatime` and `nodiratime` as NFS client performance tuning options. The Linux NFS client documentation states that atime-related mount options, including `noatime` and `nodiratime`, have no effect on NFS mounts. I removed them from the mount examples, removed `noatime` from the tuning matrix, removed the option table rows, and added a note explaining that these options have no effect on Linux NFS mounts.
- The post said the client-side `sync` mount option forces all writes to be synchronous regardless of the server setting. That was too broad because the Linux NFS client `sync` option flushes writes to the server before the write system call returns, but a server-side `async` export can still acknowledge before changes reach stable storage. I updated the explanation to make that distinction.
- The `nocto` table entry was phrased as a generic read-heavy optimization. I changed it to describe the non-standard close-to-open cache consistency heuristic and clarified that it is best for read-only or rarely changed data.
- The wrap-up recommended adding `noatime` for read-heavy workloads. I replaced that with guidance to tune cache consistency options only for workloads that can tolerate weaker freshness guarantees.

## Review Notes
The rsize/wsize maximum and negotiation behavior are accurate for RHEL 9. The nfsd thread configuration in `/etc/nfs.conf` is accurate for RHEL 8 and RHEL 9. The `/etc/exports` `sync` and `async` descriptions are accurate, with `sync` being the default in current nfs-utils. The benchmarking commands are syntactically valid, but real benchmark results can vary heavily with NFS version, server storage, network path, direct I/O support, and cache behavior.
