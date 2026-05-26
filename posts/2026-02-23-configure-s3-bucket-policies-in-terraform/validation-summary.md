# Validation Summary: How to Configure S3 Bucket Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon S3 bucket policies
- AWS IAM policy documents and condition keys
- Amazon VPC endpoints for S3
- Amazon CloudFront Origin Access Control

## Sources Consulted
- Terraform AWS Provider documentation for `aws_s3_bucket_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- Terraform AWS Provider documentation for `aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider documentation for `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS S3 bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS S3 policy keys, including `s3:TlsVersion`, `aws:SecureTransport`, `aws:SourceIp`, and service-principal caveats: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- AWS S3 VPC endpoint policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- AWS IAM condition operator behavior: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS CloudFront Origin Access Control documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
- The SSL/TLS deny examples used network-related condition keys without excluding AWS service principals. AWS documents that network context can be redacted for service-to-service requests, so these deny statements can unintentionally block AWS services. Added an `aws:PrincipalIsAWSService = false` condition to the TLS-related deny statements.
- The IP restriction deny example used `aws:SourceIp` without excluding AWS service principals. Added the same `aws:PrincipalIsAWSService = false` guard to prevent unintended denial of AWS service-to-service access.
- The S3 VPC endpoint example created an S3 gateway endpoint but did not associate route tables, so VPC traffic would not necessarily use the endpoint. Added `route_table_ids = [aws_route_table.private.id]`.
- The VPC endpoint condition key was written as `aws:sourceVpce`; updated it to the documented `aws:SourceVpce` spelling used by AWS examples.
- The VPC endpoint explanation said the bucket could only be accessed "from within your VPC." The actual policy restricts access to requests through the specific VPC endpoint, so the sentence was clarified.

## Review Notes
The remaining Terraform examples are syntactically consistent with current Terraform AWS Provider patterns. Cross-account access through an account root principal delegates access to that account, but the target account still needs identity policies granting its users or roles the corresponding S3 actions.
