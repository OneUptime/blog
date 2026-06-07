# Validation Summary: How to Handle Large Messages with SQS Extended Client

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- Amazon S3
- AWS SQS Java Extended Client Library (`amazon-sqs-java-extended-client-lib` v2.x)
- AWS SDK for Java v2 (`software.amazon.awssdk`)
- boto3 (AWS SDK for Python)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-s3`)
- IAM policies
- AWS CloudFormation
- AWS CloudWatch metrics
- S3 bucket lifecycle and encryption

## Sources Consulted
- AWS Labs Java Extended Client repo: https://github.com/awslabs/amazon-sqs-java-extended-client-lib
- `ExtendedClientConfiguration` source for v2.0.4: https://github.com/awslabs/amazon-sqs-java-extended-client-lib/blob/2.0.4/src/main/java/com/amazon/sqs/javamessaging/ExtendedClientConfiguration.java
- Payload offloading common lib (`PayloadS3Pointer`): https://github.com/awslabs/payload-offloading-java-common-lib-for-aws/blob/master/src/main/java/software/amazon/payloadoffloading/PayloadS3Pointer.java
- AWS Labs Python Extended Client: https://github.com/awslabs/amazon-sqs-python-extended-client-lib (constants for `MESSAGE_POINTER_CLASS` / `LEGACY_MESSAGE_POINTER_CLASS`)
- AWS SDK for Java v2 `ReceiveMessageRequest.Builder` Javadoc: https://docs.aws.amazon.com/java/api/latest/software/amazon/awssdk/services/sqs/model/ReceiveMessageRequest.Builder.html
- AWS SQS documentation on message size limits (256 KB)

## Issues Found
1. **`withCleanupS3Payload(true)` does not exist on `ExtendedClientConfiguration`.** The Java v2.x Extended Client controls S3 cleanup via the third (boolean) parameter of `withPayloadSupportEnabled(S3Client, String, boolean)`. Verified against the v2.0.4 source — only `doesCleanupS3Payload()` (getter) exists, with no matching `with` setter. Fixed by switching to `withPayloadSupportEnabled(s3Client, S3_BUCKET_NAME, true)` and removing the dangling `withCleanupS3Payload` call.

2. **S3 pointer marker class string was the legacy v1.x value.** The post hard-coded `"com.amazon.sqs.javamessaging.MessageS3Pointer"` in the Python and Node.js samples and claimed cross-language compatibility with the Java client. The v2.x Java Extended Client (and the official Python `amazon-sqs-extended-client` library) write messages using `"software.amazon.payloadoffloading.PayloadS3Pointer"`. The legacy string is only read for backward compatibility. Updated both Python and Node.js samples to use the v2.x marker so they are actually wire-compatible with the Java code shown earlier in the post.

3. **`attributeNames(QueueAttributeName.APPROXIMATE_RECEIVE_COUNT)` does not compile in the v2 SDK.** `APPROXIMATE_RECEIVE_COUNT` is not a member of `QueueAttributeName` — it belongs to `MessageSystemAttributeName`. Additionally, `attributeNames` on `ReceiveMessageRequest.Builder` is deprecated in favor of `messageSystemAttributeNames`. Fixed by replacing the call with `.messageSystemAttributeNames(MessageSystemAttributeName.APPROXIMATE_RECEIVE_COUNT)`.

## Review Notes
- Version `2.0.4` of `amazon-sqs-java-extended-client-lib` is a real release (September 27, 2023). The current latest is `2.1.2` (June 2025), which adds `withIgnorePayloadNotFound` for both sync and async clients. Bumping to `2.1.2` is recommended for new code but the `2.0.4` reference in the post is accurate as-is, so it was left unchanged.
- The Java snippets in Steps 3 and the "Error Handling" section omit `import` statements for `Map`, `MessageAttributeValue`, `SqsException`, `MessageSystemAttributeName`, and `QueueAttributeName` types referenced inline. The code is API-correct after the fixes, and adding imports would be a stylistic completeness change rather than a correctness fix.
- AWS SDK v2 SQS / S3 versions referenced (`2.21.0`) are real releases. The SDK has continued past `2.21.x`, but the version pinned here still works against the Extended Client v2.x.
- The Python `amazon-sqs-extended-client` `pip install` reference is accurate (the official AWS Labs library is published under that name). The post then shows a hand-rolled wrapper rather than using the library directly; this is a stylistic choice but works.
- The Node.js sample stores raw UTF-8 strings in S3 and base64-style placeholder data inside JSON — for actual binary payloads (images) callers would still need to base64-encode before putting them through `JSON.stringify`. This is a documentation nuance, not a code defect.
- The `CompressedExtendedClient` example decodes gzip bytes as Latin-1 to round-trip through `str`. This works but is fragile; using base64 or sending the raw bytes via S3 would be more robust. Not a correctness error in the demonstrated flow.
