# Validation Summary: Find EFS Clients Before Deleting a Mount Target to Avoid Hung df Processes

## Status

validated

## Post Type

Technical operational guide with AWS CLI and Linux shell commands.

## Technologies Covered

- Amazon EFS mount targets, access points, and TLS mount helpers
- AWS CLI and JMESPath queries
- Amazon CloudWatch and VPC Flow Logs
- Linux NFS mounts, mount namespaces, `/proc`, ripgrep, `ss`, `umount`, and `df`
- EC2, ECS, Lambda, and EKS consumers

## Sources Consulted

- [AWS: Deleting mount targets](https://docs.aws.amazon.com/efs/latest/ug/mount-target-delete.html) — application disruption and unmount-before-deletion procedure.
- [AWS CLI: describe-mount-targets](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-mount-targets.html) — command arguments, query support, response fields, IPv4 and IPv6 addresses.
- [AWS CLI: delete-mount-target](https://docs.aws.amazon.com/cli/latest/reference/efs/delete-mount-target.html) — deletion command and target identifier.
- [AWS: CloudWatch metrics for EFS](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html) — `ClientConnections` and the `FileSystemId` dimension.
- [AWS: VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) and [flow log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html) — ENI traffic records, address and port fields, acceptance status, aggregation, and delivery delay.
- [AWS: Unmounting file systems](https://docs.aws.amazon.com/efs/latest/ug/unmounting-fs.html) — default `umount` behavior.
- [AWS: Troubleshooting mount issues](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html) — busy mounts, unresponsive operations, forced-unmount consequences, and reused-address file-handle errors.
- [AWS: Mounting EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs.html) and [VPC security groups](https://docs.aws.amazon.com/efs/latest/ug/network-access.html) — supported clients, network access, and NFS port 2049.
- [AWS efs-utils repository](https://github.com/aws/efs-utils) — local proxy behavior, mount options, configuration, and log locations.
- [AWS: EFS volumes with ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html), [Lambda file-system configuration](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem.html), and [EFS storage with EKS](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html) — workload integration and dependency inventory.
- [Linux kernel: /proc filesystem](https://docs.kernel.org/filesystems/proc.html) and [proc_pid_mountinfo(5)](https://man7.org/linux/man-pages/man5/proc_pid_mountinfo.5.html) — mount information, namespace scope, and uninterruptible process states.
- [ss(8)](https://man7.org/linux/man-pages/man8/ss.8.html) — TCP, numeric output, process information, and destination-port filter syntax.
- [nfs(5)](https://man7.org/linux/man-pages/man5/nfs.5.html), [df(1)](https://man7.org/linux/man-pages/man1/df.1.html), and [timeout(1)](https://man7.org/linux/man-pages/man1/timeout.1.html) — NFS retry behavior, mounted-file-system queries, and signal-based timeouts.
- Local ripgrep 15.2.0 `--help` — explicit-file search and regular-expression syntax.

## Issues Found

1. **IPv6 endpoints were omitted from client discovery.** The inventory queried only `IpAddress`, which is the IPv4 field. A target can also expose `Ipv6Address`; searching only the displayed IPv4 endpoint can miss affected IPv6 clients. Added separate `IPv4` and `IPv6` fields to the query and updated the maintenance-record, configuration-search, and flow-log instructions to include both addresses where present.
2. **The stale-handle explanation generalized the documented replacement scenario.** AWS describes “bad file handle” errors when both a file system and its mount target are deleted and replaced using the same target IP. The original wording referred only to a replacement target and equated file-handle recovery with preservation of an NFS session. Updated the paragraph to state the documented scenario and unmount/remount remedy, and to explain that IP reuse does not preserve the old file system's file handles.

## Review Notes

- Verified the four shell blocks with `bash -n`. AWS CLI flags and response fields were checked against current official documentation; the JMESPath projection is syntactically consistent with the documented response structure.
- The mount-table regular expression matches both `nfs` and `nfs4` filesystem types after the mountinfo separator. Reading this kernel table avoids traversing the remote filesystem.
- The `ss` filter correctly selects TCP destination port 2049. Process attribution may require elevated privileges, and kernel NFS sockets need not identify the application using a mount. Socket observations remain supporting evidence, not a complete ownership inventory.
- Confirmed that `ClientConnections` is a file-system metric and cannot identify individual mount-target consumers. Flow logs provide historical traffic evidence and cannot prove the absence of idle or future consumers.
- The normal-unmount recommendation, lazy-detach caveat, and warning about interrupting outstanding I/O agree with AWS documentation. The timeout warning is appropriately qualified: signal-based timeouts do not guarantee immediate termination of every kernel I/O wait.
- The TLS explanation remains applicable to helper implementations using efs-proxy or stunnel; it does not depend on a specific helper version.
- Reviewed the linked technical resources and their relevance. No deprecated commands or flags were identified. Example resource IDs and mount paths must be replaced with deployment-specific values.
- This was a documentation and static syntax review. No live AWS resources were queried or deleted, no filesystem was unmounted, and no induced NFS failure or recovery test was performed.
