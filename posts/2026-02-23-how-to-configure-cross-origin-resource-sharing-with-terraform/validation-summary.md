# Validation Summary: How to Configure Cross-Origin Resource Sharing with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS API Gateway HTTP APIs
- AWS API Gateway REST APIs
- Amazon S3 CORS configuration
- Amazon CloudFront distributions
- CloudFront response headers policies
- Cross-Origin Resource Sharing (CORS)

## Sources Consulted
- MDN Web Docs: Cross-Origin Resource Sharing (CORS) - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- AWS API Gateway Developer Guide: CORS for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
- Terraform AWS Provider: aws_apigatewayv2_api - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS Provider: aws_s3_bucket_cors_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration
- Terraform AWS Provider: aws_cloudfront_distribution - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS Provider: aws_cloudfront_response_headers_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy
- Terraform AWS Provider: aws_cloudfront_origin_access_control - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
- The CORS overview implied that every cross-origin request starts with a preflight OPTIONS request. Updated the wording to clarify that preflight occurs only for requests that require it.
- The API Gateway REST API section configured the OPTIONS preflight response but did not mention that actual REST API method responses must also include CORS headers. Added a note that actual methods need `Access-Control-Allow-Origin`, and that proxy integrations must return CORS headers from the backend.
- The CloudFront example created a response headers policy but did not attach it to the distribution. Added `response_headers_policy_id` to the default cache behavior.
- The CloudFront example referenced an undefined CloudFront origin access identity and used the legacy OAI pattern. Replaced it with an Origin Access Control resource and attached it to the S3 origin.

## Review Notes
- The Terraform resource names and CORS field names match the current AWS provider documentation.
- For a private S3 bucket behind CloudFront Origin Access Control, a bucket policy must also grant the CloudFront distribution access to the bucket objects. That access policy is outside the CORS-specific scope of this post.
