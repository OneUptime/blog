# Validation Summary: How to Use S3 with Presigned URLs in a React Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS SDK for JavaScript v3
- AWS CLI
- Express.js
- React
- JavaScript
- Browser Fetch API and XMLHttpRequest
- S3 CORS configuration

## Sources Consulted
- Amazon S3 User Guide: Download and upload objects with presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- AWS SDK for JavaScript v3: S3 presigned URL examples: https://docs.aws.amazon.com/AmazonS3/latest/API/s3_example_s3_Scenario_PresignedUrl_section.html
- AWS SDK for JavaScript v3: PutObjectCommand reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/PutObject
- AWS SDK for JavaScript v3: GetObjectCommand reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/s3-2006-03-01/GetObject
- AWS SDK for JavaScript v3: @aws-sdk/s3-presigned-post reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-presigned-post
- Amazon S3 User Guide: Elements of a CORS configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html
- AWS CLI Command Reference: s3api put-bucket-cors: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html
- React documentation: useState: https://react.dev/reference/react/useState
- MDN Web Docs: Response.ok: https://developer.mozilla.org/en-US/docs/Web/API/Response/ok

## Issues Found
- The sequence diagram implied that the backend calls S3 to generate and receive a presigned URL. AWS SDK presigning signs the S3 request with local credentials, so the diagram now shows the backend signing the S3 request itself.
- The download component used `useState` without importing it and did not export the component. Added the missing React import and default export.
- The download flow used the anchor `download` attribute for a presigned S3 URL without ensuring S3 returns a download disposition. Added `ResponseContentDisposition` to the backend `GetObjectCommand` and passed the filename from the frontend as a query parameter.
- The drag-and-drop upload example treated failed `fetch()` responses as successful because `fetch()` does not throw for HTTP error status codes. Added `res.ok` and `uploadRes.ok` checks.
- The security section said `ContentLength` on a presigned PUT URL enforces a maximum upload size. Replaced that with a presigned POST example using a `content-length-range` condition, and clarified the PUT URL caveat.

## Review Notes
The S3 CORS JSON structure and `aws s3api put-bucket-cors` command are valid. The local environment does not have the AWS CLI installed, so the command was verified against AWS CLI documentation rather than local `aws --help` output.
