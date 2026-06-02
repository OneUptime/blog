# Validation Summary: How to Implement Token-Based Access for S3 with STS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Security Token Service (STS)
- Amazon S3
- AWS IAM policies and trust policies
- Boto3 for Python
- S3 pre-signed URLs and pre-signed POST
- API Gateway and Lambda credential vending pattern

## Sources Consulted
- AWS STS AssumeRole API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS STS GetFederationToken API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetFederationToken.html
- Boto3 S3 generate_presigned_url reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/generate_presigned_url.html
- Boto3 S3 generate_presigned_post reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/generate_presigned_post.html
- IAM documentation for passing session tags in AWS STS: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- Amazon S3 IAM/service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon S3 identity-based policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html
- IAM condition operator documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html

## Issues Found
- The GetFederationToken example put `s3:GetObject` and `s3:ListBucket` in the same statement with an `s3:prefix` condition. Because `s3:prefix` is a ListBucket condition and missing condition keys do not match for normal condition operators, the object read permission would not match correctly. I split the statement into one `s3:ListBucket` statement with the prefix condition and one `s3:GetObject` statement scoped to the object prefix.
- The GetFederationToken explanation implied the inline policy alone grants access. AWS evaluates the session policy as an intersection with the IAM user's existing permissions. I clarified that the server-side broker must call it with IAM user credentials that already have the permissions being delegated.
- The session-tag AssumeRole example omitted the trust-policy requirement for `sts:TagSession`. I added a note that the role trust policy must allow both `sts:AssumeRole` and `sts:TagSession` for the Lambda execution role when passing session tags.

## Review Notes
The Boto3 pre-signed URL and pre-signed POST examples use current APIs and valid parameters. The STS duration values shown are within documented limits. The examples remain illustrative and still assume the surrounding IAM identity permissions, trust relationships, bucket CORS settings for browser uploads, and application authentication checks are configured appropriately.
