# Validation Summary: How to Understand Ceph Reef Release Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph Reef (v18)
- Rook (Ceph Kubernetes operator)
- CephFS with Samba/SMB
- Ceph RGW (RADOS Gateway) S3 notifications
- BlueStore storage backend
- NVMe-oF gateway
- Ceph Dashboard

## Sources Consulted
- Ceph Reef release announcement: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Ceph Reef documentation: https://docs.ceph.com/en/reef/
- Ceph Reef radosgw-admin man page: https://docs.ceph.com/en/reef/man/8/radosgw-admin/
- Ceph Reef bucket notifications docs: https://docs.ceph.com/en/reef/radosgw/notifications/
- Ceph Reef dashboard docs: https://docs.ceph.com/en/reef/mgr/dashboard/
- Ceph SMB Manager Module blog post (Squid): https://ceph.io/en/news/blog/2025/smb-manager-module/
- Ceph NVMe-oF gateway project: https://github.com/ceph/ceph-nvmeof
- Rook NVMe-oF docs (v1.19+): https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Ceph releases index: https://docs.ceph.com/en/latest/releases/

## Issues Found

1. **SMB Gateway incorrectly claimed as "new native gateway" in Reef**: The post originally stated "Reef introduces native SMB/CIFS access to CephFS via a new CephNFS-like gateway." The native `mgr/smb` module and `ceph orch apply smb` service were introduced in Squid (v19), not Reef. In the Reef era, SMB access to CephFS is through manual Samba container deployment using the `vfs_ceph` module. Fixed by rewording to accurately describe Samba container integration.

2. **`radosgw-admin topic create` command does not exist in Reef**: The post used `radosgw-admin topic create` to create an SNS topic, but this subcommand does not exist in Ceph Reef. The `radosgw-admin topic` command only supports `list`, `get`, and `rm` subcommands. Topics must be created via the S3 SNS API. Fixed by replacing with the correct `aws sns create-topic` command targeting the RGW endpoint.

3. **BlueStore `bluestore_cache_autotune` falsely labeled "New in Reef"**: The comment "New BlueStore cache tuning in Reef" implied this was a Reef-era feature. `bluestore_cache_autotune` has existed since Mimic/Luminous (v12/v13, circa 2018). Fixed by changing the comment to "BlueStore cache tuning options."

4. **Fabricated `CephNVMEofGateway` Rook CRD**: The post showed a `CephNVMEofGateway` YAML resource that does not exist in any Reef-era Rook version (v1.12-v1.18). Rook NVMe-oF CRD support was added in Rook v1.19. During the Reef era, the NVMe-oF gateway was deployed as a standalone container from the ceph-nvmeof project. Fixed by replacing the fake CRD YAML with a note about standalone deployment and a dashboard status command.

5. **Dashboard `standby_behaviour` mischaracterized as "multi-cluster support"**: The comment "New in Reef: Multi-cluster dashboard support" incorrectly described the `mgr/dashboard/standby_behaviour` setting. This setting controls whether a standby manager redirects (HTTP 303) or errors (HTTP 500) when a client connects to its dashboard port. It has nothing to do with multi-cluster management. Fixed by changing the comment to accurately describe standby manager dashboard redirect behavior.

6. **Description mentioned "CSI changes" not covered in post**: The post's description line referenced "CSI changes" but the post contains no CSI-related content. Fixed by replacing with "NVMe-oF gateway" which is actually covered.

## Review Notes
- The post's claim that Reef "serves as the current long-term stable release as of 2024-2025" is time-sensitive. Squid (v19) was released in 2024, making Reef the previous stable release. The phrasing is acceptable for when the post was written but may need updating.
- The CephFilesystem YAML in the SMB section is technically valid as a prerequisite for SMB access, though it is a standard CephFS resource and not SMB-specific.
- The BlueStore `bluestore allocator score block` command claimed as "new in Reef" in a comment may have been available in earlier releases as well, though the allocator scoring did see improvements in Reef.
- The upgrade image `quay.io/ceph/ceph:v18.2.0` is correct for the initial Reef stable release. Users should check for the latest v18.2.x point release for production use.
