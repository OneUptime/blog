# Validation Summary: How to Configure Cloud Restore Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 API (restore-object, head-object)
- Cloud tiering (S3-compatible backends)
- AWS CLI (s3api)

## Sources Consulted
- Ceph Cloud Transition documentation: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Ceph Cloud Restore documentation: https://docs.ceph.com/en/latest/radosgw/cloud-restore/
- Ceph RGW config options source (rgw.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph Pool Placement and Storage Classes: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph Object Storage Tiering Enhancements blog posts: https://ceph.io/en/news/blog/2025/rgw-tiering-enhancements-part1/

## Issues Found

1. **Incorrect command for adding cloud storage class**: The post used `radosgw-admin zone placement add` with `--tier-type cloud`. The correct command is `radosgw-admin zonegroup placement add` with `--tier-type cloud-s3`. Cloud storage classes are defined at the zonegroup level, not the zone level. The separate `zonegroup placement add` step was also redundant and was consolidated. Additionally added `retain_head_object=true` to the tier-config, which is required for cloud restore to work.

2. **Fabricated config option `rgw_cloud_restore_interval`**: This config option does not exist in Ceph. The correct option is `rgw_restore_processor_period`, which controls the cycle time between consecutive restore processing thread runs. Fixed in all three locations (config get/set commands, Rook ConfigMap, and summary text).

3. **Fabricated command `radosgw-admin restore list --bucket=my-bucket`**: This command does not exist in Ceph. Removed it from the monitoring section. The `radosgw-admin object stat` command and `aws s3api head-object` are the correct ways to check restore status.

## Review Notes
- The `retain_head_object=true` tier-config parameter is essential for cloud restore functionality. Without it, object metadata is not retained locally after transition, making restore impossible. This was added to the tier-config example.
- The S3 RestoreObject API usage and head-object status checking are correct and well-documented.
- The Rook ConfigMap approach for applying RGW configuration overrides is valid.
