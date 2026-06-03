# Validation Summary: How to Build a Video Streaming Platform on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS S3
- AWS Lambda
- AWS Elemental MediaConvert
- Amazon CloudFront
- Amazon DynamoDB
- Amazon EventBridge
- Amazon Data Firehose / Kinesis Firehose SDK client
- AWS SDK for JavaScript v3
- HLS and HLS.js

## Sources Consulted
- AWS SDK for JavaScript v3 S3 presigned URL examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- AWS SDK for JavaScript v3 DynamoDB document client: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS Elemental MediaConvert API reference for HLS job settings: https://docs.aws.amazon.com/mediaconvert/latest/apireference/search.html
- AWS Elemental MediaConvert output file names and paths: https://docs.aws.amazon.com/mediaconvert/latest/ug/output-file-names-and-paths.html
- AWS Elemental MediaConvert EventBridge events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-mediaconvert.html
- AWS Elemental MediaConvert pricing: https://aws.amazon.com/mediaconvert/pricing/
- AWS Elemental MediaConvert reserved queue pricing: https://docs.aws.amazon.com/mediaconvert/latest/ug/how-you-pay-for-reserved-queues.html
- AWS CLI CloudFront create-distribution reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront guidance for choosing signed URLs or signed cookies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html
- AWS SDK for JavaScript v3 CloudFront signer package: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-cloudfront-signer
- HLS.js API documentation: https://github.com/video-dev/hls.js/blob/master/docs/API.md
- MDN HTML video crossorigin documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video

## Issues Found
- The upload and analytics snippets used DynamoDB document commands without importing `DynamoDBClient`, `DynamoDBDocumentClient`, `PutCommand`, or `UpdateCommand`. Added the missing AWS SDK v3 imports and document client initialization so the snippets are syntactically complete.
- The MediaConvert HLS and thumbnail destinations ended at a directory path while later code assumed exact output names. Updated the destinations to include `index` and `thumb`, and changed the completion handler to use `playlistFilePaths` and `outputFilePaths` from the MediaConvert COMPLETE event instead of hard-coded object names.
- The CloudFront distribution command omitted required distribution config fields such as `CallerReference`, origin/cache behavior `Quantity` values, and allowed method blocks. Added the required fields and switched the S3 origin example to use Origin Access Control.
- The post recommended one CloudFront signed URL for HLS playback. CloudFront documentation recommends signed cookies when granting access to multiple restricted files such as all files for an HLS video. Replaced the playback example with signed cookies scoped to the video's HLS path.
- The HLS.js player snippet included `autoLevelEnabled` as a constructor config option, but HLS.js exposes it as a runtime property rather than a config field. Removed that option.
- After switching to signed cookies, the player needed to send credentials on playlist and segment requests. Added `crossorigin="use-credentials"` for native playback and `xhrSetup` with `withCredentials = true` for HLS.js.
- The cost optimization section gave a specific MediaConvert reserved-pricing threshold and savings percentage that AWS does not state as a general rule. Replaced it with current guidance that reserved transcode slots are for predictable, non-urgent workloads and require a 12-month commitment.

## Review Notes
- The post still uses placeholder helper functions such as `getVideo`, `getVideoByJobId`, `updateVideoStatus`, and `sendNotification`, which is acceptable for a blog-level architecture guide but would need implementation in a complete repository.
- The signed-cookie example assumes the API can set cookies for a domain that is valid for the CloudFront playback host, typically by using a shared parent domain and HTTPS.
