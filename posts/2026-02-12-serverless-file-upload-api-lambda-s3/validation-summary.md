# Validation Summary: Build a Serverless File Upload API with Lambda and S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3
- AWS Lambda
- Amazon API Gateway
- AWS SDK for JavaScript v3
- S3 presigned URLs
- S3 CORS configuration
- S3 multipart upload
- Amazon DynamoDB
- AWS CLI

## Sources Consulted
- AWS S3 User Guide: Uploading objects with presigned URLs - https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- AWS SDK for JavaScript v3: Amazon S3 presigned URL migration notes - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html
- AWS SDK for JavaScript v3 API Reference: PutObjectCommand - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/PutObject
- AWS CLI Command Reference: put-bucket-cors - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html
- AWS S3 User Guide: Elements of a CORS configuration - https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- AWS Lambda Developer Guide: Define Lambda function handler in Node.js - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- AWS Lambda Developer Guide: Process Amazon S3 event notifications with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS SDK for JavaScript v3: DynamoDB document client - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS S3 User Guide: Multipart upload limits - https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- AWS S3 User Guide: POST Policy - https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS CLI Command Reference: put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html

## Issues Found
- The original file-size-limit section used an S3 bucket policy condition with `s3:content-length-range`. That is not a valid Amazon S3 IAM condition key for `s3:PutObject`; `content-length-range` is documented for S3 browser POST policies. I replaced the invalid bucket policy with Lambda-side validation before generating a presigned PUT URL.
- The client upload request did not send `fileSize`, so the new Lambda-side size validation would not have enough information to enforce the limit. I updated the client request body to include `fileSize: file.size`.

## Review Notes
The presigned PUT URL flow, AWS SDK for JavaScript v3 imports, S3 CORS shape, S3 event Lambda processing pattern, DynamoDB document client usage, multipart upload part-size claim, and lifecycle configuration format match the consulted AWS documentation. The multipart upload snippet only initiates an upload and signs part URLs; a production implementation still needs a completion endpoint that receives uploaded part ETags and calls `CompleteMultipartUpload`.
