# Validation Summary: How to Use Ceph RGW for Log Storage and Archival

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- AWS CLI (S3-compatible commands)
- Fluentd (fluent-plugin-s3)
- Vector (aws_s3 sink)
- zstd compression
- S3 lifecycle policies

## Sources Consulted
- Ceph documentation on pool compression settings: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- fluent-plugin-s3 documentation: https://github.com/fluent/fluent-plugin-s3
- Vector aws_s3 sink documentation: https://vector.dev/docs/reference/configuration/sinks/aws_s3/
- Vector template syntax documentation: https://vector.dev/docs/reference/configuration/template-syntax/
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS S3 lifecycle configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found

1. **Fluentd config: redundant `time_slice_wait` parameter**
   - **What was wrong:** The `time_slice_wait 10m` parameter was specified outside the `<buffer>` block alongside the v1.x buffer section that already includes `timekey_wait 10m`. In fluent-plugin-s3 v1.x, `time_slice_wait` is superseded by `timekey_wait` in the buffer block, making it redundant.
   - **What was changed:** Removed the `time_slice_wait 10m` line outside the buffer block, keeping only the `timekey_wait 10m` inside the `<buffer>` section.
   - **Why:** Eliminates confusion about which parameter takes effect and aligns with v1.x fluent-plugin-s3 configuration conventions.

2. **Vector config: invalid template syntax in `key_prefix`**
   - **What was wrong:** `key_prefix` used `{{ now() | strftime(\"%Y/%m/%d/\") }}` which is not valid Vector template syntax. Vector templates support event field references (e.g., `{{ host }}`) and strftime specifiers directly (e.g., `%Y/%m/%d`), but do not support VRL function calls like `now()` or filter pipes like `| strftime()`.
   - **What was changed:** Replaced `{{ now() | strftime(\"%Y/%m/%d/\") }}` with `%Y/%m/%d/`, which uses Vector's native strftime support in template strings.
   - **Why:** The original syntax would cause a Vector configuration error at startup. The fixed version correctly partitions logs by date using built-in template strftime specifiers.

## Review Notes
- The `time_slice_format %Y%m%d-%H` parameter in the Fluentd config is retained because it controls the format of the `%{time_slice}` placeholder used in `s3_object_key_format`, which is still relevant in v1.x.
- The 5-10x compression claim for zstd on log data is reasonable — log files are highly compressible text, and zstd typically achieves 5-15x ratios on structured log data.
- The `chunk_limit_size 256m` in the Fluentd buffer is quite large; in production, 64m-128m may be more practical to reduce memory pressure, but this is a tuning preference rather than an error.
- All AWS CLI commands use correct flags and syntax for interacting with S3-compatible endpoints.
