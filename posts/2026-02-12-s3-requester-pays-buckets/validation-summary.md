# Validation Summary: How to Set Up S3 Requester Pays Buckets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Requester Pays
- AWS CLI
- Boto3 / Python
- AWS SDK for JavaScript v3
- S3 bucket policies and IAM policies
- S3 server access logging

## Sources Consulted
- Amazon S3 User Guide: Using Requester Pays buckets for storage transfers and usage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html
- Amazon S3 User Guide: Configuring Requester Pays on a bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysExamples.html
- AWS CLI v2 Command Reference: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI v2 Command Reference: aws s3api get-object-torrent - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object-torrent.html
- Amazon S3 API Reference: GetObjectTorrent - https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectTorrent.html
- Boto3 S3 Client Reference: get_object and list_objects_v2 - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object.html and https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_objects_v2.html
- Amazon S3 User Guide: Enabling server access logging - https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- Amazon S3 User Guide: Server access log format - https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html
- Amazon S3 pricing - https://aws.amazon.com/s3/pricing/

## Issues Found
- The post said the bucket owner pays "storage costs only." AWS documents a few exceptions, including owner billing for certain 403/SOAP requests and restore retrieval charges, so the bullet was updated to mention AWS-documented exceptions.
- The post said each request must include the `x-amz-request-payer` header. That is accurate at the HTTP API level, but SDK and CLI examples use `RequestPayer` / `--request-payer`, so the wording was expanded to cover the equivalent parameters.
- The access logging example omitted required target-bucket prerequisites. AWS requires the destination bucket to be in the same account and Region, not have Requester Pays enabled, and permit the S3 logging service to write logs. Added that caveat and updated the practical example comment.
- The post said access logs show which accounts are accessing the data. S3 server access logs expose requester canonical IDs, IAM users, or assumed role ARNs, so that wording was corrected.
- The post said BitTorrent is not supported with Requester Pays. Current AWS S3 API and CLI documentation for `GetObjectTorrent` includes `x-amz-request-payer` / `--request-payer`, so the limitation was replaced with the current documented unsupported case: SOAP requests.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI options were verified against the official AWS CLI v2 command reference rather than local `--help` output. The pricing examples use common S3 Standard and data transfer out figures, but real charges vary by Region, destination, request volume, and current AWS pricing tiers.
