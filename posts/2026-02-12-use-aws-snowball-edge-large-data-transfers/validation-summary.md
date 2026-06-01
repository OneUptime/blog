# Validation Summary: How to Use AWS Snowball Edge for Large Data Transfers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Snowball Edge
- AWS Snow Family API and AWS CLI
- Amazon S3 import jobs
- Snowball Edge Client
- IAM roles and S3 permissions

## Sources Consulted
- AWS Snowball Edge availability change: https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html
- AWS Snowball Edge device hardware information: https://docs.aws.amazon.com/snowball/latest/developer-guide/device-differences.html
- AWS CLI `snowball create-job` reference: https://docs.aws.amazon.com/cli/latest/reference/snowball/create-job.html
- AWS CLI `snowball get-job-manifest` reference: https://docs.aws.amazon.com/cli/latest/reference/snowball/get-job-manifest.html
- AWS Snowball Edge S3 adapter guide: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-adapter.html
- Supported AWS CLI commands for Snowball Edge data transfer: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-adapter-cli.html
- Snowball Edge Client command guide: https://docs.aws.amazon.com/snowball/latest/developer-guide/using-client-commands.html
- Access control for Snowball Edge jobs: https://docs.aws.amazon.com/snowball/latest/developer-guide/authentication-and-access-control.html
- CreateCluster API reference: https://docs.aws.amazon.com/snowball/latest/api-reference/API_CreateCluster.html
- AWS Snowball pricing: https://aws.amazon.com/snowball/pricing/
- Snowball Edge job completion reports and logs: https://docs.aws.amazon.com/snowball/latest/developer-guide/report.html

## Issues Found
- Added a current availability note: AWS Snowball Edge is no longer available to new customers as of November 7, 2025, while existing customers can continue using it.
- Updated outdated device specifications from older 80 TB and 42 TB variants to the current Storage Optimized 210 TB and Compute Optimized specifications in AWS documentation.
- Corrected `create-job` examples to use the current Storage Optimized 210 TB device type and capacity preference (`V3_5S` and `T240`) instead of the obsolete `EDGE`/`T80` combination.
- Expanded the IAM import policy permissions to include the multipart upload and ACL permissions shown in AWS's Snowball import role example.
- Corrected network port wording to match current hardware options, including 100GbE QSFP28.
- Fixed manifest retrieval: `get-job-manifest` returns a presigned URL, so the example now queries `ManifestURI` and downloads it to `manifest.bin`.
- Clarified that data transfer jobs use the local Amazon S3 adapter endpoint and removed the unsupported `aws s3 mb` step for import-job buckets.
- Removed `snowball-auto-extract` metadata from the normal recursive copy example because AWS documents that option for transferring supported archive batches, not arbitrary recursive copies.
- Removed the invalid `snowballEdge stop-service s3` command because the S3 adapter service cannot be stopped.
- Corrected completion report guidance: job reports and success/failure logs are downloaded from the AWS Snow Family console after import, not with `get-job-manifest`.
- Replaced the invalid `create-cluster --job-type IMPORT` example. AWS Snowball Edge clusters are for local use jobs; petabyte-scale imports should use separate import jobs.
- Updated pricing language to remove outdated example fees and onsite-day assumptions, and to reflect current AWS pricing structure.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI syntax was checked against official AWS CLI reference pages rather than local `--help` output. The post is now technically accurate for existing AWS Snowball Edge customers, but the topic should be reconsidered for new-customer guidance because AWS now points new customers to DataSync, Data Transfer Terminal, AWS Partner solutions, or Outposts depending on the use case.
