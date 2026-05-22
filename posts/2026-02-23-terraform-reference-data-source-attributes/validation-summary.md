# Validation Summary: How to Reference Data Source Attributes in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform data sources
- Terraform AWS provider
- AWS EC2, VPC, IAM, ACM, S3, ECR, and CloudFront-related data sources

## Sources Consulted
- Terraform language documentation: Query data from external sources: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform language documentation: for_each reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform AWS provider documentation: aws_ami data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider documentation: aws_vpc data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- Terraform AWS provider documentation: aws_subnets data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform AWS provider documentation: aws_subnet data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- Terraform AWS provider documentation: aws_caller_identity data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- Terraform AWS provider documentation: aws_region data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- Terraform AWS provider documentation: aws_iam_policy_document data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS provider documentation: aws_availability_zones data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform AWS provider documentation: aws_acm_certificate data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- Terraform AWS provider documentation: aws_ip_ranges data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ip_ranges
- Terraform AWS provider documentation: aws_security_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS CloudFront documentation: Locations and IP address ranges of CloudFront edge servers: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html

## Issues Found
- The post referenced `data.aws_region.current.name` in multiple examples. Current Terraform AWS provider documentation uses `data.aws_region.current.region` for the selected region, with the region name also available as `id`; `name` is now documented as a deprecated input argument rather than the current output attribute. Updated the examples to use `data.aws_region.current.region`.

## Review Notes
The remaining examples use valid Terraform data-source reference syntax and match the current AWS provider documentation for the referenced data sources. Some snippets are illustrative and assume surrounding resources or provider configuration exist, such as `aws_s3_bucket.data`, `aws_vpc.main`, and `aws_security_group.app`.
