# Validation Summary: How to Configure Multi-Object Deletion in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 Multi-Object Delete API
- AWS CLI (`s3api`)
- Python boto3
- Kubernetes ConfigMaps

## Sources Consulted
- AWS S3 DeleteObjects API Reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
- Ceph RGW Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph source `rgw.yaml.in`: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph PR #49327 (rgw concurrency for multi-object deletes): https://github.com/ceph/ceph/pull/49327
- Rook issue #3011 (rook-config-override not applied to RGW): https://github.com/rook/rook/issues/3011
- Rook Ceph Configuration docs: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

1. **Fabricated config option `rgw_delete_multi_obj_max_num`**: This option does not exist in Ceph. The real option for tuning multi-object delete performance is `rgw_multi_obj_del_max_aio`, which controls the number of concurrent RADOS AIO operations during a multi-object delete request. Replaced all references with the correct option name and updated the explanation to accurately describe what it controls (concurrency, not object count limit).

2. **Fabricated config option `rgw_max_delete_objects`**: This option does not exist in Ceph source code or documentation. Removed the reference.

3. **Misleading claim that the 1000-object limit is configurable**: The post implied that `rgw_delete_multi_obj_max_num` could be used to change the maximum number of objects per delete request. In reality, the 1000-object limit is hardcoded per the S3 spec and is not configurable. Corrected the explanation to clarify this.

4. **`rook-config-override` ConfigMap may not apply to RGW pods**: Rook issue #3011 documents that `rook-config-override` settings may not be applied to RGW pods. Replaced the ConfigMap approach with the recommended method of using `ceph config set` from the Rook toolbox pod via the centralized Ceph config database.

## Review Notes
- The AWS CLI commands for `delete-objects` are syntactically correct and functional.
- The Python boto3 script is correct — `list_objects_v2` paginator returns up to 1000 keys per page by default, which aligns with the `delete_objects` API limit.
- The admin socket perf dump command uses a glob pattern that should work in practice, though actual socket filenames in Rook are more verbose than the simplified pattern shown.
