# Validation Summary: How to Configure AWS Provider with Default Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- AWS resource tags and cost allocation tags
- Terraform check blocks
- TFLint AWS ruleset
- OPA/Conftest policy validation

## Sources Consulted
- Terraform AWS Provider resource tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- Terraform AWS Provider documentation for `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS Provider `aws_default_tags` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/default_tags
- Terraform AWS Provider `aws_autoscaling_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp Help Center article on `default_tags` known issues in AWS Provider 3.38.0 through 4.67.0: https://support.hashicorp.com/hc/en-us/articles/4406026108435-Known-issues-with-default-tags-in-the-Terraform-AWS-Provider-3-38-0-4-67-0
- Terraform `check` block reference: https://developer.hashicorp.com/terraform/language/block/check
- TFLint AWS ruleset `aws_resource_missing_tags` documentation: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/rules/aws_resource_missing_tags.md
- AWS Cost Explorer filtering documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html
- AWS tagging best practices documentation: https://docs.aws.amazon.com/tag-editor/latest/userguide/best-practices-and-strats.html

## Issues Found
- The post stated that `default_tags` applies to every resource that supports tagging. The AWS provider documentation describes provider-level default tags as applying to resources that implement the standard `tags` argument, with `aws_autoscaling_group` as a documented exception. Updated the wording to avoid overgeneralizing.
- The post described perpetual diffs when resource-level tags override default tags as a current caveat. The documented perpetual-diff issues applied to AWS Provider versions 3.38.0 through 4.67.0, with fixes introduced in 5.0.0 and later. Updated the caveat to make the version scope clear.
- The tag compliance example used `provider::aws::default_tags()`, which is not a documented AWS provider function. Replaced it with the documented `aws_default_tags` data source and a valid Terraform check expression.
- The tag compliance section implied a check block could enforce tags. Terraform check blocks emit warnings and continue when assertions fail. Updated the text and comments to describe the check as non-blocking.
- The Auto Scaling Group section said default tags apply to the ASG itself but do not propagate to launched instances. The AWS provider excludes `aws_autoscaling_group` from `default_tags`, so explicit `tag` blocks are required for ASG tags and for launch propagation. Updated the explanation and comments.

## Review Notes
The example provider constraint `version = "~> 5.0"` is valid Terraform syntax and uses a provider version family where the documented `default_tags` overlap fixes are present, but the latest AWS provider documentation reviewed on 2026-05-25 is for the 6.x series. Future maintenance could update the version constraint after testing any AWS Provider 6.x upgrade impacts.
