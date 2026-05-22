# Validation Summary: How to Use the provider Meta-Argument in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HCL
- Terraform provider meta-argument
- Terraform provider aliases
- Terraform module provider mappings
- AWS provider
- AWS CloudFront
- AWS Certificate Manager
- Amazon Route 53
- Amazon DynamoDB
- Google Cloud provider

## Sources Consulted
- Terraform provider meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- AWS provider aws_dynamodb_table documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon Route 53 endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/r53.html

## Issues Found
- The DynamoDB example comment said a global table requires tables in both regions, but the snippet only created two separate regional DynamoDB tables and did not configure a global table replica. Changed the comment to describe regional DynamoDB tables using provider aliases.
- The ACM validation record comment said the Route 53 record can be in any region. Route 53 hosted-zone records are not regional in the same way as regional AWS services, so the comment now says Route 53 validation records are not regional.
- The CloudFront distribution comment said the resource uses the default provider region for the origin. CloudFront is a global service, and the provider region does not define the origin region. Changed the comment to say the global CloudFront resource uses the certificate from us-east-1.

## Review Notes
The Terraform provider alias syntax, resource and data source provider meta-argument usage, module `providers` mapping, and `configuration_aliases` examples are consistent with current Terraform documentation. The CloudFront ACM certificate guidance is correct: ACM certificates used with CloudFront must be requested or imported in `us-east-1`.
