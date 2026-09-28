# Validation Summary: EFS Mounts Manually but Not at Boot: Fixing `_netdev`, `nofail`, and systemd Ordering

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands, an fstab entry, and a systemd service override.

## Technologies Covered
- Amazon EFS and the amazon-efs-utils mount helper
- Amazon EC2 instance roles, IAM authorization, TLS, and EFS access points
- Linux fstab and NFS mounts
- systemd mount units, service dependencies, and boot diagnostics
- NetworkManager and systemd-networkd network readiness
- util-linux mount, findmnt, and mountpoint commands

## Sources Consulted
- AWS automatic EFS mounts: https://docs.aws.amazon.com/efs/latest/ug/mount-fs-auto-mount-onreboot.html
- AWS fstab configuration for existing EC2 instances: https://docs.aws.amazon.com/efs/latest/ug/mount-fs-auto-mount-update-fstab.html
- AWS EFS mount troubleshooting, including the multiple-mount server-trunking failure: https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html
- AWS EFS utilities repository and helper documentation: https://github.com/aws/efs-utils
- systemd mount options and generated mount dependencies: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.mount.xml
- systemd unit dependencies, including RequiresMountsFor: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.unit.xml
- systemd network synchronization and wait-online services: https://systemd.io/NETWORK_ONLINE/
- systemctl commands and property selection: https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml
- journalctl boot and unit filtering: https://raw.githubusercontent.com/systemd/systemd/main/man/journalctl.xml
- systemd-analyze critical-chain: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd-analyze.xml
- systemd path escaping and mount-unit suffixes: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd-escape.xml
- systemd service pre-start commands: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.service.xml
- util-linux mount manual: https://man7.org/linux/man-pages/man8/mount.8.html
- util-linux findmnt manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- util-linux mountpoint manual: https://man7.org/linux/man-pages/man1/mountpoint.1.html

## Issues Found
1. The description separated ordering from success requirements too sharply. Under systemd, nofail also removes ordering before remote-fs.target. Updated the existing paragraph to explain that boot can continue without waiting for the mount, while _netdev orders the mount after network-online.target.
2. The verification command used findmnt -T, which can return the filesystem containing /mnt/efs even when that directory is not mounted. Replaced it with findmnt --mountpoint /mnt/efs to check the exact mount point without falling back to an ancestor filesystem.

## Review Notes
- The fstab entry uses the correct six-field format and supported EFS helper options. The filesystem and access-point IDs are illustrative and must identify actual resources when deployed. IAM and access-point mounting use TLS as shown.
- Mounting by target reads fstab; daemon-reload refreshes generated units. The mount-unit name, systemctl property queries, journal filters, path escaping, and critical-chain syntax are valid.
- RequiresMountsFor supplies requirement and ordering dependencies. A failing mountpoint precheck prevents the main service command from starting. The executable location depends on the distribution, as the post states.
- Network-online readiness depends on the active network manager and its configuration; it does not guarantee EFS reachability or monitor later outages.
- The documented AWS sequential-mount workaround matches the specific NFS server-trunking error described in the post.
- The linked AWS and systemd resources resolve to the intended documentation. No explicitly versioned API or deprecated command requires migration.
- critical-chain is supplementary timing evidence, not a complete failure history; it omits timed-out jobs. The post appropriately directs readers to the journal and EFS helper logs.
- An exact mount-point check establishes that a mount exists; operators should also inspect the reported source and filesystem type to confirm the expected storage. The pre-start check does not continuously monitor storage health.
- This was a documentation and static configuration review. No EC2 instance or EFS filesystem was available for live mounting, reboot, or outage tests; those acceptance tests remain deployment-specific.
