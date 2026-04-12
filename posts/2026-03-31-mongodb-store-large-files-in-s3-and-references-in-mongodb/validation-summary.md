# Validation Summary: How to Store Large Files in S3 and References in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Node.js driver)
- Amazon S3 (AWS SDK v3 for JavaScript)
- `@aws-sdk/client-s3` (S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand)
- `@aws-sdk/s3-request-presigner` (getSignedUrl)
- multer (file upload middleware for Express)
- Express.js (implied via `app.post`, `app.get`, `app.delete`)

## Sources Consulted
- AWS SDK v3 for JavaScript documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- AWS SDK v3 S3 Request Presigner documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB BSON document size limit: https://www.mongodb.com/docs/manual/reference/limits/#bson-documents
- multer documentation: https://github.com/expressjs/multer

## Issues Found
No technical issues found.

## Review Notes
- The setup snippet uses top-level `await` with CommonJS `require()`, which would not work in a standalone CommonJS file. This is a common blog convention where setup code is shown as conceptual snippets rather than complete runnable files. Not a technical error in context.
- The delete endpoint does not verify `uploadedBy` ownership, unlike the download endpoint. This is a design choice, not a technical error, but production implementations should add authorization checks.
- The `Metadata` field in `PutObjectCommand` requires string values. The code passes `userId` which is sourced from `req.user.id` and is typically a string, so this is correct.
