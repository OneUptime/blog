# Validation Summary: How to Use Ceph RGW for Big Data Analytics Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway)
- Apache Spark with S3A connector
- Apache Hive
- Apache Presto
- Hadoop S3A filesystem client
- PySpark
- Erasure coding for storage efficiency

## Sources Consulted
- Rook Ceph CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph RGW radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/
- Hadoop S3A configuration documentation: https://hadoop.apache.org/docs/stable/hadoop-aws/tools/hadoop-aws/index.html
- Apache Spark Hadoop integration and spark-submit documentation: https://spark.apache.org/docs/latest/configuration.html
- Ceph configuration reference for RGW parameters: https://docs.ceph.com/en/latest/radosgw/config-ref/

## Issues Found

1. **Missing `fs.s3a.secret.key` in Hive configuration**: The `hive-site.xml` snippet included `fs.s3a.access.key` but omitted the corresponding `fs.s3a.secret.key` property, which is required for S3A authentication. Added the missing property with the `ANALYTICSSECRET` value to match the credentials used elsewhere in the post.

2. **Misleading Performance Tuning description**: The introductory text said "Increase multipart upload thresholds for large files" but the first command (`radosgw-admin global quota set --quota-scope=bucket --max-size=10T`) sets a bucket size quota, not a multipart upload threshold. Changed the text to "Set bucket quotas and tune RGW for high throughput" to accurately describe what the commands do.

## Review Notes
- The CephObjectStore CRD YAML is correct for Rook's `ceph.rook.io/v1` API and uses a reasonable erasure coding profile (4+2) for analytics workloads.
- The Spark S3A configuration correctly includes `path.style.access=true`, which is required for non-AWS S3-compatible endpoints like Ceph RGW.
- The `hadoop-aws:3.3.4` package version is compatible with Spark 3.x and includes the S3A connector.
- The `radosgw-admin user create` command with explicit `--access-key` and `--secret-key` flags is valid but in production, auto-generated keys are generally preferred for security.
- The section title "Configuring Hive Metastore" is slightly imprecise — the configuration shown is for Hive's S3A filesystem access generally, not specifically the metastore component. However, these settings do go in `hive-site.xml` and this usage is common enough to not warrant a change.
