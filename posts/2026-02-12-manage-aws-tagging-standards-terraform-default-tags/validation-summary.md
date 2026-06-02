# Validation Summary: How to Manage AWS Tagging Standards with Terraform Default Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS tagging
- Terraform
- HashiCorp AWS Provider
- AWS Organizations tag policies
- AWS Config managed rules
- AWS Billing and Cost Management cost allocation tags

## Sources Consulted
- HashiCorp Terraform AWS Provider resource tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- HashiCorp Terraform AWS Provider documentation for `aws_ce_cost_allocation_tag`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_allocation_tag
- HashiCorp Help Center on known `default_tags` issues in AWS provider versions 3.38.0 through 4.67.0: https://support.hashicorp.com/hc/en-us/articles/4406026108435-Known-issues-with-default-tags-in-the-Terraform-AWS-Provider-3-38-0-4-67-0
- HashiCorp Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- AWS Organizations tag policies documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS Organizations tag policy enforcement documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-enforcement.html
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations services and resource types that support tag policy enforcement: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_supported-resources-enforcement.html
- AWS Config `required-tags` managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Billing documentation for user-defined cost allocation tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html

## Issues Found
- The post said every AWS resource created by the provider inherits `default_tags`. I changed this to taggable/supported resources and noted the `aws_autoscaling_group` exception, matching the Terraform AWS Provider tagging guide.
- The dynamic tag example used `formatdate("YYYY-MM-DD", timestamp())` for `LastDeployed`. Terraform documents that `timestamp()` changes every run and causes recurring diffs when used in resource attributes, so I replaced it with a stable `var.deployment_date`.
- The AWS Organizations tag policy explanation said tag policies do not prevent resource creation and show up as non-compliant in AWS Config. I changed this to explain that `enforced_for` can prevent noncompliant tagging operations for supported resource types, while tag policies do not treat missing tag keys on untagged resources as noncompliant. I also directed missing-tag detection/blocking to AWS Config or SCPs.
- The AWS Config `REQUIRED_TAGS` example included `AWS::Lambda::Function` and `AWS::ECS::Cluster`, which are not listed as supported resource types for that managed rule. I removed them and added `AWS::EC2::Volume`, which is supported.
- The `default_tags` duplicate-key gotcha was described as applying to "some versions." I clarified that the known perpetual-diff issue affected AWS provider versions 3.38.0 through 4.67.0 and that upgrading to 5.0.0 or later is another fix.
- The summary repeated the broad claim that every resource gets tagged automatically. I changed it to say supported resources get tagged automatically.

## Review Notes
Terraform is not installed in the local environment, so I could not run `terraform validate` on extracted snippets. The examples were reviewed against current official HashiCorp Terraform AWS Provider, Terraform language, AWS Organizations, AWS Config, and AWS Billing documentation.
