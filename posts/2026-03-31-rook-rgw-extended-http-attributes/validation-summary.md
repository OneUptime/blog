# Validation Summary: How to Configure Extended HTTP Attributes in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 API (user metadata via `x-amz-meta-*`)
- OpenStack Swift API (metadata via `X-Object-Meta-*`)
- AWS CLI

## Sources Consulted
- Ceph RGW configuration source: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- AWS S3 user-defined metadata documentation

## Issues Found

1. **Fabricated config option `rgw_expose_bucket_acl`**: This option does not exist in Ceph. There is a `rgw_expose_bucket` option (exposes bucket name in a response header), but nothing for exposing ACLs. Removed the section referencing this option and replaced the "Key Configuration Parameters" check commands with the real options `rgw_max_attr_size` and `rgw_max_attrs_num_in_req`.

2. **Fabricated config option `rgw_expose_object_meta`**: This option does not exist in Ceph source code or documentation. Removed the reference.

3. **Fabricated config option `rgw_user_header_prefix`**: This option does not exist. The `x-amz-meta-` prefix is part of the S3 specification and is handled automatically by RGW — it is not configurable. Replaced the section with a clarification that user metadata works without special configuration.

4. **Misleading comment on `rgw_max_attr_size`**: The comment said "Maximum size of all metadata headers" but the option controls the maximum size of a single metadata value. Corrected the comment. Also noted that the default is 0 (no limit).

5. **Misleading comment on `rgw_max_attrs_num_in_req`**: Clarified that the default is 0 (no limit) and that it controls the number of metadata items per request.

6. **Rook ConfigMap used fabricated option**: The `rook-config-override` ConfigMap example referenced `rgw_expose_bucket_acl = true`. Replaced with the real options `rgw_max_attr_size` and `rgw_max_attrs_num_in_req`.

## Review Notes
- The AWS CLI commands for uploading and retrieving metadata are correct.
- The Swift `X-Object-Meta-*` curl example is correct.
- The expected JSON response from `head-object` is accurate.
- The core content about S3 and Swift user metadata is sound; the issues were all around fabricated Ceph configuration options that don't exist.
