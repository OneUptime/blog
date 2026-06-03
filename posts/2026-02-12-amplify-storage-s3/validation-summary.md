# Validation Summary: How to Use Amplify Storage with S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Gen 1 CLI
- AWS Amplify JavaScript Storage
- Amazon S3
- AWS Lambda S3 triggers
- AWS SDK for JavaScript v3
- React
- Sharp

## Sources Consulted
- AWS Amplify Gen 1 JavaScript Storage upload documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/storage/upload/
- AWS Amplify Gen 1 JavaScript Storage download documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/storage/download/
- AWS Amplify Gen 1 JavaScript Storage list documentation: https://docs.amplify.aws/gen1/react/build-a-backend/storage/list/
- AWS Amplify Gen 1 JavaScript Storage remove documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/storage/remove/
- AWS Amplify Gen 1 JavaScript Storage path documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/storage/path/
- AWS Amplify Gen 1 JavaScript Storage file access levels documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/storage/configure-access/
- AWS Amplify Gen 2 JavaScript Storage API reference: https://docs.amplify.aws/javascript/build-a-backend/storage/reference/
- AWS SDK for JavaScript v3 S3 GetObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS SDK for JavaScript v3 S3 PutObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/Class/PutObjectCommand/
- AWS Lambda S3 trigger tutorial: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html

## Issues Found
- The Amplify Storage examples used the deprecated `key` and `accessLevel` API shape. Updated upload, download, URL generation, list, remove, progress, and gallery examples to use the current `path` API documented for Amplify JS v6.2.0 and later.
- The cancellation example checked `error.name === 'CancelledError'`. Updated it to use Amplify Storage's documented `isCancelError` helper.
- The setup section did not identify that `amplify add storage` is an Amplify Gen 1 CLI workflow. Added a note that Gen 1 is in maintenance mode and that the workflow is for existing Gen 1 projects.
- The Lambda sample used `PutObjectCommand` without importing it. Added the missing AWS SDK v3 import.
- The Lambda thumbnail processor would also process generated `.webp` thumbnails and could recursively create nested thumbnails. Added a `/thumbnails/` path guard before processing.
- The S3 access explanation stated that authenticated users were restricted to their own files after the initial CLI flow. Adjusted the wording to reflect the selected access patterns and the `public/`, `protected/{identityId}/`, and `private/{identityId}/` prefixes.

## Review Notes
Amplify Gen 1 remains documented but is in maintenance mode and reaches end of life on May 1, 2027. The corrected post is technically valid for Gen 1 CLI projects using Amplify JS v6.2.0 or later; new projects should consider the Gen 2 storage workflow.
