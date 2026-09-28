# Validation Summary: Amazon EFS Mount Times Out: Checking Mount Targets, Port 2049, Security Groups, Routes, and NACLs

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI and Linux diagnostic commands.

## Technologies Covered
- Amazon EFS, mount targets, NFS, and EFS mount helper
- AWS CLI and JMESPath response queries
- Amazon VPC security groups, route tables, peering, transit gateways, and network ACLs
- Amazon EC2, ECS Fargate task networking, and EKS EFS CSI node mounts
- Linux name resolution, TCP diagnostics, packet capture, and mount inspection
- TLS, IAM authorization, and EFS access points

## Sources Consulted
- [AWS CLI: describe-mount-targets](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-mount-targets.html) — command options, response fields, and lifecycle states.
- [AWS CLI: describe-mount-target-security-groups](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-mount-target-security-groups.html) — required mount-target ID and returned security groups.
- [EFS mount troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html) — timeout causes, incorrect target IPs, DNS failures, and access-point failures.
- [EFS security groups and source ports](https://docs.aws.amazon.com/efs/latest/ug/network-access.html) — TCP 2049 rules, private mount targets, and support for arbitrary client source ports.
- [EFS mounting with DNS names](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html) — hostname format and Availability Zone resolution.
- [VPC security-group rules](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html) — inbound source references, outbound destination references, and topology limitations.
- [VPC subnet route tables](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html) — local routes, more specific routes, and subnet route-table associations.
- [VPC network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html) — subnet-boundary filtering and stateless return-traffic handling.
- [VPC network ACL rules](https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html) — rule fields and ascending rule-number evaluation.
- [ECS Fargate task networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html) — EFS traffic through the task ENI.
- [EFS CSI driver node DaemonSet](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/deploy/kubernetes/base/node-daemonset.yaml) — host networking for node-side mounts.
- [EFS mounting with IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html) — mount helper, TLS, and IAM options.
- [getent(1)](https://man7.org/linux/man-pages/man1/getent.1.html) — IPv4 name-service lookup using ahostsv4.
- [OpenBSD nc(1)](https://man.openbsd.org/nc) — verbose connection probing and timeout options.
- [ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html) — route lookup for a destination.
- [tcpdump(8)](https://man7.org/linux/man-pages/man8/tcpdump.8.html) — numeric output and capture on the Linux any interface.
- [pcap-filter(7)](https://man7.org/linux/man-pages/man7/pcap-filter.7.html) — host and TCP port filter syntax.
- [findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html) — target-path fallback, exact mountpoint selection, and filesystem-type filtering.

## Issues Found
1. **Security-group references were described too broadly.** The original statement required the referenced group to belong to the originating ENI for any rule. This is correct for inbound source references, but outbound rules reference the destination group. Qualified the statement as inbound and added the outbound distinction, preserving the existing topology caveat.
2. **The recovery check could report a parent filesystem.** `findmnt -T /mnt/efs` can return the filesystem containing that directory when EFS is absent. Replaced it with `findmnt -M /mnt/efs -t nfs,nfs4` and required checking that the result is the intended EFS mount. This checks the explicit mountpoint and limits results to NFS filesystem types before the application read/write test.

## Review Notes
- Both AWS CLI commands and all queried fields are documented. The IDs, region, hostname, and target IP are illustrative values that must match the deployment. No deprecated APIs or options were identified.
- The TCP probe and packet filter are syntactically valid. A successful handshake establishes transport reachability only; the original mount and application access checks remain necessary.
- The four NACL directions correctly use destination port 2049 for requests and the client's source port for replies. They apply when traffic crosses the relevant subnet boundaries. EFS accepts unprivileged source ports, so a fixed privileged-port assumption would be incorrect.
- The DNS example uses the documented EFS hostname. Normal filesystem DNS resolution depends on VPC DNS configuration and a mount target in the client's Availability Zone; cross-VPC resolution needs appropriate configuration.
- Linux tools must be installed, and the nc example assumes an implementation supporting the documented flags. Managed Fargate environments may require network diagnostics outside the failed task because the host and failed task are not available for an interactive capture. The task ENI remains the relevant source for rule inspection.
- The post's three AWS documentation links resolve to the intended resources. The author link is attribution rather than a technical source.
- Review was based on official AWS documentation, upstream project configuration, and command manuals. Bash syntax was checked locally; no live AWS mount, packet capture, IAM authorization, or application file operation was performed against the illustrative resources.
