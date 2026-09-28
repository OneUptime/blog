# Validation Summary: Fix EFS NFS Server Not Responding After Reconnect with noresvport

## Status
validated

## Post Type
Technical troubleshooting guide with Linux diagnostic commands and EFS mount examples.

## Technologies Covered
- Amazon Elastic File System (EFS), mount targets, and the EFS mount helper (`amazon-efs-utils`).
- Linux NFS clients, NFSv4.1, TCP reconnection, and mount options.
- AWS VPC security groups, network ACLs, DNS, and routing.
- TLS, IAM authorization, and EFS access points.
- Linux diagnostic tools: uname, findmnt, nfsstat, journalctl, ss, nc, and ip.

## Sources Consulted
- AWS recommended NFS mount settings: https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-nfs-mount-settings.html
- AWS EFS mount troubleshooting: https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html
- AWS EFS network access and security groups: https://docs.aws.amazon.com/efs/latest/ug/network-access.html
- AWS EFS Linux mounting considerations: https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-general.html
- AWS EFS utilities documentation, helper options, and proxy architecture: https://github.com/aws/efs-utils
- util-linux findmnt manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- nfs-utils NFS mount options and remount limitations: https://man7.org/linux/man-pages/man5/nfs.5.html
- nfs-utils nfsstat manual: https://man7.org/linux/man-pages/man8/nfsstat.8.html
- util-linux umount manual: https://man7.org/linux/man-pages/man8/umount.8.html
- GNU uname manual: https://man7.org/linux/man-pages/man1/uname.1.html
- systemd journalctl manual: https://man7.org/linux/man-pages/man1/journalctl.1.html
- systemd time syntax: https://man7.org/linux/man-pages/man7/systemd.time.7.html
- iproute2 ss manual: https://man7.org/linux/man-pages/man8/ss.8.html
- iproute2 route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- OpenBSD netcat manual: https://man.openbsd.org/nc
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The diagnostic command used `findmnt -T`, which allows path resolution and fallback checks of path elements. On unresponsive storage, path canonicalization can itself block. Changed this to `findmnt -C -M /mnt/efs` to disable canonicalization and select the exact mountpoint from the mount table. This also avoids reporting the parent filesystem when the expected mount is absent.
- The packet-capture guidance did not distinguish the two connections in a TLS helper mount. Added a clarification that the kernel connects to a local proxy and the proxy connects to EFS. The NFS `noresvport` option governs the kernel connection, so an external proxy source port is not direct evidence of the kernel option's behavior.

## Review Notes
- Confirmed AWS documents the historical reconnect behavior for Linux kernels 5.4 and earlier and recommends `noresvport`. The existing distribution-backport caveat appropriately avoids treating the release number as conclusive evidence.
- Verified both mount examples: the plain NFSv4.1 options match AWS recommendations, and the helper supports the combined TLS, IAM, and access-point options. Example identifiers, region, address, and mountpoint must match the deployment; packages, permissions, network access, and an existing mount directory are prerequisites.
- Verified the diagnostic flags: `uname -r` reports the kernel release; `nfsstat -m` reports mounted NFS filesystems; `journalctl -k --since` filters kernel logs by time; `ss -tn` shows TCP sockets numerically; `nc -vz -w 5` tests TCP connectivity with a timeout; and `ip route get` resolves the selected route. Netcat syntax was checked against the OpenBSD implementation; minimal implementations can differ. Journal access may require elevated privileges.
- Confirmed TCP 2049 security-group direction, arbitrary client source-port support, and the requirement for ACL return traffic. A successful separate TCP probe does not validate an existing NFS session or authorization.
- Confirmed NFS transport cannot generally be changed with an in-place remount, busy filesystems require references to be released, and forced/lazy unmounts have the stated consequences. The hard-mount recommendation is consistent with AWS guidance.
- The disposable recovery test is appropriate, but a short packet interruption may leave the original TCP connection intact. To validate reconnection specifically, observe an actual new connection as well as application recovery and data integrity.
- All links in the post resolved to the intended resources. No deprecated command options were identified.
- Validation was based on documentation and static command review. No EFS mount, network interruption, or live recovery test was performed; this workspace is not the Linux EFS test client.
