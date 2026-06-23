# Validation Summary: How to Configure Ceph Object Storage (RGW) as S3-Compatible Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Cephadm and radosgw-admin
- Amazon S3-compatible APIs
- AWS CLI
- boto3 / botocore
- AWS SDK for JavaScript v3
- AWS SDK for Go v2
- HAProxy and Keepalived
- Prometheus and ceph-exporter
- TLS configuration

## Sources Consulted
- Ceph RGW Service documentation: https://docs.ceph.com/en/reef/cephadm/services/rgw/
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/reef/man/8/radosgw-admin/
- Ceph Object Gateway Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph Bucket Policies documentation: https://docs.ceph.com/en/reef/radosgw/bucketpolicy/
- Ceph Pool Placement and Storage Classes documentation: https://docs.ceph.com/en/reef/radosgw/placement/
- Ceph RGW Metrics documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- AWS SDK for JavaScript v3 S3 examples and presigner package docs: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html and https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- AWS SDK for Go v2 endpoint and S3 package docs: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-endpoints.html and https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/s3

## Issues Found
- The introduction and conclusion described RGW as fully S3 compatible. Ceph supports many S3 operations but documents subsets and limitations, so the language was corrected to avoid overstating compatibility.
- The cephadm deployment command treated `default.us-east-1` as a realm/zone identifier. Cephadm expects an arbitrary service id for single-cluster RGW deployments, with explicit `--realm`, `--zonegroup`, and `--zone` flags for multisite, so the example was changed to use a simple `rgw` service id.
- The `rgw_enable_lc_threads` comments incorrectly described object versioning and object lock support. The comments now correctly describe lifecycle processing.
- The advanced configuration snippet described `rgw_num_rados_handles` as a count of RGW instances and included `rgw_bucket_index_max_aio` as bucket index sharding. These were corrected or removed because they did not match the documented settings.
- The bucket policy and lifecycle snippets were marked as JSON but included `//` comments, which are invalid JSON. The comments were removed from the JSON blocks.
- The lifecycle example used `GLACIER`, which Ceph warns can cause client issues unless a suitable cloud storage class is configured. The example now uses `STANDARD_IA`.
- The Python example had an inaccurate return type for a function that can return `None` and unused imports/variables in the multipart upload helper. These were corrected.
- The Node.js example imported `GetObjectCommand` twice, which is a syntax error in destructuring imports, and imported an unused stream helper. The duplicate and unused import were removed.
- The Go example used `errors.As` without importing `errors`, and a comment incorrectly said `PutObject` read the whole file into memory. The import and comment were corrected.
- The HAProxy health check expected HTTP 200 from unauthenticated `GET /`, but RGW can return a 4xx response while still being healthy. The check now accepts 2xx, 3xx, or 4xx HTTP responses.
- The Prometheus section described per-RGW `/admin/prometheus` scraping, which is not the documented RGW metrics path. It was corrected to use Ceph Manager metrics and ceph-exporter for RGW daemon perf counters.
- The TLS PEM creation command used `sudo cat ... > file`, which does not apply sudo to the shell redirection. It now uses `sudo sh -c`.
- Several example RGW daemon/service names still referenced the old service id. They were aligned with the corrected `rgw` service id.

## Review Notes
- Local syntax checks passed for the extracted Python, JavaScript, JSON, and YAML snippets. Go is not installed in the review environment, so the Go snippet was reviewed against official AWS SDK for Go v2 documentation rather than compiled locally.
