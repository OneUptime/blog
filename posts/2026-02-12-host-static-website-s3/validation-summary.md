# Validation Summary: How to Host a Static Website on S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 static website hosting
- AWS CLI
- S3 bucket policies and Block Public Access settings
- S3 website routing rules
- Boto3 / AWS SDK for Python
- HTTP caching headers
- Amazon CloudFront

## Sources Consulted
- Amazon S3 User Guide: Hosting a static website using Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- Amazon S3 User Guide: Tutorial: Configuring a static website on Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html
- Amazon S3 User Guide: Website endpoints - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- AWS General Reference: Amazon S3 endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/s3.html
- AWS CLI Command Reference: s3api create-bucket - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI Command Reference: s3 sync - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Amazon S3 API Reference: WebsiteConfiguration - https://docs.aws.amazon.com/AmazonS3/latest/API/API_WebsiteConfiguration.html
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Boto3 documentation: S3 client upload_file - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_file.html
- AWS S3 Pricing - https://aws.amazon.com/s3/pricing/

## Issues Found
- The introduction said users only pay for storage and bandwidth. S3 also charges for requests, so the wording was updated to include storage, requests, and bandwidth.
- The bucket naming guidance said any name works. S3 bucket names must be globally unique and DNS-compatible, so the wording was corrected.
- The introduction said S3 handles any amount of traffic. This was narrowed to automatic scaling for high request rates to avoid implying unlimited traffic.
- The deployment script said it handled cache invalidation, but it only set cache headers and did not create CloudFront invalidations. The wording was corrected.
- The deployment script unconditionally uploaded `service-worker.js`, which would fail for builds without that file. The command is now guarded with a file-existence check.
- The cost breakdown charged $4.50 for 50GB of data transfer without noting AWS's current first 100GB/month internet data transfer allowance in eligible regions. The data-transfer and total-cost lines were updated.
- The limitations section said "No custom headers," which was too broad because S3 object metadata can set standard response headers such as `Content-Type` and `Cache-Control`. The limitation was clarified to arbitrary response headers at the website endpoint.

## Review Notes
The AWS CLI examples, S3 website configuration JSON, bucket policy, routing rules, S3 website endpoint examples, HTTP-only website endpoint note, and Boto3 `upload_file` usage were consistent with current AWS documentation. The local environment did not have the AWS CLI installed, so CLI verification was done against official AWS CLI documentation instead of local `--help` output.
