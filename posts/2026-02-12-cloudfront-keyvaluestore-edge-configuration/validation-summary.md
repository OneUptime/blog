# Validation Summary: How to Set Up CloudFront KeyValueStore for Edge Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudFront
- CloudFront Functions
- CloudFront KeyValueStore
- AWS CLI
- AWS CloudFormation
- JavaScript runtime 2.0 for CloudFront Functions
- Amazon S3 import source for KeyValueStore

## Sources Consulted
- AWS CloudFront Developer Guide: Amazon CloudFront KeyValueStore: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html
- AWS CloudFront Developer Guide: Create a key value store: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-create.html
- AWS CloudFront Developer Guide: File format for key-value pairs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-create-s3-kvp.html
- AWS CloudFront Developer Guide: Work with key value data: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-kvp.html
- AWS CloudFront Developer Guide: Associate a key value store with a function: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions-associate.html
- AWS CloudFront Developer Guide: Helper methods for key value stores: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-custom-methods.html
- AWS CloudFront Developer Guide: CloudFront Functions event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- AWS CloudFront Developer Guide: JavaScript runtime 2.0 features: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
- AWS CloudFront quotas: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- AWS CloudFormation reference for AWS::CloudFront::KeyValueStore: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-keyvaluestore.html
- AWS CloudFormation reference for AWS::CloudFront::Function: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudfront-function.html
- AWS CloudFormation reference for AWS::CloudFront::Function KeyValueStoreAssociation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-function-keyvaluestoreassociation.html
- AWS CLI reference for cloudfront-keyvaluestore put-key: https://docs.aws.amazon.com/cli/latest/reference/cloudfront-keyvaluestore/put-key.html

## Issues Found
- The store creation command used `aws cloudfront-keyvaluestore create-key-value-store`, but store resources are created with the `cloudfront` service command. Changed it to `aws cloudfront create-key-value-store`.
- The first `put-key` example reused the creation response ETag. AWS documents that KVS write operations should use the ETag returned by the CloudFront KeyValueStore `describe-key-value-store` operation, and CloudFront and CloudFront KeyValueStore ETags are not interchangeable. Added a `describe-key-value-store` call before the first write.
- The S3 bulk import example used `cloudfront-keyvaluestore update-keys` and described it as an S3 import. `update-keys` can update multiple pairs directly, but S3 import is supported when creating the key value store. Replaced the example with the documented S3 JSON file format and `aws cloudfront create-key-value-store --import-source`.
- The sample KVS ARN used a non-UUID placeholder ID. CloudFront function KVS associations require the key-value-store ID portion of the ARN to match the UUID-shaped pattern documented by AWS. Replaced it with a valid UUID-shaped placeholder.
- The CloudFormation distribution used `!GetAtt MaintenanceFunction.FunctionARN`. The documented CloudFormation attribute path for the function ARN is `FunctionMetadata.FunctionARN`. Updated the template to use `!GetAtt MaintenanceFunction.FunctionMetadata.FunctionARN`.

## Review Notes
The JavaScript examples use the documented `import cf from 'cloudfront'`, `cf.kvs()`, async/await, `get()` behavior, lowercase response headers, and CloudFront Functions response body shape for JavaScript runtime 2.0. The quota values in the post match current AWS CloudFront KeyValueStore quotas.
