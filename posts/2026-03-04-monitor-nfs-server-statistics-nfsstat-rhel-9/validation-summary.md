# Validation Summary: How to Monitor NFS Server Statistics with nfsstat on RHEL

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux NFS server and client statistics
- nfs-utils: `nfsstat` and `mountstats`
- `/proc/self/mountstats`
- `/proc/fs/nfsd` server control and statistics files
- `ss`, `awk`, `sed`, `cron`, and shell scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Mounting NFS shares": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Linux `nfsstat(8)` man page from nfs-utils: https://man7.org/linux/man-pages/man8/nfsstat.8.html
- Linux `mountstats(8)` man page from nfs-utils: https://man7.org/linux/man-pages/man8/mountstats.8.html
- Linux `nfsd(7)` man page: https://www.man7.org/linux/man-pages/man7/nfsd.7.html
- Linux kernel documentation, "Kernel NFS Server Statistics": https://docs.kernel.org/filesystems/nfs/knfsd-stats.html
- Linux `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- `nfsstat -a` was described as a full dump of all NFS stats. Current Linux `nfsstat(8)` documents `-a` as reserved for future use and `-v` as the verbose/all-facilities option. Changed the example to `nfsstat -v`.
- The post described `compound` as total NFSv4 operations. In NFSv4 output this is the COMPOUND RPC procedure count, not a direct count of every contained NFSv4 operation. Changed the description to "NFSv4 COMPOUND RPC calls."
- The `access` metric note implied high counts may indicate permission issues. High ACCESS counts more generally indicate permission-check-heavy workloads. Adjusted the wording to avoid overdiagnosis.
- `mountstats --iostat` is not valid for the documented Linux `mountstats(8)` interface. Changed it to the `mountstats iostat` subcommand.
- `mountstats --nfs` was labeled as NFS operation statistics. The documented command for nfsstat-like per-mount operation output is `mountstats nfsstat`; changed the example accordingly.
- `nfsstat -s -l 5` incorrectly used `-l` as an interval option. Current `nfsstat(8)` uses `-l` for list form and `-Z`/`--sleep` for repeated delta reporting. Changed the example to `nfsstat -s --sleep=5`.
- The retransmission guidance treated any nonzero cumulative retransmission counter as an immediate problem. Because counters are cumulative, changed the guidance to watch for sustained increases.
- The `ss | grep 2049` examples could match the wrong field and included headers. Replaced them with `ss -Htn[p] sport = :2049` filters and adjusted the client extraction commands.
- The monitoring examples called cumulative read/write counters "operations per second" and parsed the likely wrong field. Changed the labels to operation counts and used `nfsstat -s -l` with field-based `awk` examples.

## Review Notes
The post is now technically accurate for current Linux nfs-utils behavior and RHEL 9 NFS concepts. The local container did not have `nfsstat` or `mountstats` installed, so command validation was performed against upstream nfs-utils man pages, Red Hat documentation, and Linux kernel documentation rather than by executing the utilities locally.
