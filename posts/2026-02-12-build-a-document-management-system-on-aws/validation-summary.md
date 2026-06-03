# Validation Summary: How to Build a Document Management System on AWS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS S3
- AWS CLI
- AWS SDK for JavaScript v3
- AWS Lambda
- Amazon DynamoDB
- Amazon Textract
- Amazon OpenSearch Service / OpenSearch JavaScript client
- Amazon SNS
- API Gateway authorization context

## Sources Consulted
- Amazon S3 event notification message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-content-structure.html
- AWS CLI `s3api create-bucket` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- Amazon Textract `StartDocumentTextDetection` API reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_StartDocumentTextDetection.html
- Amazon Textract asynchronous operations guide: https://docs.aws.amazon.com/textract/latest/dg/api-async.html
- Amazon DynamoDB constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- OpenSearch Search API reference: https://docs.opensearch.org/latest/api-reference/search-apis/search/

## Issues Found
- The upload snippet used `getSignedUrl(s3, ...)` without defining the S3 client. Added `const s3 = new S3Client({});` so the AWS SDK for JavaScript v3 example is complete enough to run in context.
- The S3 processing snippet decoded event object keys with `decodeURIComponent` only and extracted `documentId` from a fixed path segment. S3 event keys are URL encoded, spaces can appear as `+`, and the generated key can include nested folder paths. Updated the snippet to decode `+` correctly and read `document-id` from object metadata via `HeadObject`.
- The processing snippet did not use the S3 object version from the event even though the bucket has versioning enabled. Updated the snippet to capture `event.Records[0].s3.object.versionId`, use it in `HeadObject`, and pass it to Textract's S3 object `Version` field.
- The DynamoDB text storage snippet used `text.substring(0, 400000)` with a comment implying this respected the item size limit. DynamoDB's 400 KB item limit is byte based and includes attribute names and values, so JavaScript character count is not sufficient. Replaced it with a byte-aware trimming helper that leaves headroom for other attributes.
- The version tracking snippet did not leave a place to associate the application version record with the S3 version created by the upload. Added `s3Key` and a `s3VersionId` placeholder noting that it should be filled from the S3 `ObjectCreated` event's `object.versionId`.
- The access-control snippet defined allowed permission names but did not validate the requested permission. Added a validation check that returns `400` for invalid permissions.

## Review Notes
The post remains a high-level implementation guide with illustrative snippets rather than a complete deployable application. Helper functions such as `checkFolderAccess`, `getDocumentMetadata`, `getTextractResults`, and table/client initialization outside the shown snippets would still need to be implemented in a real system.
