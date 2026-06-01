# Validation Summary: How to Use Lambda for Image Resizing on Upload

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon S3 event notifications
- AWS CloudFormation
- IAM permissions
- AWS SDK for JavaScript v3
- Node.js
- Sharp
- Python
- Pillow

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda S3 event notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS Lambda Node.js layers and native package guidance: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- AWS CloudFormation S3 NotificationConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-notificationconfiguration.html
- AWS SDK for JavaScript v3 GetObjectCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- Sharp installation documentation: https://sharp.pixelplumbing.com/install/
- Sharp resize API documentation: https://sharp.pixelplumbing.com/api-resize/
- Pillow Image.thumbnail documentation: https://pillow.readthedocs.io/
- npm install help output for current install flags

## Issues Found
- The Sharp cross-platform install command used `--platform` and `--arch`. Current npm help and Sharp documentation recommend `--os`, `--cpu`, and `--libc` for npm v10+ cross-platform installs, so the command was changed to `npm install --os=linux --cpu=x64 --libc=glibc sharp`.
- The CloudFormation snippet used `nodejs20.x`, which AWS lists as deprecated as of April 30, 2026. The runtime was updated to `nodejs24.x`, which is currently supported.
- The CloudFormation S3 notification and Lambda permission resources could hit AWS's documented circular dependency/validation issue when the bucket notification is created before the Lambda invoke permission. Added `DependsOn: S3Permission` to the bucket and changed `SourceArn` to a literal bucket ARN via `!Sub`, with `SourceAccount`, so permission can be created first without depending on the bucket resource.
- The Python Pillow example saved every resized image as JPEG without converting non-RGB modes. Pillow raises an error for common inputs such as RGBA PNGs when saving directly as JPEG, so the snippet now converts non-RGB images to RGB before saving.

## Review Notes
The Node.js handler, AWS SDK v3 `GetObjectCommand` body handling, Sharp resize options, S3 event key decoding, IAM actions, and separate-bucket loop avoidance guidance are technically correct. The CloudFormation snippet still references a `LambdaRole` and deployment bucket/key that must exist or be defined elsewhere, which is acceptable for a focused trigger example but should be expanded if the post is later turned into a complete deployable template.
