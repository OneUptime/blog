# Validation Summary: How to Debug OSD Failures and Disk Errors in Rook

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl, pod debugging, node debugging)
- BlueStore (Ceph OSD storage backend)
- SMART / smartmontools (disk health diagnostics)

## Sources Consulted
- Ceph official documentation — `ceph(8)` man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph BlueStore tool documentation: https://docs.ceph.com/en/reef/man/8/ceph-bluestore-tool/
- Ceph Monitoring a Cluster guide: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph Control Commands: https://docs.ceph.com/en/latest/rados/operations/control/
- Red Hat Ceph Storage 5 — BlueStore Administration: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/osd-bluestore
- IBM Storage Ceph 7.1 — BlueFS statistics: https://www.ibm.com/docs/en/storage-ceph/7.1.0?topic=bluefs-viewing-ceph-statistics-ceph-osds
- Ceph test suite (qa/workunits/cephtool/test.sh) for command syntax verification

## Issues Found
1. **`ceph tell osd.<id> bluestore.fsck` is not a valid command (Step 4).** The `bluestore.fsck` subcommand does not exist as a `ceph tell` admin socket command. BlueStore fsck is only available offline via the `ceph-bluestore-tool fsck --path /var/lib/ceph/osd/ceph-<id>/` utility, which requires the OSD to be stopped first. **Fix:** Replaced with `ceph tell osd.<id> bluefs stats`, which is a valid online command that reports BlueFS device allocation and usage statistics. Updated the comment to reflect the actual output.

2. **`ceph osd health osd.<id>` is not a valid Ceph command (Step 4).** There is no `ceph osd health` subcommand in Ceph. The `health` subcommand exists at the cluster level (`ceph health`), not the OSD level. **Fix:** Replaced with `ceph osd metadata <id>` (using numeric ID, not `osd.<id>` format), which returns OSD device details, BlueStore configuration, and other diagnostic metadata. Updated the comment accordingly.

## Review Notes
- The `ceph osd deep-scrub` command in Step 9 uses `osd.<id>` format. While this appears to work, the canonical documented format uses a plain numeric ID (e.g., `ceph osd deep-scrub 0`). Both forms are accepted in practice, so this was left as-is for consistency with the rest of the post.
- Step 6 uses `apt-get install -y smartmontools` after `chroot /host`, which modifies the host's package system directly. This only works on Debian/Ubuntu-based hosts. On other distributions (RHEL, Flatcar, Talos), a different package manager or pre-installed tooling would be needed. This is a minor caveat not worth changing since it's a common debug scenario.
- For a full BlueStore consistency check (fsck), users would need to stop the OSD, exec into the OSD pod or a debug pod with access to the OSD data path, and run `ceph-bluestore-tool fsck --path <osd-data-path>`. This is a more involved procedure not covered in this post but worth noting for completeness.
- The `ceph tell osd.<id> perf dump` command in Step 4 requires the OSD to be running. If the OSD is crashed/down, this command will fail. The post's debug flow handles this implicitly since BlueStore diagnostics come before disk replacement, but it could be made more explicit.
