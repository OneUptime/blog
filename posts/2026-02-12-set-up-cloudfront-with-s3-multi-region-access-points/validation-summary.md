# Validation Summary: How to Set Up CloudFront with S3 Multi-Region Access Points

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudFront
- Amazon S3
- S3 Multi-Region Access Points
- S3 Cross-Region Replication
- AWS IAM
- AWS CLI
- Amazon CloudWatch

## Sources Consulted
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 Multi-Region Access Point origin - https://docs.aws.amazon.com/id_id/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3-mrap.html
- Amazon S3 User Guide: Multi-Region Access Point request routing and hostnames - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPointRequests.html
- AWS CLI Command Reference: s3control submit-multi-region-access-point-routes - https://docs.aws.amazon.com/cli/latest/reference/s3control/submit-multi-region-access-point-routes.html
- AWS CLI Command Reference: s3control put-multi-region-access-point-policy - https://docs.aws.amazon.com/cli/latest/reference/s3control/put-multi-region-access-point-policy.html
- Amazon S3 User Guide: Requirements and considerations for replication - https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html

## Issues Found
- The post described MRAP failover as fully automatic during a regional failure. Updated the wording to describe MRAP routing to the closest active bucket and the use of routing controls to shift traffic during failover scenarios.
- The replication section claimed content uploaded to any bucket would replicate to all others, but the example only configures replication from the primary bucket. Updated the wording and command comment to match the shown configuration.
- The MRAP endpoint example used the MRAP name as the hostname. Updated it to use the generated MRAP alias format required by S3 Multi-Region Access Points.
- The CloudFront OAC example used the standard S3 OAC values `sigv4` and `s3`. Updated it to use `sigv4a` and `s3mrap` for S3 Multi-Region Access Point origins.
- The post only included underlying bucket policies for CloudFront access. Added the required Multi-Region Access Point policy example.
- The routing examples used the non-current `put-multi-region-access-point-routing-configuration` command. Updated them to use `submit-multi-region-access-point-routes` with the MRAP alias ARN and a signing region.
- The CloudFront metrics example omitted the AWS Region used for CloudFront CloudWatch metrics. Added `--region us-east-1`.

## Review Notes
The AWS CLI was not installed in the local workspace, so command verification was performed against official AWS CLI and AWS service documentation rather than local `aws --help` output.
