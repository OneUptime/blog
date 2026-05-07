# Validation Summary: How to Set Default Tags on the AWS Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider
- AWS resource tagging
- HCL

## Sources Consulted
- HashiCorp Developer tutorial, "Configure default tags for AWS resources": https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources
- OpenTofu checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

## Issues Found
- The post stated that `default_tags` apply to all or every taggable resource. The official AWS provider documentation shows exceptions, including Auto Scaling group-related behavior, so I corrected the wording to say supported taggable resources managed by the provider.
- The post implied that OpenTofu `check` blocks enforce tagging compliance. Official OpenTofu documentation states that failed `check` assertions produce warnings and do not block plan or apply, so I updated the wording to describe them as verification and monitoring rather than enforcement.

## Review Notes
- The `ignore_changes = [tags["LastModifiedBy"]]` example is syntactically valid. If the same externally managed tag must be ignored across many AWS resources, the provider-level `ignore_tags` configuration may be a better fit than repeating `ignore_changes` on individual resources.
