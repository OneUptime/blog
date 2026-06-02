# Validation Summary: How to Use S3 Multi-Region Access Points for Global Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Multi-Region Access Points
- Amazon S3 Cross-Region Replication
- AWS CLI v2
- Boto3 / AWS SDK for Python
- Amazon CloudWatch
- AWS Global Accelerator

## Sources Consulted
- AWS S3 User Guide: Managing multi-Region traffic with Multi-Region Access Points - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPoints.html
- AWS S3 User Guide: Creating Multi-Region Access Points - https://docs.aws.amazon.com/AmazonS3/latest/userguide/multi-region-access-point-create-examples.html
- AWS S3 User Guide: Configuring replication for use with Multi-Region Access Points - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPointBucketReplication.html
- AWS S3 User Guide: Making requests through a Multi-Region Access Point - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPointRequests.html
- AWS S3 User Guide: Using Multi-Region Access Points with supported API operations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MrapOperations.html
- AWS S3 User Guide: Multi-Region Access Point restrictions and limitations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPointRestrictions.html
- AWS S3 User Guide: Using Amazon S3 Multi-Region Access Point failover controls - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingFailover.html
- AWS CLI v2 Command Reference: create-multi-region-access-point - https://docs.aws.amazon.com/cli/latest/reference/s3control/create-multi-region-access-point.html
- AWS CLI v2 Command Reference: describe-multi-region-access-point-operation - https://docs.aws.amazon.com/cli/latest/reference/s3control/describe-multi-region-access-point-operation.html
- AWS CLI v2 Command Reference: submit-multi-region-access-point-routes - https://docs.aws.amazon.com/cli/latest/reference/s3control/submit-multi-region-access-point-routes.html
- AWS CLI v2 Command Reference: put-bucket-replication - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html

## Issues Found
- Corrected the MRAP routing description from "nearest bucket replica" to "closest active bucket" because MRAP routing is based on active routing status and AWS network proximity/latency, not object contents.
- Clarified that S3 Cross-Region Replication is configured separately. AWS does not perform special replication handling just because buckets are attached to an MRAP.
- Corrected the disaster recovery claim. MRAP failover controls can shift traffic between active/passive regions; the post should not imply fully automatic failover to the next closest region.
- Fixed a bucket-count mismatch: the text said two buckets, but the commands create three.
- Replaced the invalid `describe-multi-region-access-point` status check with `describe-multi-region-access-point-operation` using the `RequestTokenARN` returned by `create-multi-region-access-point`.
- Added `--region us-west-2` to MRAP create/status control-plane commands, matching AWS guidance that MRAP control-plane requests are routed through US West (Oregon).
- Corrected MRAP ARN examples to use the generated MRAP alias, not the human-readable MRAP name.
- Fixed the routing policy example. `TrafficDialPercentage` is an active/passive control using `100` for active and `0` for passive, not arbitrary weighted traffic splitting such as 70/30.
- Added an allowed failover-control region to the routing command example.
- Narrowed the CloudWatch monitoring claim to traffic-shift and replication metrics rather than unsupported/unspecified latency-distribution wording.
- Corrected the versioning pitfall to say versioning is required before configuring replication, not before creating the MRAP.

## Review Notes
The post is technically relevant and contains implementation details. The replication example remains a minimal one-way rule; the post correctly notes that a fully active-active setup needs bidirectional replication between bucket pairs. A future improvement would be to include the IAM trust and permissions policy for the replication role, but the current text does not provide enough surrounding setup to require that expansion during this validation pass.
