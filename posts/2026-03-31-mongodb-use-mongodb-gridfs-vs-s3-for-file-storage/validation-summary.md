# Validation Summary: How to Use MongoDB GridFS vs S3 for File Storage

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- MongoDB GridFS (Node.js driver `mongodb` package)
- Amazon S3 (AWS SDK v3 `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Node.js (fs module, streams)

## Sources Consulted
- MongoDB Node.js Driver documentation for GridFSBucket API: https://www.mongodb.com/docs/drivers/node/current/fundamentals/gridfs/
- AWS SDK for JavaScript v3 - S3Client, PutObjectCommand, GetObjectCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- AWS SDK v3 S3 Request Presigner: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- AWS S3 pricing page: https://aws.amazon.com/s3/pricing/
- AWS S3 Select documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html
- AWS S3 object size limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html

## Issues Found
- **S3 Select incorrectly cited for metadata querying**: The feature comparison table listed "Tags + S3 Select (limited)" under "Query on metadata" for S3. S3 Select is a feature for querying the *content* of objects (e.g., running SQL-like queries on CSV, JSON, or Parquet data stored as S3 objects). It is not used for querying object metadata or tags. Changed to "Tags + object metadata (limited)" to accurately reflect S3's metadata capabilities (object tags limited to 10 per object, plus user-defined metadata headers).

## Review Notes
- The GridFS explanation text mentions default collection names `fs.files` and `fs.chunks`, while the code example uses `bucketName: "uploads"` which would create `uploads.files` and `uploads.chunks`. This is not incorrect since the text describes general GridFS behavior, but readers may be briefly confused by the discrepancy.
- The S3 upload function uses `fs.readFileSync()` which loads the entire file into memory. For large files, a stream-based approach would be more appropriate, but this is a style/best practice consideration rather than a correctness issue.
- S3 pricing ($0.023/GB/month) is accurate for S3 Standard in us-east-1 first 50TB tier but varies by region and storage class. The post does not claim this is universal, so this is acceptable.
- AWS has been moving toward disabling bucket ACLs by default (S3 Object Ownership defaults to "Bucket owner enforced"). The comparison table mentions "IAM policies + bucket ACLs" which is still technically valid but ACLs are increasingly deprecated in favor of bucket policies.
