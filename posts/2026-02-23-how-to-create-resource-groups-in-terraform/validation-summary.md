# Validation Summary: How to Create Resource Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (v1.0+)
- AWS Provider (~> 5.0)
- AWS Resource Groups
- AWS Config (REQUIRED_TAGS managed rule)
- CloudFormation (stack-based grouping)
- AWS tagging strategy / `default_tags`

## Sources Consulted
- Terraform AWS Provider — `aws_resourcegroups_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/resourcegroups_group
- Terraform AWS Provider — `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS Provider — `default_tags` in provider block: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags-configuration-block
- AWS Resource Groups developer docs: https://docs.aws.amazon.com/ARG/latest/userguide/resource-groups.html
- AWS Config managed rule REQUIRED_TAGS: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS CloudFormation resource type identifiers (e.g., `AWS::EC2::Instance`, `AWS::RDS::DBInstance`): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html

## Issues Found
No technical issues found.

The post uses the correct Terraform resource name (`aws_resourcegroups_group`), valid `resource_query` block structure with `query` (built via `jsonencode`) and `type` (defaulting to `TAG_FILTERS_1_0`, with `CLOUDFORMATION_STACK_1_0` shown for stack-based grouping). The JSON query schema (`ResourceTypeFilters`, `TagFilters` with `Key`/`Values`, and `StackIdentifier` for CloudFormation queries) matches the official AWS Resource Groups query syntax. All CloudFormation resource type identifiers used (`AWS::EC2::Instance`, `AWS::EC2::Volume`, `AWS::EC2::SecurityGroup`, `AWS::RDS::DBInstance`, `AWS::RDS::DBCluster`, `AWS::DynamoDB::Table`, `AWS::S3::Bucket`, `AWS::CloudFront::Distribution`, `AWS::Lambda::Function`, `AWS::ECS::Service`, `AWS::ElasticLoadBalancingV2::LoadBalancer`, `AWS::AllSupported`) are valid. The `aws_config_config_rule` example with the `REQUIRED_TAGS` source identifier and the `tag1Key`/`tag2Key`/`tag3Key` input parameters is correct. The `default_tags` provider block usage is also correct.

## Review Notes
- The "Tagging Strategy Best Practices" section declares a second `provider "aws"` block in isolation. In a real configuration this would conflict with the earlier provider block shown in "Provider Configuration"; readers should treat the two snippets as standalone examples rather than parts of a single combined file (or merge them when copying).
- `AWS::AllSupported` is a Resource Groups-specific wildcard (not a CloudFormation type) used to indicate any supported AWS resource type — the post uses it correctly.
- The AWS provider `~> 5.0` constraint is reasonable as of the post's publication date; readers using newer major versions (6.x) should verify there are no breaking changes to the resource group arguments.
