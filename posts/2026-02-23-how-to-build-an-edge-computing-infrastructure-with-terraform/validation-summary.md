# Validation Summary: How to Build an Edge Computing Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Terraform
- AWS CloudFront
- CloudFront Functions
- Lambda@Edge
- AWS Global Accelerator
- Amazon S3 origins for CloudFront
- Amazon API Gateway HTTP APIs
- Amazon DynamoDB Global Tables
- AWS Certificate Manager
- IAM roles and policies

## Sources Consulted
- AWS CloudFront documentation: Restrictions on all edge functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-function-restrictions-all.html
- AWS CloudFront documentation: Customize at the edge with Lambda@Edge - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html
- AWS CloudFront documentation: JavaScript runtime 2.0 features for CloudFront Functions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html
- AWS CloudFront documentation: CloudFront Functions event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- AWS CloudFront documentation: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS DynamoDB documentation: Global tables core concepts - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-CoreConcepts.html
- AWS Global Accelerator documentation: What is AWS Global Accelerator? - https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html
- AWS Global Accelerator documentation: Configuring and using flow logs - https://docs.aws.amazon.com/global-accelerator/latest/dg/monitoring-global-accelerator.flow-logs.html
- Terraform AWS provider documentation: aws_cloudfront_distribution - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider documentation: aws_cloudfront_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_function
- Terraform AWS provider documentation: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider documentation: aws_globalaccelerator_accelerator, listener, and endpoint_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_accelerator
- Terraform AWS provider documentation: aws_dynamodb_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table

## Issues Found
- The CloudFront distribution associated CloudFront Functions on viewer-request and viewer-response events and also associated a Lambda@Edge viewer-request function on the same default cache behavior. AWS CloudFront does not allow CloudFront Functions and Lambda@Edge to be combined for viewer events on the same cache behavior. I removed the Lambda@Edge association from the default cache behavior and added a separate `/protected/*` cache behavior that uses Lambda@Edge viewer-request authentication without CloudFront Functions.
- The security headers function comment said it added headers to all responses. CloudFront viewer-response functions are not invoked when the origin returns HTTP status code 400 or higher, so I changed the comment to say successful viewer responses.
- The protected S3 behavior forwarded `Authorization` to the S3 origin. I removed that forwarding because viewer-request Lambda@Edge can inspect the header before cache lookup, and S3 does not need viewer credentials for OAI-backed static content.
- The DynamoDB Global Tables section implied data access directly at the CloudFront edge. DynamoDB Global Tables replicate tables across AWS Regions, not CloudFront edge locations. I updated the heading, wording, code comment, and wrap-up text to describe regional replicated data access for Lambda@Edge logic.
- The DynamoDB example included `us-east-1` as a replica without specifying the table's provider region, which could imply adding the primary table region as a replica. I set the table provider to `aws.us_east_1` and left only additional replica regions in the `replica` blocks.

## Review Notes
- The CloudFront Functions examples use `cloudfront-js-2.0`, supported string methods, response header structure, and request header mutation patterns.
- The Lambda@Edge examples correctly publish Lambda versions and place functions in `us-east-1`. Node.js 20 is supported by Lambda and usable with Lambda@Edge, but teams should continue checking AWS runtime deprecation dates for production deployments.
- The CloudFront distribution uses legacy `forwarded_values` fields instead of newer cache policies and origin request policies. This remains valid Terraform syntax, but cache policies are the more modern CloudFront configuration style.
- The CloudFront certificate referenced by `aws_acm_certificate.main.arn` must be issued or imported in `us-east-1` for viewer HTTPS with CloudFront.
