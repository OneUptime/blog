# Validation Summary: How to Archive Data to Cold Storage from MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongoexport, mongoimport, mongosh)
- AWS S3 (storage classes: GLACIER_IR, DEEP_ARCHIVE, STANDARD_IA)
- AWS CLI (s3 cp, s3api put-bucket-lifecycle-configuration, s3api restore-object)
- gzip
- zstd

## Sources Consulted
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS S3 storage classes overview: https://aws.amazon.com/s3/storage-classes/
- AWS S3 Glacier Instant Retrieval documentation: https://aws.amazon.com/s3/storage-classes/glacier/instant-retrieval/
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- MongoDB `mongoexport` documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB `mongoimport` documentation: https://www.mongodb.com/docs/database-tools/mongoimport/

## Issues Found
1. **Invalid `--skip` flag for mongoexport**: The post recommended using `--skip` to paginate large mongoexport operations, but `--skip` is not a valid mongoexport flag. Changed to recommend paginating using date ranges in `--query` instead.
2. **Incorrect GLACIER_IR retrieval time**: A comment in the restore step stated "may take 1-5 minutes for GLACIER_IR". S3 Glacier Instant Retrieval provides millisecond retrieval latency. The 1-5 minute timeframe applies to Glacier Flexible Retrieval (expedited tier). Fixed the comment to correctly state millisecond retrieval.
3. **Missing DEEP_ARCHIVE restore step**: The restore section only showed `aws s3 cp`, which works for GLACIER_IR but fails for DEEP_ARCHIVE objects. DEEP_ARCHIVE requires calling `aws s3api restore-object` first, with a standard restore time of up to 12 hours. Added the restore-object command and clarified the difference between GLACIER_IR and DEEP_ARCHIVE retrieval.

## Review Notes
- The `--type=json` flag on the mongoexport command is valid but redundant since JSON is the default output format.
- The shell script in Step 6 does not include the delete step, which is appropriate for safety (manual verification before deletion is recommended).
- The S3 lifecycle policy transitions are correctly configured with valid minimum duration requirements between storage class transitions.
