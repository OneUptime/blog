# Validation Summary: How to Use S3 Inventory to Audit Objects at Scale

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon S3 Inventory
- AWS CLI
- S3 bucket policies
- Amazon Athena
- AWS Lambda
- Python boto3
- Amazon SNS

## Sources Consulted
- Amazon S3 User Guide: Cataloging and analyzing your data with S3 Inventory - https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html
- Amazon S3 User Guide: Configuring Amazon S3 Inventory - https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-inventory.html
- Amazon S3 User Guide: Locating your inventory list - https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory-location.html
- Amazon S3 User Guide: Querying Amazon S3 Inventory with Amazon Athena - https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory-athena-query.html
- AWS CLI Command Reference: put-bucket-inventory-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-inventory-configuration.html
- AWS CLI Command Reference: create-bucket - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- Amazon Athena User Guide: CREATE TABLE - https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon S3 Pricing - https://aws.amazon.com/s3/pricing/

## Issues Found
- The destination bucket section did not mention that S3 Inventory destination buckets must be in the same AWS Region as the source bucket. Added that requirement.
- The inventory configuration used `Prefix: "inventory/my-source-bucket"`, but S3 appends the source bucket name and configuration ID under the destination prefix. Changed the prefix to `inventory` so the later example paths are accurate.
- The report layout showed data files under the timestamped manifest directory. S3 stores manifest files under the timestamped directory, Hive symlinks under `hive/dt=.../`, and inventory data files under `data/`. Updated the tree.
- The Athena table pointed directly at the raw `data/` folder. AWS recommends querying S3 Inventory through the Hive-compatible symlink manifest location, especially to avoid reading stale inventory files across report runs. Updated the table to use `SymlinkTextInputFormat`, the `hive/` location, and partition projection.
- The CSV Athena table declared `size` as `bigint`, while AWS's CSV example declares CSV columns as strings. Changed `size` to `string` and added explicit casts in queries that sort, filter, or aggregate by size.
- The Lambda example returned `manifest.get('fileCount', 0)`, but the documented manifest schema does not include `fileCount`, and that value would not be the number of objects scanned. Added a row counter and returned that value.
- The Lambda example reported CSV keys directly, but S3 Inventory CSV key names are URL-encoded. Added `urllib.parse.unquote` before including object keys in alerts.
- The cost comparison said a ListObjectsV2 script would pay for millions of API requests. Since ListObjectsV2 is paginated, the precise issue is many paginated requests rather than necessarily millions of requests. Tightened the wording.

## Review Notes
AWS CLI was not installed locally, so CLI validation was performed against the official AWS CLI command reference instead of local `--help` output. The Python snippet was parsed successfully with Python's `ast` module, and JSON snippets were parsed successfully with Python's `json` module. The S3 Inventory pricing statement is region/pricing-page dependent and should be rechecked before publication if exact cost numbers are important.
