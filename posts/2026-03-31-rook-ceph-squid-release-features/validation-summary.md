# Validation Summary: How to Understand Ceph Squid Release Features

## Status
validated

## Post Type
Guide / Feature overview

## Technologies Covered
- Ceph Squid (v19)
- Rook Ceph Operator
- SMB/CIFS gateway (Ceph SMB manager module)
- NVMe-oF gateway (CephNVMeOFGateway CRD)
- RADOS namespaces
- RGW S3 Select
- BlueStore
- Kubernetes / kubectl

## Sources Consulted
- Ceph Squid release notes: https://docs.ceph.com/en/latest/releases/squid/
- Ceph v19.2.0 Squid release announcement: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/
- Ceph SMB manager module blog post: https://ceph.io/en/news/blog/2025/smb-manager-module/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook NVMe-oF documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook GitHub issue #14505 (CephSMB CRD request, closed as not planned): https://github.com/rook/rook/issues/14505
- AWS CLI select-object-content reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/select-object-content.html
- Ceph BlueStore fragmentation PR #61910: https://github.com/ceph/ceph/pull/61910
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found

1. **SMB gateway incorrectly claimed as "graduated" from technology preview**: The post stated SMB graduated to supported status in Squid. In reality, SMB support in Squid remains under active development with many features still immature; full production support is targeted for Tentacle (v20). Fixed the language throughout to say "continued development" and "under active development."

2. **Fabricated CephSMB CRD**: The post showed a `kind: CephSMB` Rook CRD with spec fields (gateway, security, shares) that does not exist. Rook explicitly declined to implement this CRD (GitHub issue #14505 closed as "not planned"), redirecting users to the samba-operator project. Replaced with actual Ceph SMB manager module CLI commands (`ceph smb cluster create`, `ceph smb share create`).

3. **Incorrect NVMe-oF CRD kind name**: `CephNVMEofGateway` was wrong casing; corrected to `CephNVMeOFGateway`.

4. **Incorrect NVMe-oF CRD field name**: `gatewayGroup` is not a real field; corrected to `group`.

5. **Invalid per-namespace pool quota command**: `ceph osd pool set-quota mypool max_bytes 10737418240 --namespace tenant-a` is invalid — `set-quota` does not support a `--namespace` flag. Pool quotas apply at the pool level only. Removed the invalid command.

6. **Incorrect `ceph osd df` syntax**: `ceph osd df style=terse --format json` is not valid. The correct syntax is `ceph osd df -f json-pretty`. Fixed accordingly.

7. **Non-existent BlueStore config option**: `bluestore_fragmentation_check_interval` does not exist. The correct option introduced in Squid is `bluestore_fragmentation_check_period`. Fixed the option name.

8. **Broken Python script escaping**: The nested bash/Python script with triple-escaped quotes was extremely fragile and likely to fail at runtime. Replaced with cleaner, simpler commands.

9. **S3 Select outfile argument ordering**: The positional `outfile` argument (`/dev/stdout`) was placed before `--endpoint-url`. Moved it to the end of the command where positional arguments should appear.

## Review Notes
- S3 Select in Ceph Squid's RGW is functional but only partially implements the AWS S3 Select API (primarily CSV support). The post's claims about "improvements" are reasonable but readers should know it's not a complete S3 Select implementation.
- The `quay.io/ceph/ceph:v19.2.0` container image tag is valid and correct for the first stable Squid release.
- The Ceph release sequence (Reef v18 -> Squid v19) is correct.
- The upgrade workflow shown (update CephCluster image, then verify with health/versions/features) is a valid approach for Rook-managed Ceph upgrades.
