# Validation Summary: How to Configure Bucket Logging in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS S3 API (server access logging)
- AWS CLI (`aws s3api`)
- `radosgw-admin` CLI
- S3 lifecycle configuration

## Sources Consulted
- AWS S3 PutBucketLogging API documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLogging.html
- AWS S3 server access log format: https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html
- Ceph RGW documentation on bucket logging: https://docs.ceph.com/en/latest/radosgw/bucketlogging/
- Ceph RGW ops log configuration: https://docs.ceph.com/en/latest/radosgw/config-ref/
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found
No technical issues found.

## Review Notes
- The bucket logging feature in Ceph RGW was introduced in the Squid release (Ceph 19.x). Users on older Ceph versions will not have this feature available. The post does not mention version requirements, which could be noted in a future update.
- The example endpoint uses port 7480, which was the default for the older Civetweb frontend. Modern Ceph deployments (Pacific and later) default to the Beast frontend on port 8080. Since the post uses `your-rgw-host:7480` as a placeholder, this is not incorrect, but readers should use their actual RGW endpoint.
- The statement that source and target buckets "can be the same bucket" is technically accurate but could benefit from a warning that this may cause an infinite loop of log entries, as each log write generates another access log entry.
