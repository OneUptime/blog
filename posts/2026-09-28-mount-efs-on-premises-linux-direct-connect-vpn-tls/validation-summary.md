# Validation Summary: How to Mount Amazon EFS from On-Premises Linux over Direct Connect or VPN with TLS

## Status
validated

## Post Type
Tutorial / operational guide with shell commands, EFS helper configuration, and an fstab example.

## Technologies Covered
- Amazon EFS Regional file systems and mount targets
- AWS Direct Connect, Site-to-Site VPN, VPC routing, security groups, and network ACLs
- Linux NFS clients, amazon-efs-utils, and TLS
- AWS CLI and JMESPath queries
- IAM authorization, EFS access points, and POSIX permissions
- Linux network diagnostics, fstab, and service startup dependencies

## Sources Consulted
- [AWS on-premises EFS mounting tutorial](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-helper-direct.html)
- [EFS network access and security groups](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)
- [EFS client installation](https://docs.aws.amazon.com/efs/latest/ug/installing-amazon-efs-utils.html)
- [EFS mount-helper command examples](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-helper-ec2-linux.html)
- [EFS mount-helper behavior](https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html)
- [AWS CLI describe-mount-targets reference](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-mount-targets.html)
- [AWS efs-utils README](https://github.com/aws/efs-utils)
- [AWS efs-utils configuration](https://raw.githubusercontent.com/aws/efs-utils/master/dist/efs-utils.conf)
- [AWS mount.efs manual](https://raw.githubusercontent.com/aws/efs-utils/master/man/mount.efs.8)
- [EFS IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS NFS users, groups, and permissions](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html)
- [EFS performance tips](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html)
- [AWS Site-to-Site VPN setup and routing](https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html)
- [OpenBSD nc manual](https://man.openbsd.org/nc.1)
- [iproute2 ip-route manual](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [util-linux findmnt manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [systemd.mount manual](https://man7.org/linux/man-pages/man5/systemd.mount.5.html)
- [GNU tail manual](https://man7.org/linux/man-pages/man1/tail.1.html)
- [GNU mkdir manual](https://man7.org/linux/man-pages/man1/mkdir.1.html)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
1. **Incorrect attribution for Region configuration.** The AWS on-premises tutorial changes the Region in `dns_name_format`; it does not show the post's `[mount] region` configuration. The setting itself is supported. Replaced the attribution with a link to the official efs-utils configuration, which explicitly documents `region` for on-premises mounts, and retained the tutorial reference for hosts-file mapping.
2. **Required authorization options could be lost at boot.** The generic fstab example omitted the conditional IAM, credential-source, and access-point options discussed for the manual mount. Added an instruction to retain the options used by the tested mount. Without them, a policy-restricted mount can fail at boot or use a different authorization context. The baseline fstab example remains valid for the baseline TLS-only mount.

## Review Notes
- Confirmed the CLI operation, Region flag, file-system selector, and queried `AvailabilityZoneName`, `IpAddress`, and `LifeCycleState` fields. The JMESPath projection and shell continuation syntax are valid.
- Confirmed private connectivity, bidirectional routing, TCP 2049 access, and return-traffic requirements. The TCP probe establishes reachability only; it does not validate TLS or file-system permissions.
- Confirmed the Region configuration, file-system-ID source syntax, `tls,mounttargetip` combination, helper log location, and local TLS proxy behavior. Explicit target selection does not require EFS hostname resolution to select the target.
- Confirmed that IAM and access-point options work with TLS and that filesystem access also depends on policy and numeric POSIX identities. Refreshable credentials must be supported by the installed helper and available to the boot-time mount context.
- Confirmed shell utility flags and the six-field fstab format. `_netdev` supplies network-mount ordering; application dependencies and VPN readiness still require deployment-specific testing.
- A fixed mount-target IP or hosts entry does not provide automatic migration of established NFS connections. Recovery and application consistency require the maintenance testing described in the post.
- The latency discussion concerns operations that reach the remote filesystem; client caching can avoid some network requests. The guidance to measure workload behavior is appropriate.
- No explicit software version is pinned, and no deprecated command or option was identified. Supported distributions should be checked against the installed efs-utils release. The generic TLS-process description accommodates efs-proxy and stunnel implementations.
- All original post links resolved to the intended resources. Some direct GNU and freedesktop documentation endpoints were unavailable through the browser; their upstream manual pages hosted on man7.org were consulted instead.
- This was a documentation and syntax review. No live AWS mount, VPN outage, IAM credential refresh, reboot, or application I/O test was performed; these require the reader's actual infrastructure and credentials.
